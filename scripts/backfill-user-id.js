/**
 * backfill-user-id.js
 *
 * Script migrasi sekali jalan untuk mengisi field `user_id` yang kosong
 * pada dokumen-dokumen lama di collection VisitActivity.
 *
 * Logika:
 *   1. Ambil semua user dari collection `users` → buat map: fullName → userId
 *   2. Cari semua dokumen VisitActivity yang user_id-nya kosong/null/undefined
 *   3. Cocokkan field `nama_sales` dengan `fullName` user
 *   4. Update dokumen dengan user_id yang sesuai
 *
 * Penggunaan:
 *   # Dry-run (preview perubahan, TIDAK menulis ke database):
 *   node scripts/backfill-user-id.js
 *
 *   # Eksekusi nyata (menulis ke database):
 *   node scripts/backfill-user-id.js --execute
 *
 * Prasyarat:
 *   - Environment variable MONGODB_URI harus tersedia
 *   - Jalankan dari root project: node scripts/backfill-user-id.js
 *
 * Catatan:
 *   - Script ini CASE-INSENSITIVE saat mencocokkan nama
 *   - Jika ada nama duplikat di collection users, script akan melewati
 *     dan mencatat warning (butuh penanganan manual)
 */

const { MongoClient } = require("mongodb");

// ========================================================
// Baca env vars — support dotenv jika ada
// ========================================================
try {
  require("dotenv").config({ path: ".env.local" });
} catch {
  // dotenv tidak terinstall, lanjut pakai process.env
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ Missing MONGODB_URI. Set it in .env.local or environment.");
  process.exit(1);
}

const DB_NAME = process.env.MONGODB_DB || "MabelHub";
const IS_EXECUTE = process.argv.includes("--execute");

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log(`🔗 Connected to MongoDB (database: ${DB_NAME})`);
    console.log(`📋 Mode: ${IS_EXECUTE ? "🚀 EXECUTE (akan menulis ke DB)" : "👀 DRY-RUN (preview saja)"}\n`);

    const db = client.db(DB_NAME);

    // ========================================================
    // STEP 1: Buat lookup map fullName → userId dari collection users
    // =======================================================
    console.log("━".repeat(60));
    console.log("STEP 1: Membangun lookup map dari collection 'users'...");
    console.log("━".repeat(60));

    const allUsers = await db
      .collection("users")
      .find({}, { projection: { _id: 1, fullName: 1, username: 1, role: 1 } })
      .toArray();

    console.log(`  Total users ditemukan: ${allUsers.length}`);

    // Map: lowercased fullName → { userId, fullName (original case), role }
    // Deteksi duplikat nama
    const nameToUser = new Map();
    const duplicateNames = new Set();

    for (const user of allUsers) {
      const fullName = (user.fullName || "").trim();
      if (!fullName) {
        console.log(`  ⚠️  User ${user._id} (${user.username || "?"}) tidak punya fullName, skip`);
        continue;
      }

      const key = fullName.toLowerCase();
      if (nameToUser.has(key)) {
        duplicateNames.add(key);
        console.log(`  ⚠️  Nama duplikat terdeteksi: "${fullName}" (user: ${user._id} vs ${nameToUser.get(key).userId})`);
      } else {
        nameToUser.set(key, {
          userId: String(user._id),
          fullName: fullName,
          role: user.role || "",
          username: user.username || "",
        });
      }
    }

    console.log(`  Unique names di lookup: ${nameToUser.size}`);
    if (duplicateNames.size > 0) {
      console.log(`  ⚠️  ${duplicateNames.size} nama duplikat (akan di-skip, butuh penanganan manual)`);
    }
    console.log();

    // ========================================================
    // STEP 2: Cari dokumen VisitActivity tanpa user_id
    // ========================================================
    console.log("━".repeat(60));
    console.log("STEP 2: Mencari dokumen VisitActivity tanpa user_id...");
    console.log("━".repeat(60));

    const visitCol = db.collection("VisitActivity");

    // Cari dokumen yang user_id-nya kosong, null, undefined, atau ""
    const legacyDocs = await visitCol
      .find({
        $or: [
          { user_id: { $exists: false } },
          { user_id: null },
          { user_id: "" },
        ],
      })
      .project({ _id: 1, nama_sales: 1, user_id: 1, visit_date: 1, satuan_kerja: 1 })
      .toArray();

    console.log(`  Total dokumen legacy (tanpa user_id): ${legacyDocs.length}\n`);

    if (legacyDocs.length === 0) {
      console.log("✅ Tidak ada dokumen yang perlu di-backfill. Semua sudah memiliki user_id!");
      return;
    }

    // ========================================================
    // STEP 3: Proses pencocokan & update
    // ========================================================
    console.log("━".repeat(60));
    console.log("STEP 3: Mencocokkan nama_sales → user_id...");
    console.log("━".repeat(60));

    let matchedCount = 0;
    let unmatchedCount = 0;
    let skippedDuplicateCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    const unmatchedNames = new Map(); // nama → count
    const matchedSummary = new Map(); // userId → { fullName, count }

    for (const doc of legacyDocs) {
      const namaSales = (doc.nama_sales || "").trim();
      const docId = String(doc._id);

      if (!namaSales) {
        unmatchedCount++;
        const key = "(kosong/null)";
        unmatchedNames.set(key, (unmatchedNames.get(key) || 0) + 1);
        continue;
      }

      const key = namaSales.toLowerCase();

      // Cek duplikat
      if (duplicateNames.has(key)) {
        skippedDuplicateCount++;
        console.log(`  ⏭️  Skip (nama duplikat): doc ${docId} → "${namaSales}"`);
        continue;
      }

      const matchedUser = nameToUser.get(key);
      if (!matchedUser) {
        unmatchedCount++;
        unmatchedNames.set(namaSales, (unmatchedNames.get(namaSales) || 0) + 1);
        continue;
      }

      // Matched!
      matchedCount++;
      const prevCount = matchedSummary.get(matchedUser.userId)?.count || 0;
      matchedSummary.set(matchedUser.userId, {
        fullName: matchedUser.fullName,
        count: prevCount + 1,
      });

      if (IS_EXECUTE) {
        try {
          await visitCol.updateOne(
            { _id: doc._id },
            { $set: { user_id: matchedUser.userId } }
          );
          updatedCount++;
        } catch (err) {
          errorCount++;
          console.error(`  ❌ Error update doc ${docId}: ${err.message}`);
        }
      }
    }

    // ========================================================
    // STEP 4: Laporan hasil
    // ========================================================
    console.log();
    console.log("━".repeat(60));
    console.log("HASIL MIGRASI");
    console.log("━".repeat(60));
    console.log(`  Total dokumen legacy      : ${legacyDocs.length}`);
    console.log(`  ✅ Berhasil dicocokkan     : ${matchedCount}`);
    console.log(`  ❌ Tidak cocok (unmatched) : ${unmatchedCount}`);
    console.log(`  ⏭️  Skip (nama duplikat)   : ${skippedDuplicateCount}`);

    if (IS_EXECUTE) {
      console.log(`  📝 Berhasil di-update      : ${updatedCount}`);
      if (errorCount > 0) {
        console.log(`  ⚠️  Error saat update      : ${errorCount}`);
      }
    }

    // Detail matched
    if (matchedSummary.size > 0) {
      console.log();
      console.log("  📊 Detail Matched (per user):");
      for (const [userId, info] of matchedSummary) {
        console.log(`     → ${info.fullName} (${userId}): ${info.count} dokumen`);
      }
    }

    // Detail unmatched
    if (unmatchedNames.size > 0) {
      console.log();
      console.log("  📊 Detail Unmatched (per nama_sales):");
      for (const [name, count] of unmatchedNames) {
        console.log(`     → "${name}": ${count} dokumen`);
      }
    }

    console.log();
    if (!IS_EXECUTE && matchedCount > 0) {
      console.log("━".repeat(60));
      console.log("⚡ Ini adalah DRY-RUN. Untuk mengeksekusi perubahan, jalankan:");
      console.log("   node scripts/backfill-user-id.js --execute");
      console.log("━".repeat(60));
    } else if (IS_EXECUTE) {
      console.log("✅ Migrasi selesai!");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("\n🔒 Koneksi MongoDB ditutup.");
  }
}

run();

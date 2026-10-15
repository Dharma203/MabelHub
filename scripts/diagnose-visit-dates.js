/**
 * diagnose-visit-dates.js
 * 
 * Script diagnostik untuk memeriksa format visit_date di collection VisitActivity.
 * Mencari format yang tidak sesuai dengan format standar "%d-%b-%Y" (contoh: "3-Dec-2025").
 */

const { MongoClient } = require("mongodb");

try {
  require("dotenv").config({ path: ".env.local" });
} catch {}

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

const DB_NAME = process.env.MONGODB_DB || "MabelHub";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log(`Connected to MongoDB (database: ${DB_NAME})\n`);

    const db = client.db(DB_NAME);
    const col = db.collection("VisitActivity");

    // Total count
    const totalCount = await col.countDocuments();
    console.log(`Total documents in VisitActivity: ${totalCount}\n`);

    // Sample all distinct visit_date format
    console.log("=== ALL DISTINCT visit_date VALUES (sample up to 200) ===");
    const distinctDates = await col.aggregate([
      { $group: { _id: "$visit_date", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 200 },
    ]).toArray();

    // Standard format: "3-Dec-2025" → /^\d{1,2}-[A-Za-z]{3}-\d{4}$/
    const standardFormat = /^\d{1,2}-[A-Za-z]{3}-\d{4}$/;
    
    let standardCount = 0;
    let nonStandardCount = 0;
    const nonStandardFormats = [];

    for (const d of distinctDates) {
      const val = d._id;
      if (val && standardFormat.test(val)) {
        standardCount += d.count;
      } else {
        nonStandardCount += d.count;
        nonStandardFormats.push({ value: val, count: d.count });
      }
    }

    console.log(`\nStandard format (d-Mon-YYYY) docs: ${standardCount}`);
    console.log(`Non-standard format docs: ${nonStandardCount}\n`);

    if (nonStandardFormats.length > 0) {
      console.log("=== NON-STANDARD visit_date VALUES ===");
      for (const f of nonStandardFormats) {
        console.log(`  "${f.value}" → ${f.count} documents`);
      }
    }

    // Check created_at formats too
    console.log("\n=== SAMPLE created_at VALUES ===");
    const sampleCreatedAt = await col.aggregate([
      { $group: { _id: "$created_at" } },
      { $limit: 20 },
    ]).toArray();
    for (const d of sampleCreatedAt) {
      console.log(`  "${d._id}"`);
    }

    // Check if there are documents without user_id
    const noUserId = await col.countDocuments({
      $or: [
        { user_id: { $exists: false } },
        { user_id: null },
        { user_id: "" },
      ],
    });
    console.log(`\nDocuments without user_id: ${noUserId}`);
    
    // Check a sample of documents with non-standard dates
    if (nonStandardFormats.length > 0) {
      console.log("\n=== SAMPLE DOCS WITH NON-STANDARD DATES ===");
      const sampleNonStandard = nonStandardFormats.slice(0, 3).map(f => f.value);
      for (const dateVal of sampleNonStandard) {
        const sample = await col.findOne({ visit_date: dateVal });
        if (sample) {
          console.log(`\nSample doc with visit_date="${dateVal}":`);
          console.log(JSON.stringify({
            _id: String(sample._id),
            visit_date: sample.visit_date,
            created_at: sample.created_at,
            nama_sales: sample.nama_sales,
            city: sample.city,
            satuan_kerja: sample.satuan_kerja,
            user_id: sample.user_id,
          }, null, 2));
        }
      }
    }

    // Test the $dateFromString parsing that the API uses
    console.log("\n=== TESTING $dateFromString PARSING ===");
    const parseTest = await col.aggregate([
      { $limit: 1000 },
      {
        $addFields: {
          __parsedDate: {
            $dateFromString: {
              dateString: "$visit_date",
              format: "%d-%b-%Y",
              onError: "PARSE_ERROR",
              onNull: "NULL_DATE",
            },
          },
        },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$__parsedDate", "PARSE_ERROR"] },
              "PARSE_ERROR",
              {
                $cond: [
                  { $eq: ["$__parsedDate", "NULL_DATE"] },
                  "NULL_DATE",
                  "OK",
                ],
              },
            ],
          },
          count: { $sum: 1 },
          sampleDates: { $push: { $ifNull: ["$visit_date", "(null)"] } },
        },
      },
    ]).toArray();

    for (const r of parseTest) {
      console.log(`  ${r._id}: ${r.count} documents`);
      if (r._id !== "OK") {
        // Show unique sample dates
        const unique = [...new Set(r.sampleDates)].slice(0, 10);
        console.log(`    Sample dates: ${JSON.stringify(unique)}`);
      }
    }

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("\nConnection closed.");
  }
}

run();

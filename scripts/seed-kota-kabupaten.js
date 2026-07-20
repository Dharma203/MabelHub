const mongoose = require("mongoose");
const fs = require("fs");

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "MabelHub";

if (!MONGODB_URI) {
  console.error(
    "Please define the MONGODB_URI environment variable inside .env.local",
  );
  process.exit(1);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  return res.json();
}

async function main() {
  try {
    console.log("Connecting to MongoDB...");
    const conn = await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });
    console.log("Connected to MongoDB");

    const db = conn.connection.db;
    const parametersCollection = db.collection("Parameters");

    console.log("Fetching provinces...");
    const provinces = await fetchJson(
      "https://emsifa.github.io/api-wilayah-indonesia/api/provinces.json",
    );
    console.log(`Found ${provinces.length} provinces.`);

    let allRegencies = [];

    for (const prov of provinces) {
      console.log(`Fetching regencies for ${prov.name}...`);
      const regencies = await fetchJson(
        `https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${prov.id}.json`,
      );
      // We only want the name, e.g., "KABUPATEN BOGOR", "KOTA BANDUNG
      allRegencies.push(...regencies.map((r) => r.name.toUpperCase()));
    }

    console.log(`Found a total of ${allRegencies.length} cities/regencies.`);

    // Sort alphabetically for aesthetics
    allRegencies.sort();

    // The key is 'kota_kabupaten'
    // Let's get the document if it exists:
    const doc = (await parametersCollection.findOne({ _id: "global" })) || {
      _id: "global",
    };

    console.log(
      "Updating parameters collection under 'kota_kabupaten' array...",
    );

    // Menghapus data sampah yang salah terbuat di query sebelumnya
    await parametersCollection.deleteOne({ isDefault: true });

    const result = await parametersCollection.updateOne(
      { _id: "global" },
      { $set: { kota_kabupaten: allRegencies } },
      { upsert: true },
    );

    console.log("Migration finished!", result);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

main();

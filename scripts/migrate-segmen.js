const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing MONGODB_URI in .env.local");
  process.exit(1);
}

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db("MabelHub");

    // 1. Update Parameters Collection
    console.log("Updating Parameters collection...");
    const paramCol = db.collection("Parameters");
    const paramDoc = await paramCol.findOne({ _id: "global" });

    if (paramDoc && paramDoc.segmen) {
      const oldSegmen = paramDoc.segmen;
      const newSegmen = [];
      let updated = false;

      for (const s of oldSegmen) {
        if (!s.includes("::")) {
          // Defaulting old segmen to RING 1 if they don't have a parents
          // Modify this mapping based on actual business logic if needed
          newSegmen.push(`RING 1::${s}`);
          updated = true;
          console.log(`Migrating Parameter Segmen: '${s}' -> 'RING 1::${s}'`);
        } else {
          newSegmen.push(s);
        }
      }

      if (updated) {
        await paramCol.updateOne(
          { _id: "global" },
          { $set: { segmen: newSegmen } },
        );
        console.log("✅ Parameters collection updated successfully!\n");
      } else {
        console.log("No old segmen format found in Parameters.\n");
      }
    }

    // 2. Update E-Procurement Requests
    console.log("Updating E-Procurement Requests collection...");
    const eprocCol = db.collection("eproc_requests");
    const cursor = eprocCol.find({ segmen: { $exists: true, $ne: null } });

    let eprocUpdatedCount = 0;
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (
        doc.segmen &&
        !doc.segmen.includes("::") &&
        doc.segmen !== "ALL" &&
        doc.segmen !== ""
      ) {
        const newSegmen = `RING 1::${doc.segmen}`;
        await eprocCol.updateOne(
          { _id: doc._id },
          { $set: { segmen: newSegmen } },
        );
        eprocUpdatedCount++;
      }
    }
    console.log(
      `✅ E-Procurement Requests collection updated. Modified ${eprocUpdatedCount} documents.\n`,
    );

    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.close();
  }
}

run();

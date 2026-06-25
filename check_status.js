const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("No MONGODB_URI found in .env.local");
    process.exit(1);
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('MabelHub');
    const items = await db.collection('tracking_broadcast').distinct('status_wa');
    console.log("Distinct status_wa:", items);
  } finally {
    await client.close();
  }
}
run().catch(console.error);

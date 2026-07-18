const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  console.log('Connecting to', uri);
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('MabelHub');
    const col = db.collection('VisitActivity');
    
    // Check some raw documents
    const docs = await col.find({}).limit(5).toArray();
    
    // Save to file for the agent to read
    const fs = require('fs');
    fs.writeFileSync('C:\\Users\\ramad\\data_coding\\MabelHub\\test-output.json', JSON.stringify(docs, null, 2));
    console.log('Data saved to test-output.json');
  } catch (err) {
    const fs = require('fs');
    fs.writeFileSync('C:\\Users\\ramad\\data_coding\\MabelHub\\test-output.json', JSON.stringify({ error: err.message }));
  } finally {
    await client.close();
  }
}

main();

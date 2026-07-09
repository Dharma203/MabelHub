const fs = require('fs');
const https = require('https');
console.log("Starting download...");
https.get('https://raw.githubusercontent.com/superpikar/indonesia-geojson/master/indonesia.geojson', (res) => {
  const file = fs.createWriteStream('public/indonesia.geojson');
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log("Download complete!");
  });
});

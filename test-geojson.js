const fs = require('fs');
const https = require('https');

const url = 'https://raw.githubusercontent.com/eppofahmi/geojson-indonesia/master/kabkota.geojson';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const output = `Success! Features: ${parsed.features.length}\nSample props: ${JSON.stringify(parsed.features[0].properties)}`;
      fs.writeFileSync('output.txt', output);
    } catch (e) {
      fs.writeFileSync('output.txt', 'Parse error: ' + e.message);
    }
  });
}).on('error', err => {
  fs.writeFileSync('output.txt', 'Fetch error: ' + err.message);
});

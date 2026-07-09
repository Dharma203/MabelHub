const fs = require('fs');
const https = require('https');

https.get('https://api.github.com/repos/bachtiarpanjaitan/geojson-id/git/trees/master?recursive=1', {headers: {'User-Agent': 'node'}}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const paths = parsed.tree.map(t => t.path).filter(p => p.includes('.json') && !p.includes('adm3') && !p.includes('adm4'));
      fs.writeFileSync('paths.txt', paths.join('\n'));
      console.log('Saved paths to paths.txt');
    } catch (e) {
      console.log('Error parsing tree', e);
    }
  });
});

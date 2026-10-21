// Live HTTP status check for a list of paths on the GitHub Pages site.
// Usage: node gen/livecheck.js path1 path2 ...
const https = require('https');

const BASE = 'https://thecomeuphq.github.io/comeup-links/';

function head(path) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE);
    const req = https.request(url, { method: 'GET', timeout: 20000 }, (res) => {
      res.resume();
      res.on('end', () => resolve({ path, status: res.statusCode }));
    });
    req.on('error', (e) => resolve({ path, status: 'ERR ' + e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ path, status: 'TIMEOUT' }); });
    req.end();
  });
}

(async () => {
  const paths = process.argv.slice(2);
  for (const p of paths) {
    const r = await head(p);
    console.log(String(r.status).padStart(6) + '  ' + p);
  }
})();

// Live-check every og:image the shipped pages point at.
//
// Why this exists: og/ and assets/ are NOT tracked by git (verified: 0 files
// matching ^og/ or ^assets/ in HEAD). So every og:image tag on the live site
// points at a file that was never published -> every social preview renders
// as a broken card. This script proves it, page by page, against the LIVE
// site, not the local filesystem.
//
// Usage: node dev/og-live-check.js [--pages 12] [--full]
//   --pages N  check only N pages (default: fast sample)
//   --full      check every page (slow, ~100 HTTP requests)
//
// Exit code 1 if any og:image is dead. Add to the pre-push checklist.

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://thecomeuphq.github.io/comeup-links';
const FULL = process.argv.includes('--full');
const pageLimitArg = process.argv.indexOf('--pages');
const PAGE_LIMIT = pageLimitArg > -1 ? parseInt(process.argv[pageLimitArg + 1], 10) : 12;

function walk(dir, acc) {
  acc = acc || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.output', 'dev', 'gen', 'audit'].includes(e.name)) continue;
    if (e.name.startsWith('_')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

function head(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'GET', timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let bytes = 0;
      res.on('data', (c) => { bytes += c.length; });
      res.on('end', () => resolve({ status: res.statusCode, bytes }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
    req.end();
  });
}

(async () => {
  const files = walk(ROOT).sort();
  const pages = [];
  for (const f of files) {
    const html = fs.readFileSync(f, 'utf8');
    const m = html.match(/property="og:image"\s+content="([^"]+)"/);
    const rel = path.relative(ROOT, f).replace(/\\/g, '/');
    pages.push({ rel, og: m ? m[1] : null });
  }

  const targets = FULL ? pages : pages.filter((_, i) => i % Math.ceil(pages.length / PAGE_LIMIT) === 0).slice(0, PAGE_LIMIT);

  let ok = 0, dead = 0, missing = 0;
  const deadList = [];
  const missingList = [];

  for (const p of targets) {
    if (!p.og) { missing++; missingList.push(p.rel); continue; }
    const url = p.og.startsWith('http') ? p.og : SITE + '/' + p.og.replace(/^\//, '');
    const r = await head(url);
    if (r.status === 200) { ok++; console.log(`  OK    ${p.rel}  ->  ${url}`); }
    else { dead++; deadList.push(`${p.rel} -> ${url} (${r.status || r.error})`); console.log(`  DEAD  ${p.rel}  ->  ${url}  (${r.status || r.error})`); }
  }

  console.log('');
  console.log(`PAGES CHECKED : ${targets.length}`);
  console.log(`og:image OK   : ${ok}`);
  console.log(`og:image DEAD : ${dead}`);
  console.log(`og:image MISS : ${missing}`);
  if (deadList.length) { console.log('\nDEAD:'); deadList.forEach((d) => console.log('  ' + d)); }
  if (missingList.length) { console.log('\nMISSING TAG:'); missingList.forEach((d) => console.log('  ' + d)); }
  console.log('');
  console.log(dead > 0 ? 'FAIL: social previews are broken.' : 'PASS: every checked og:image resolves.');
  process.exit(dead > 0 ? 1 : 0);
})();

// Regenerate sitemap.xml from the pages that actually exist.
//
//   node dev/sitemap-gen.js            write sitemap.xml
//   node dev/sitemap-gen.js --dry      print the diff only
//
// Why this exists: sitemap.xml was hand-edited, and it silently drifted —
// three real pages (join.html, missions.html, hourly-pay/18-an-hour/) were
// never listed, so Google had no sitemap path to them. Generating it from
// the filesystem makes that class of bug impossible.
//
// Rules:
//   - Every shipped page gets a <loc>.
//   - index.html is listed as the bare site root.
//   - a/b/index.html is listed as a/b/ (the directory URL).
//   - Pages starting with _ are scratch and are never listed.
//   - Output is sorted, so re-running produces an identical file (no diff noise).
//   - lastmod is omitted: GitHub Pages does not serve reliable per-file
//     timestamps, and a wrong lastmod is worse than none.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://thecomeuphq.github.io/comeup-links';
const DRY = process.argv.includes('--dry');

function walk(dir, acc) {
  acc = acc || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.output', 'dev', 'gen', 'audit', 'og', 'assets'].includes(e.name)) continue;
    if (e.name.startsWith('_')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(path.relative(ROOT, p).replace(/\\/g, '/'));
  }
  return acc;
}

// file path -> site URL
const toUrl = (f) => {
  if (f === 'index.html') return SITE + '/';
  if (f.endsWith('/index.html')) return SITE + '/' + f.replace(/index\.html$/, '');
  return SITE + '/' + f;
};

const files = walk(ROOT).sort();
const urls = files.map(toUrl).sort();

const xml =
  '<?xml version="1.0" encoding="utf-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  urls.map((u) => `  <url>\n    <loc>${u}</loc>\n  </url>`).join('\n') +
  '\n</urlset>\n';

const outPath = path.join(ROOT, 'sitemap.xml');
const prev = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : '';

if (prev === xml) {
  console.log(`sitemap.xml already correct — ${urls.length} urls, no change.`);
  process.exit(0);
}

const prevUrls = new Set([...prev.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]));
const nextUrls = new Set(urls);
const added = urls.filter((u) => !prevUrls.has(u));
const removed = [...prevUrls].filter((u) => !nextUrls.has(u));

console.log(`sitemap.xml: ${prevUrls.size} -> ${urls.length} urls`);
if (added.length) {
  console.log('  ADDED:');
  added.forEach((u) => console.log('    + ' + u));
}
if (removed.length) {
  console.log('  REMOVED:');
  removed.forEach((u) => console.log('    - ' + u));
}

if (DRY) {
  console.log('\n(dry run — nothing written)');
  process.exit(0);
}

fs.writeFileSync(outPath, xml, 'utf8');
console.log('\nwritten: sitemap.xml');

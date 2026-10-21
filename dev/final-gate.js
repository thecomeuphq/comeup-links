// Final gate: sitemap vs real pages, og manifest vs real PNGs, and the
// meta tags that matter for social sharing.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://thecomeuphq.github.io/comeup-links/';

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
const pages = walk(ROOT).sort();

// ---- sitemap ----
const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const smUrls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(BASE, ''));
const smSet = new Set(smUrls);

const missing = pages.filter((p) => !smSet.has(p));
const extra = smUrls.filter((u) => !pages.includes(u));

console.log('=== SITEMAP ===');
console.log('  html pages on disk : ' + pages.length);
console.log('  urls in sitemap    : ' + smUrls.length);
console.log('  MISSING from sitemap: ' + (missing.length ? missing.join(', ') : 'none'));
console.log('  EXTRA in sitemap    : ' + (extra.length ? extra.join(', ') : 'none'));
for (const p of ['hourly-pay/18-an-hour/index.html', 'join.html', 'missions.html']) {
  console.log('    ' + (smSet.has(p) ? 'IN  ' : 'OUT ') + p);
}

// ---- og ----
const ogDir = path.join(ROOT, 'og');
const pngs = fs.readdirSync(ogDir).filter((f) => f.endsWith('.png'));
const manifestPath = path.join(ogDir, 'manifest.json');
let manifest = {};
if (fs.existsSync(manifestPath)) manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const mKeys = Object.keys(manifest);
console.log('\n=== OG CARDS ===');
console.log('  png files on disk : ' + pngs.length);
console.log('  manifest entries  : ' + mKeys.length);
const missingPng = mKeys.filter((k) => !pngs.includes(path.basename(k) + '.png') && !pngs.includes(k));
console.log('  manifest w/o png  : ' + (missingPng.length ? missingPng.join(', ') : 'none'));

// ---- per page meta ----
let bad = [];
let h1less = [];
for (const p of pages) {
  const h = fs.readFileSync(path.join(ROOT, p), 'utf8');
  const clean = h.replace(/<script[\s\S]*?<\/script>/gi, '');
  const ogImg = (h.match(/<meta property="og:image"\s+content="([^"]+)"/) || [])[1] || '';
  const twImg = (h.match(/<meta name="twitter:image"\s+content="([^"]+)"/) || [])[1] || '';
  const hasH1 = /<h1\b/i.test(clean);
  if (!hasH1) h1less.push(p);
  if (!ogImg || !ogImg.includes('/og/')) bad.push(p + ' :: og:image=' + (ogImg || 'MISSING'));
  if (!twImg || !twImg.includes('/og/')) bad.push(p + ' :: twitter:image=' + (twImg || 'MISSING'));
  // the og png must actually exist
  if (ogImg) {
    const rel = ogImg.replace(BASE, '');
    if (rel && !fs.existsSync(path.join(ROOT, rel))) bad.push(p + ' :: og png file missing -> ' + rel);
  }
}
console.log('\n=== PER-PAGE META ===');
console.log('  pages with no <h1>       : ' + (h1less.length ? h1less.join(', ') : 'none'));
console.log('  meta problems            : ' + bad.length);
bad.slice(0, 20).forEach((b) => console.log('    ' + b));

// ---- share control ----
const noShare = [];
for (const p of pages) {
  const h = fs.readFileSync(path.join(ROOT, p), 'utf8');
  if (!/class=["'][^"']*tcu-share-b/i.test(h)) noShare.push(p);
}
console.log('\n=== SHARE CONTROL ===');
console.log('  pages without share button: ' + noShare.length + (noShare.length ? ' -> ' + noShare.join(', ') : ''));

// ---- canonical / title / desc ----
const noTitle = [], noDesc = [], noCanon = [];
for (const p of pages) {
  const h = fs.readFileSync(path.join(ROOT, p), 'utf8');
  if (!/<title>[^<]{10,}<\/title>/i.test(h)) noTitle.push(p);
  if (!/<meta name="description" content="[^"]{30,}"/i.test(h)) noDesc.push(p);
  if (!/<link rel="canonical" href="https:\/\/thecomeuphq.github.io\/comeup-links\//i.test(h)) noCanon.push(p);
}
console.log('\n=== SEO BASICS ===');
console.log('  missing title      : ' + noTitle.length + (noTitle.length ? ' -> ' + noTitle.join(', ') : ''));
console.log('  missing description: ' + noDesc.length + (noDesc.length ? ' -> ' + noDesc.join(', ') : ''));
console.log('  missing canonical  : ' + noCanon.length + (noCanon.length ? ' -> ' + noCanon.join(', ') : ''));

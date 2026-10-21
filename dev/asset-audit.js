// Inventory check: sitemap vs local pages, and every local asset reference.
//
// Usage: node dev/asset-audit.js

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://thecomeuphq.github.io/comeup-links/';

function walk(dir, acc, opts) {
  acc = acc || [];
  opts = opts || {};
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.output'].includes(e.name)) continue;
    if (opts.skipDirs && opts.skipDirs.includes(e.name)) continue;
    if (opts.skipUnderscore && e.name.startsWith('_')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc, opts);
    else if (opts.match(e.name)) acc.push(p);
  }
  return acc;
}

const htmlOpts = { skipDirs: ['dev', 'gen', 'audit', 'og'], skipUnderscore: true, match: (n) => n.endsWith('.html') };
const htmlFiles = walk(ROOT, [], htmlOpts);

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

// ---------- 1. sitemap vs local pages ----------
const smPath = path.join(ROOT, 'sitemap.xml');
if (fs.existsSync(smPath)) {
  const sm = fs.readFileSync(smPath, 'utf8');
  const smPaths = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITE, ''));
  const localPaths = htmlFiles.map(rel);

  console.log('=== SITEMAP vs LOCAL ===');
  console.log('sitemap entries: ' + smPaths.length + '   local html: ' + localPaths.length);
  const notInSm = localPaths.filter((p) => !smPaths.includes(p));
  const notLocal = smPaths.filter((p) => !localPaths.includes(p));
  console.log('--- local NOT in sitemap (' + notInSm.length + ') ---');
  notInSm.forEach((p) => console.log('  ' + p));
  console.log('--- sitemap NOT local (' + notLocal.length + ') ---');
  notLocal.forEach((p) => console.log('  ' + p));
} else {
  console.log('=== SITEMAP MISSING ===');
}

// ---------- 2. local asset references ----------
console.log('');
console.log('=== MISSING LOCAL ASSETS ===');
const missing = new Map();
for (const f of htmlFiles) {
  const t = fs.readFileSync(f, 'utf8');
  const re = /(?:src|href)=["']([^"'#?]+\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2?|css|js))["']/gi;
  let m;
  while ((m = re.exec(t))) {
    const u = m[1];
    if (/^(https?:)?\/\//i.test(u) || u.startsWith('data:') || u.startsWith('#')) continue;
    const abs = path.resolve(path.dirname(f), u.split('?')[0].split('#')[0]);
    if (!fs.existsSync(abs)) {
      const key = rel(abs);
      if (!missing.has(key)) missing.set(key, []);
      missing.get(key).push(rel(f));
    }
  }
}
if (missing.size === 0) console.log('  none — every local asset reference resolves on disk');
for (const [k, v] of missing) {
  console.log('  MISSING ' + k);
  v.slice(0, 4).forEach((s) => console.log('       used by ' + s));
  if (v.length > 4) console.log('       ... and ' + (v.length - 4) + ' more');
}

// ---------- 3. orphans: html files nothing links to ----------
console.log('');
console.log('=== ORPHAN HTML (not linked from any other page) ===');
const allText = htmlFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const orphans = [];
for (const f of htmlFiles) {
  const r = rel(f);
  if (r === 'index.html' || r === '404.html') continue;
  const base = path.basename(r, '.html');
  const linked = allText.includes(r) || allText.includes(base + '.html');
  if (!linked) orphans.push(r);
}
console.log(orphans.length === 0 ? '  none' : orphans.map((o) => '  ' + o).join('\n'));

// ---------- 4. untracked in git ----------
console.log('');
console.log('=== UNTRACKED DIRS (would not ship) ===');
for (const d of ['og', 'assets']) {
  const p = path.join(ROOT, d);
  if (!fs.existsSync(p)) { console.log('  ' + d + ': does not exist'); continue; }
  const n = walk(p, [], { match: () => true }).length;
  console.log('  ' + d + ': ' + n + ' files present');
}

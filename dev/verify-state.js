// The Come Up — precise state verification.
// Prints an exact diff between: pages on disk, sitemap.xml, the OG manifest,
// and the OG png files actually present. No guessing, no loose regexes.
//
// Usage: node dev/verify-state.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://thecomeuphq.github.io/comeup-links/';

const SKIP_DIRS = ['.git', 'node_modules', '.output', 'dev', 'gen', 'audit', 'og', '.output'];
const SITE_PAGES = new Set([
  'index.html', '404.html', 'join.html', 'missions.html', 'share.html',
  'link-in-bio.html', 'waitlist.html', 'catalog.html', 'bundle.html',
  'compare.html', 'dashboard.html', 'favorites.html', 'printables.html',
  'guides.html', 'faq.html', 'problems.html', 'tools.html', 'free-vs-paid.html',
  'plan-link.html', 'payday-ritual.html', 'empire-roadmap.html',
  '30-day-paycheck-reset.html', 'paycheck-protection-checklist.html',
]);

function walk(dir, acc) {
  acc = acc || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.includes(e.name)) continue;
    if (e.name.startsWith('_')) continue;
    if (e.name === 'share.html' || e.name === 'share.txt') continue; // stray MS sign-in capture
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(path.relative(ROOT, p).replace(/\\/g, '/'));
  }
  return acc;
}

// sitemap loc -> repo-relative page path
function locToFile(loc) {
  let u = loc.replace(SITE, '');
  if (u === '' || u === '/') return 'index.html';
  u = u.replace(/\/$/, '');
  if (!u.endsWith('.html')) u += '/index.html';
  return u;
}

const files = walk(ROOT).sort();
const fileSet = new Set(files);

// --- sitemap ---
const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const sitemapFiles = new Set(locs.map(locToFile));

// --- og manifest ---
let manifest = {};
try {
  manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'og', 'manifest.json'), 'utf8'));
} catch (e) {
  console.log('!! og/manifest.json unreadable: ' + e.message);
}
const manifestEntries = Object.entries(manifest);

// --- og pngs on disk ---
function ogPngs(dir, acc) {
  acc = acc || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) ogPngs(p, acc);
    else if (e.name.endsWith('.png')) acc.push(path.relative(ROOT, p).replace(/\\/g, '/'));
  }
  return acc;
}
const pngs = new Set(ogPngs(path.join(ROOT, 'og')));

console.log('=== COUNTS ===');
console.log('html pages on disk : ' + files.length);
console.log('sitemap <loc>       : ' + locs.length);
console.log('sitemap unique files: ' + sitemapFiles.size);
console.log('og manifest entries : ' + manifestEntries.length);
console.log('og png files on disk: ' + pngs.size);

const notInSitemap = files.filter((f) => !sitemapFiles.has(f));
const notOnDisk = [...sitemapFiles].filter((f) => !fileSet.has(f));
const noOg = files.filter((f) => !manifest[f]);
const ogMissingFile = manifestEntries.filter(([k, v]) => !pngs.has(v));
const ogUnusedPng = [...pngs].filter((p) => !Object.values(manifest).includes(p));

console.log('\n=== PAGES ON DISK BUT NOT IN SITEMAP (' + notInSitemap.length + ') ===');
notInSitemap.forEach((f) => console.log('  ' + f));
console.log('\n=== IN SITEMAP BUT NOT ON DISK (' + notOnDisk.length + ') ===');
notOnDisk.forEach((f) => console.log('  ' + f));
console.log('\n=== PAGES WITH NO OG MANIFEST ENTRY (' + noOg.length + ') ===');
noOg.forEach((f) => console.log('  ' + f));
console.log('\n=== MANIFEST POINTS AT MISSING PNG (' + ogMissingFile.length + ') ===');
ogMissingFile.forEach(([k, v]) => console.log('  ' + k + ' -> ' + v));
console.log('\n=== PNG FILES NOT REFERENCED BY MANIFEST (' + ogUnusedPng.length + ') ===');
ogUnusedPng.forEach((p) => console.log('  ' + p));

// --- head state per page ---
const strip = (s) => (s || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const h1bad = [], nogOg = [], noLd = [], noCanon = [], noDesc = [], noShare = [], noCta = [];
for (const f of files) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const h1 = (h.match(/<h1[\s>]/gi) || []).length;
  if (h1 !== 1) h1bad.push(f + ' (h1=' + h1 + ')');
  if (!/property=["']og:image["']/i.test(h)) nogOg.push(f);
  if (!/application\/ld\+json/i.test(h)) noLd.push(f);
  if (!/rel=["']canonical["']/i.test(h)) noCanon.push(f);
  if (!/name=["']description["']/i.test(h)) noDesc.push(f);
  if (!/class=["']tcu-share-b["']/.test(h)) noShare.push(f);
  if (!/tcu-next|next-step|rel=["']next["']/i.test(h)) noCta.push(f);
}
console.log('\n=== H1 COUNT != 1 (' + h1bad.length + ') ===');
h1bad.forEach((f) => console.log('  ' + f));
console.log('\n=== NO og:image META (' + nogOg.length + ') ===');
nogOg.forEach((f) => console.log('  ' + f));
console.log('\n=== NO JSON-LD (' + noLd.length + ') ===');
noLd.forEach((f) => console.log('  ' + f));
console.log('\n=== NO CANONICAL (' + noCanon.length + ') ===');
noCanon.forEach((f) => console.log('  ' + f));
console.log('\n=== NO META DESCRIPTION (' + noDesc.length + ') ===');
noDesc.forEach((f) => console.log('  ' + f));
console.log('\n=== NO SHARE/COPY CONTROL (' + noShare.length + ') ===');
noShare.forEach((f) => console.log('  ' + f));
console.log('\n=== NO NEXT-STEP CTA (' + noCta.length + ') ===');
noCta.forEach((f) => console.log('  ' + f));

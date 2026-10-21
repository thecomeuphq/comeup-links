// Audit the social/SEO head layer across every page in the repo.
// Reports, per page: og:image (absolute? has /og/ ? has .. ? does the PNG exist?),
// og:image:alt (uncorrupted? no nested <meta>? no stray $ backreference?),
// twitter:image, and whether the JSON-LD block parses as JSON.
//
// Usage: node dev/audit-meta.js

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://thecomeuphq.github.io/comeup-links';

function walk(dir, acc) {
  acc = acc || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.output', 'dev', 'gen', 'audit'].includes(e.name)) continue;
    if (e.name.startsWith('_')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(path.relative(ROOT, p).replace(/\\/g, '/'));
  }
  return acc;
}

const files = walk(ROOT).sort();
const issues = [];
let okPages = 0;

for (const f of files) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const bad = [];

  const ogImg = (h.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i) || [])[1];
  if (!ogImg) bad.push('no og:image');
  else {
    if (!/^https:\/\//.test(ogImg)) bad.push('og:image not absolute');
    if (ogImg.includes('..')) bad.push('og:image has .. segments');
    if (!/comeup-links\/og\//.test(ogImg)) bad.push('og:image missing /og/ segment');
    const rel = ogImg.replace(SITE + '/', '');
    if (rel.startsWith('http')) bad.push('og:image wrong host');
    else if (!fs.existsSync(path.join(ROOT, rel))) bad.push('og:image PNG missing on disk: ' + rel);
  }

  const alt = (h.match(/<meta\s+property=["']og:image:alt["']\s+content=["']([^"']*)["']/i) || [])[1];
  if (alt === undefined) bad.push('no og:image:alt');
  else {
    if (/<meta/i.test(alt)) bad.push('alt has nested <meta> tag');
    if (/\$[0-9]/.test(alt)) bad.push('alt has stray $ backreference');
    if (/<[^>]+>/.test(alt)) bad.push('alt has raw html');
    if (/\sThe Come Up\s*—\s*The Come Up\s*$/.test(alt)) bad.push('alt has doubled brand suffix');
  }

  const tw = (h.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']*)["']/i) || [])[1];
  if (!tw) bad.push('no twitter:image');
  else if (ogImg && tw !== ogImg) bad.push('twitter:image != og:image');

  const card = (h.match(/<meta\s+name=["']twitter:card["']\s+content=["']([^"']*)["']/i) || [])[1];
  if (card !== 'summary_large_image') bad.push('twitter:card = ' + card);

  const ldMatch = h.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!ldMatch) bad.push('no JSON-LD');
  else {
    try {
      const parsed = JSON.parse(ldMatch[1]);
      if (!parsed['@graph'] || !Array.isArray(parsed['@graph'])) bad.push('JSON-LD missing @graph');
    } catch (e) {
      bad.push('JSON-LD does not parse: ' + e.message);
    }
  }

  if (bad.length) issues.push({ f, bad });
  else okPages++;
}

console.log('pages: ' + files.length + '   clean: ' + okPages + '   with issues: ' + issues.length);
console.log('');
if (issues.length) {
  const byKind = new Map();
  for (const it of issues) {
    for (const b of it.bad) {
      const k = b.replace(/:.*/, '');
      if (!byKind.has(k)) byKind.set(k, []);
      byKind.get(k).push(it.f);
    }
  }
  for (const [k, list] of byKind) {
    console.log('[' + list.length + '] ' + k);
    list.slice(0, 6).forEach((f) => console.log('      ' + f));
    if (list.length > 6) console.log('      ... +' + (list.length - 6) + ' more');
  }
  console.log('');
  console.log('--- per page ---');
  issues.forEach((it) => console.log('  ' + it.f + ' :: ' + it.bad.join(' | ')));
}

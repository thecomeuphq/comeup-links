// Find EVERY asset (img src, link href, css url()) referenced by a page
// and check the file actually exists in the repo. Anything referenced but
// missing is a live 404.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function walk(dir, acc) {
  acc = acc || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.output', 'dev', 'gen', 'audit', 'og'].includes(e.name)) continue;
    if (e.name.startsWith('_')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(path.relative(ROOT, p).replace(/\\/g, '/'));
  }
  return acc;
}
const files = walk(ROOT).sort();

const missing = new Map();
let checked = 0;

for (const f of files) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const refs = new Set();
  // <img src>, <script src>, <link href>, <source src>
  for (const m of h.matchAll(/<(?:img|script|source|iframe|video|audio)\b[^>]*\bsrc=["']([^"'>]+)["']/gi)) refs.add(m[1]);
  for (const m of h.matchAll(/<link\b[^>]*\bhref=["']([^"'>]+)["']/gi)) refs.add(m[1]);
  // css url(...) inside <style> and style=""
  for (const m of h.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) refs.add(m[1]);

  for (const r of refs) {
    if (/^(https?:|data:|mailto:|tel:|#|\/\/)/i.test(r)) continue;
    const clean = r.split('?')[0].split('#')[0];
    if (!clean) continue;
    // resolve relative to the page's own folder
    const base = path.dirname(path.join(ROOT, f));
    const abs = path.resolve(base, clean);
    checked++;
    if (!fs.existsSync(abs)) {
      if (!missing.has(clean)) missing.set(clean, []);
      missing.get(clean).push(f);
    }
  }
}

console.log('=== ASSET REFERENCE AUDIT ===');
console.log('  pages scanned          : ' + files.length);
console.log('  local refs checked     : ' + checked);
console.log('  distinct MISSING files : ' + missing.size);
for (const [ref, pages] of missing) {
  console.log('  MISSING ' + ref + '  <- ' + pages.join(', '));
}

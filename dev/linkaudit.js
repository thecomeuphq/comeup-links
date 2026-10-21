const fs = require('fs'), path = require('path');

function walk(dir, acc) {
  acc = acc || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'tools') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

const files = walk('.');
const all = new Set();
for (const f of files) {
  const d = path.dirname(f).replace(/^\./, '').replace(/\\/g, '/');
  const rel = (d === '' ? '' : d + '/') + path.basename(f);
  all.add(rel);
  all.add(rel.replace(/index\.html$/, ''));
}

function resolve(from, href) {
  if (/^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(href)) return null;
  let h = href.split('#')[0].split('?')[0];
  if (!h) return null;
  const base = path.dirname(from);
  let t = path.normalize(path.join(base, h)).replace(/\\/g, '/');
  t = t.replace(/^\.\//, '');
  while (t.startsWith('../')) t = t.slice(3);
  if (t === '' || t === '.') t = path.basename(from);
  return t;
}

const broken = [];
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const re = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) {
    const t = resolve(f, m[1]);
    if (!t) continue;
    if (t.endsWith('/')) {
      if (!all.has(t + 'index.html')) broken.push([f, m[1], t + 'index.html']);
      continue;
    }
    if (!all.has(t)) broken.push([f, m[1], t]);
  }
}

console.log('HTML FILES: ' + files.length);
console.log('BROKEN INTERNAL LINKS: ' + broken.length);
const seen = new Set();
for (const b of broken) {
  const k = b[0] + '|' + b[2];
  if (seen.has(k)) continue;
  seen.add(k);
  console.log('  ' + b[0] + '  ->  ' + b[1] + '   [missing: ' + b[2] + ']');
}

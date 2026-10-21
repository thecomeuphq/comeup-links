const fs = require('fs'), path = require('path');

function walk(dir, acc, allFiles) {
  acc = acc || [];
  allFiles = allFiles || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'tools' || e.name === 'dev' || e.name === 'gen') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc, allFiles);
    else if (e.name.endsWith('.html')) acc.push(p);
    else allFiles.push(p);
  }
  return acc;
}

const otherFiles = [];
const files = walk('.', [], otherFiles);
const all = new Set();
for (const f of files) {
  const d = path.dirname(f).replace(/^\./, '').replace(/\\/g, '/');
  const rel = (d === '' ? '' : d + '/') + path.basename(f);
  all.add(rel);
  all.add(rel.replace(/index\.html$/, ''));
}
// Every NON-HTML file is a valid link target, wherever it lives. The old
// version only added ROOT-level files (manifest, sitemap, robots), so a page
// linking to assets/foo.png was reported BROKEN even though the file was
// on disk and deploying fine.
for (const f of otherFiles) {
  const d = path.dirname(f).replace(/^\./, '').replace(/\\/g, '/');
  const rel = (d === '' ? '' : d + '/') + path.basename(f);
  all.add(rel);
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

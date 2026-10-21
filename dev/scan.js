const fs = require('fs');
const path = require('path');
function walk(dir, acc) {
  acc = acc || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'tools' || e.name === '.output') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}
const files = walk('.');
console.log('=== STATE / STORAGE USAGE ===');
for (const f of files) {
  const h = fs.readFileSync(f, 'utf8');
  const hits = [];
  if (/localStorage/.test(h)) hits.push('localStorage');
  if (/sessionStorage/.test(h)) hits.push('sessionStorage');
  if (/indexedDB/.test(h)) hits.push('indexedDB');
  if (/cookie/i.test(h)) hits.push('cookie');
  if (hits.length) console.log('  ' + f + ' -> ' + hits.join(','));
}
console.log('');
console.log('=== PAGE TITLES ===');
for (const f of files.sort()) {
  const h = fs.readFileSync(f, 'utf8');
  const t = (h.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '(none)';
  console.log('  ' + f.padEnd(46) + ' ' + t.replace(/\s+/g, ' ').trim());
}
console.log('');
console.log('=== META DESCRIPTION COUNT: ' + files.filter(f => /name="description"/.test(fs.readFileSync(f, 'utf8'))).length + ' / ' + files.length + ' ===');
console.log('=== CANONICAL COUNT: ' + files.filter(f => /rel="canonical"/.test(fs.readFileSync(f, 'utf8'))).length + ' ===');
console.log('=== OG:URL COUNT: ' + files.filter(f => /property="og:url"/.test(fs.readFileSync(f, 'utf8'))).length + ' ===');
console.log('=== JSONLD COUNT: ' + files.filter(f => /application\/ld\+json/.test(fs.readFileSync(f, 'utf8'))).length + ' ===');
console.log('=== MANIFEST COUNT: ' + files.filter(f => /rel="manifest"/.test(fs.readFileSync(f, 'utf8'))).length + ' ===');
console.log('=== VIEWPORT COUNT: ' + files.filter(f => /name="viewport"/.test(fs.readFileSync(f, 'utf8'))).length + ' ===');
console.log('=== THEME-COLOR COUNT: ' + files.filter(f => /name="theme-color"/.test(fs.readFileSync(f, 'utf8'))).length + ' ===');
console.log('=== PRINT CSS COUNT: ' + files.filter(f => /@media print/.test(fs.readFileSync(f, 'utf8'))).length + ' ===');

// Verify every OG card is a real PNG at the size the meta tags claim (1200x630).
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const ogDir = path.join(ROOT, 'og');
function walk(d, acc) {
  acc = acc || [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.png')) acc.push(p);
  }
  return acc;
}
const pngs = walk(ogDir);
const hist = {};
let bad = [];
let totalBytes = 0;
for (const p of pngs) {
  const b = fs.readFileSync(p);
  totalBytes += b.length;
  const isPng = b.readUInt32BE(0) === 0x89504e47;
  if (!isPng) { bad.push(path.relative(ROOT, p) + ' NOT A PNG'); continue; }
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  const k = w + 'x' + h;
  hist[k] = (hist[k] || 0) + 1;
  if (w !== 1200 || h !== 630) bad.push(path.relative(ROOT, p) + ' ' + w + 'x' + h);
}
console.log('og png count : ' + pngs.length);
console.log('total bytes  : ' + (totalBytes / 1024 / 1024).toFixed(2) + ' MB');
console.log('size histogram: ' + JSON.stringify(hist));
console.log('cards not 1200x630: ' + bad.length);
bad.forEach((b) => console.log('  ' + b));

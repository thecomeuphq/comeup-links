// Verify the og/ PNG set on disk EXACTLY matches the manifest, and that
// every manifest target resolves to a real file at the right path.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'og', 'manifest.json'), 'utf8'));

// every png on disk (recursive), relative to og/
const onDisk = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.png')) onDisk.push(path.relative(path.join(ROOT, 'og'), p).replace(/\\/g, '/'));
  }
})(path.join(ROOT, 'og'));

const diskSet = new Set(onDisk);
const wantSet = new Set(Object.values(manifest));

console.log('manifest entries : ' + wantSet.size);
console.log('png files on disk: ' + diskSet.size);

const missing = [...wantSet].filter((v) => !diskSet.has(v));
const extra = [...diskSet].filter((v) => !wantSet.has(v));
console.log('\nmanifest targets with NO file on disk: ' + missing.length);
missing.forEach((m) => console.log('  MISSING ' + m));
console.log('png files NOT in manifest            : ' + extra.length);
extra.forEach((e) => console.log('  EXTRA   ' + e));

// spot-check the three sitemap-gap pages and nested paths
console.log('\n--- spot check ---');
for (const k of ['index.html', 'join.html', 'missions.html', 'hourly-pay/18-an-hour/index.html', 'debt-free.html']) {
  const v = manifest[k];
  const p = v ? path.join(ROOT, 'og', v) : null;
  console.log(
    k.padEnd(36) + ' -> ' + String(v).padEnd(30) +
    (p && fs.existsSync(p) ? 'EXISTS (' + fs.statSync(p).size + ' bytes)' : '*** MISSING ***')
  );
}

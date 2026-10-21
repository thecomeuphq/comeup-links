// GitHub hard-limits check for the files about to be committed.
// GitHub rejects any file >100MB and warns above 50MB. Pages also has a
// 1GB soft site limit.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');

const staged = execSync('git diff --cached --name-only', { cwd: ROOT, encoding: 'utf8' })
  .split('\n').filter(Boolean);

let total = 0;
const big = [];
for (const f of staged) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  const st = fs.statSync(p);
  total += st.size;
  if (st.size > 1024 * 1024) big.push({ f, mb: st.size / 1024 / 1024 });
}
console.log('staged files:      ' + staged.length);
console.log('staged size:       ' + (total / 1024 / 1024).toFixed(2) + ' MB');
console.log('files over 1MB:    ' + big.length);
big.sort((a, b) => b.mb - a.mb).forEach((b) => console.log('   ' + b.mb.toFixed(2) + 'MB  ' + b.f));
console.log('files over 100MB:  ' + big.filter((b) => b.mb > 100).length + '  (GitHub hard limit)');
console.log('files over 50MB:   ' + big.filter((b) => b.mb > 50).length + '  (GitHub warning)');

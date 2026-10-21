// Show the conflict regions in a conflicted file, so I can see exactly what
// both sides changed before I resolve them.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const file = process.argv[2];
const h = fs.readFileSync(path.join(ROOT, file), 'utf8');
const lines = h.split(/\r?\n/);
let inConflict = false;
let start = 0;
const chunks = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (l.startsWith('<<<<<<<') && !inConflict) { inConflict = true; start = i; chunks.push([]); continue; }
  if (inConflict) {
    if (l.startsWith('=======')) { chunks[chunks.length - 1].push('---SPLIT---'); continue; }
    if (l.startsWith('>>>>>>>')) {
      inConflict = false;
      chunks[chunks.length - 1].push('---END---');
      continue;
    }
    chunks[chunks.length - 1].push(l);
  }
}
console.log('file: ' + file + '   conflict chunks: ' + chunks.length);
chunks.forEach((c, idx) => {
  const ours = [], theirs = [];
  let cur = ours, seen = false;
  for (const l of c) {
    if (l === '---SPLIT---') { cur = theirs; seen = true; continue; }
    if (l === '---END---') continue;
    cur.push(l);
  }
  console.log('\n=== CHUNK ' + (idx + 1) + ' @ line ' + (start + 1) + ' ===');
  console.log('  OURS   (' + ours.length + ' lines)');
  ours.slice(0, 14).forEach((l) => console.log('    | ' + l.slice(0, 150)));
  console.log('  THEIRS (' + theirs.length + ' lines)');
  theirs.slice(0, 14).forEach((l) => console.log('    | ' + l.slice(0, 150)));
});

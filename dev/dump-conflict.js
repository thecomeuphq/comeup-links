// Dump the FULL conflict chunk text for a file, so I can see what each side
// contributed without truncation.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const file = process.argv[2];
const h = fs.readFileSync(path.join(ROOT, file), 'utf8');
const lines = h.split(/\r?\n/);
let inConflict = false, idx = 0, ours = [], theirs = [], cur = null;
const chunks = [];
for (const l of lines) {
  if (l.startsWith('<<<<<<<')) { inConflict = true; ours = []; theirs = []; cur = ours; continue; }
  if (inConflict && l.startsWith('=======')) { cur = theirs; continue; }
  if (inConflict && l.startsWith('>>>>>>>')) { inConflict = false; chunks.push({ ours, theirs }); continue; }
  if (inConflict) cur.push(l);
}
console.log('FILE: ' + file + '  chunks: ' + chunks.length);
chunks.forEach((c, i) => {
  console.log('\n########## CHUNK ' + (i + 1) + ' ##########');
  console.log('----- OURS (' + c.ours.length + ' lines) -----');
  c.ours.forEach((l) => console.log(l.slice(0, 200)));
  console.log('----- THEIRS (' + c.theirs.length + ' lines) -----');
  c.theirs.forEach((l) => console.log(l.slice(0, 200)));
});

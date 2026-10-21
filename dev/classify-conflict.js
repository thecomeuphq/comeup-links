// Classify every conflicted file by the SHAPE of its conflict, so I know
// which resolution rule applies before touching anything.
//
// Expected pattern: OURS = the JSON-LD block my commit added, THEIRS = the
// privacy-first analytics block the upstream commit added. Both are real and
// different, so the correct resolution is to KEEP BOTH.
//
// Anything that does not fit this shape gets reported, not auto-resolved.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');

const conflicted = execSync('git diff --name-only --diff-filter=U', { cwd: ROOT, encoding: 'utf8' })
  .split('\n').filter(Boolean);

const shapes = {};
const odd = [];

for (const file of conflicted) {
  const h = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const lines = h.split(/\r?\n/);
  let inC = false, ours = [], theirs = [], cur = null;
  const chunks = [];
  for (const l of lines) {
    if (l.startsWith('<<<<<<<')) { inC = true; ours = []; theirs = []; cur = ours; continue; }
    if (inC && l.startsWith('=======')) { cur = theirs; continue; }
    if (inC && l.startsWith('>>>>>>>')) { inC = false; chunks.push({ ours, theirs }); continue; }
    if (inC) cur.push(l);
  }

  const shape = chunks.map((c) => {
    const o = c.ours.join('\n');
    const t = c.theirs.join('\n');
    let ok = 'jsonld+analytics';
    if (o.includes('application/ld+json') && t.includes('__comeupCapture')) ok = 'jsonld+analytics';
    else if (o.includes('__comeupCapture') && t.includes('application/ld+json')) ok = 'analytics+jsonld';
    else if (o.includes('__comeupCapture') && t.includes('__comeupCapture')) ok = 'analytics+analytics';
    else if (o.includes('application/ld+json') && t.includes('application/ld+json')) ok = 'jsonld+jsonld';
    else ok = 'UNKNOWN';
    return ok;
  }).join(' + ');

  shapes[shape] = (shapes[shape] || 0) + 1;
  if (shape.includes('UNKNOWN')) odd.push({ file, shape, chunks });
}

console.log('conflicted files: ' + conflicted.length);
console.log('\n--- conflict shapes ---');
Object.entries(shapes).sort().forEach(([k, v]) => console.log('  ' + String(v).padStart(3) + '  ' + k));
if (odd.length) {
  console.log('\n--- UNCLASSIFIED (need manual review) ---');
  odd.forEach((o) => {
    console.log('\n### ' + o.file + '  [' + o.shape + ']  chunks: ' + o.chunks.length);
    o.chunks.forEach((c, i) => {
      console.log('  OURS   (' + c.ours.length + '): ' + c.ours.slice(0, 3).join(' | ').slice(0, 300));
      console.log('  THEIRS (' + c.theirs.length + '): ' + c.theirs.slice(0, 3).join(' | ').slice(0, 300));
    });
  });
}

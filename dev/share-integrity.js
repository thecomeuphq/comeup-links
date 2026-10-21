// Guard: no page may contain TWO share script blocks, and every share block
// must be a balanced IIFE that parses. The repair pass above rewrote blocks
// in place, so this proves there is no leftover duplicate and no residue of
// the broken template.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function walk(dir, acc) {
  acc = acc || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dev', 'gen', 'audit', 'og', 'assets'].includes(e.name)) continue;
    if (e.name.startsWith('_')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(path.relative(ROOT, p).replace(/\\/g, '/'));
  }
  return acc;
}

const pages = walk(ROOT);
let dupes = 0, unparsed = 0, noOpener = 0, noCloser = 0, ok = 0;
const problems = [];
for (const p of pages) {
  const h = fs.readFileSync(path.join(ROOT, p), 'utf8');
  const re = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  const blocks = [];
  while ((m = re.exec(h))) {
    if ((m[1] || '').toLowerCase().includes('ld+json')) continue;
    if (m[2].includes('var SITE =')) blocks.push(m[2]);
  }
  if (blocks.length === 0) { problems.push(p + ': NO SHARE BLOCK'); continue; }
  if (blocks.length > 1) { dupes++; problems.push(p + ': ' + blocks.length + ' SHARE BLOCKS'); }
  const b = blocks[0];
  if (!/\(function\s*\(\)\s*\{/.test(b)) { noOpener++; problems.push(p + ': NO IIFE OPENER'); }
  if (!/\}\)\(\);/.test(b)) { noCloser++; problems.push(p + ': NO IIFE CLOSER'); }
  try { new vm.Script(b, { filename: p }); ok++; }
  catch (e) { unparsed++; problems.push(p + ': PARSE ERROR - ' + e.message); }
}
console.log('pages scanned:      ' + pages.length);
console.log('share blocks parse: ' + ok);
console.log('duplicate blocks:   ' + dupes);
console.log('missing opener:     ' + noOpener);
console.log('missing closer:     ' + noCloser);
console.log('parse errors:       ' + unparsed);
if (problems.length) { console.log('--- problems ---'); problems.forEach((x) => console.log('  ' + x)); }
else console.log('SHARE BLOCK AUDIT CLEAN');

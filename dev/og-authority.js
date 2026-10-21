// AUTHORITATIVE og:image audit.
// Lists EVERY og:image meta tag on every page (not just the first), and
// reports the actual distribution of correct vs broken URLs.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://thecomeuphq.github.io/comeup-links/';

function walk(dir, acc) {
  acc = acc || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.output', 'dev', 'gen', 'audit', 'og', 'assets'].includes(e.name)) continue;
    if (e.name.startsWith('_')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(path.relative(ROOT, p).replace(/\\/g, '/'));
  }
  return acc;
}

const files = walk(ROOT).sort();
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'og', 'manifest.json'), 'utf8'));

const correct = [], broken = [], multi = [], none = [];
const brokenSamples = [];

for (const f of files) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const all = [...h.matchAll(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/gi)].map((m) => m[1]);
  if (!all.length) { none.push(f); continue; }
  if (all.length > 1) multi.push(f + ' (' + all.length + ')');
  const expected = manifest[f];
  const good = all.filter((u) => u === SITE + expected);
  if (good.length === all.length && good.length > 0) correct.push(f);
  else {
    broken.push(f);
    brokenSamples.push(f + '  ->  ' + all.join(' | '));
  }
}

console.log('=== OG IMAGE AUDIT (authoritative) ===');
console.log('  pages scanned            : ' + files.length);
console.log('  ALL tags point to /og/   : ' + correct.length);
console.log('  at least one broken tag  : ' + broken.length);
console.log('  multiple og:image tags   : ' + multi.length);
console.log('  no og:image at all       : ' + none.length);
if (multi.length) { console.log('  --- multi ---'); multi.forEach((m) => console.log('    ' + m)); }
if (none.length) { console.log('  --- none ---'); none.forEach((m) => console.log('    ' + m)); }
console.log('\n  --- broken sample (first 15) ---');
brokenSamples.slice(0, 15).forEach((b) => console.log('    ' + b));

// twitter:image check
let twBroken = [];
for (const f of files) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const all = [...h.matchAll(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/gi)].map((m) => m[1]);
  const expected = manifest[f];
  if (!all.length || all.some((u) => u !== SITE + expected)) {
    twBroken.push(f + (all.length ? ' -> ' + all.join(' | ') : ' -> MISSING'));
  }
}
console.log('\n  twitter:image broken/missing: ' + twBroken.length);
twBroken.slice(0, 10).forEach((b) => console.log('    ' + b));

// what does the COMMITTED version look like vs the working tree?
console.log('\n=== WORKING TREE vs HEAD for a sample page ===');
const sample = 'debt-free.html';
const head = require('child_process').execSync('git show HEAD:' + sample, { cwd: ROOT, encoding: 'utf8' });
const wt = fs.readFileSync(path.join(ROOT, sample), 'utf8');
for (const [label, content] of [['HEAD', head], ['WORKTREE', wt]]) {
  const m = content.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  const mw = content.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
  console.log('  ' + label.padEnd(9) + ' og:image=' + (m ? m[1] : 'NONE'));
  console.log('  ' + label.padEnd(9) + ' twitter:image=' + (mw ? mw[1] : 'NONE'));
}

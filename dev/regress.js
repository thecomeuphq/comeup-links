// Verify: are the validator failures on legacy pages pre-existing (present at
// HEAD) or regressions introduced by my injections?
const { execSync } = require('child_process');
const fs = require('fs');

const files = ['tools.html', 'debt-free.html', 'savings-challenge.html'];

function check(h) {
  return {
    doctype: h.includes('<!DOCTYPE html>'),
    charset: h.includes('<meta charset="utf-8">'),
    themeColor: h.includes('name="theme-color"'),
    jsonld: h.includes('application/ld+json'),
    skipLink: h.includes('href="#main-content"'),
    main: h.includes('id="main-content"'),
    h1: (h.match(/<h1\b/gi) || []).length
  };
}

for (const f of files) {
  const head = execSync('git show HEAD:' + f, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  const now = fs.readFileSync(f, 'utf8');
  const a = check(head);
  const b = check(now);
  const diffs = [];
  for (const k of Object.keys(a)) {
    if (a[k] !== b[k]) diffs.push(k + ': ' + a[k] + ' -> ' + b[k]);
  }
  console.log('=== ' + f + ' ===');
  console.log('  HEAD: ' + JSON.stringify(a));
  console.log('  NOW : ' + JSON.stringify(b));
  console.log('  REGRESSIONS: ' + (diffs.length ? diffs.join(' | ') : 'NONE - all failures pre-existing'));
  console.log('');
}

// Verify every inline <script> block parses as valid JavaScript, and that
// the interactive elements the pages depend on actually exist.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function walk(dir, acc) {
  acc = acc || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'dev' || e.name === 'gen') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

const NEW_PAGES = [
  'problems.html', 'compare.html', 'faq.html', 'guides.html',
  'dashboard.html', 'favorites.html', 'payday-ritual.html',
  'plan-link.html', 'printables.html', 'waitlist.html',
  'catalog.html', 'free-vs-paid.html', 'bundle.html', '404.html',
  'index.html', 'tools.html'
];

let failures = 0;

for (const f of NEW_PAGES) {
  const h = fs.readFileSync(f, 'utf8');
  const problems = [];

  // Extract inline scripts (no src attribute).
  const scripts = [];
  const re = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(h))) {
    const type = (m[1] || '').toLowerCase();
    if (type.includes('ld+json')) continue;   // JSON, not JS
    scripts.push(m[2]);
  }

  scripts.forEach((code, i) => {
    if (!code.trim()) return;
    try {
      new vm.Script(code, { filename: f + '#script' + i });
    } catch (e) {
      problems.push('script ' + i + ' syntax error: ' + e.message);
    }
  });

  // Check that ids referenced by getElementById in the scripts exist in markup.
  const ids = new Set();
  const idRe = /\bid="([^"]+)"/g;
  while ((m = idRe.exec(h))) ids.add(m[1]);
  scripts.forEach((code) => {
    const gid = /getElementById\(\s*['"]([^'"]+)['"]\s*\)/g;
    let g;
    while ((g = gid.exec(code))) {
      if (!ids.has(g[1])) problems.push('script references missing id: ' + g[1]);
    }
  });

  // Check querySelector targets used in scripts have matching classes/ids.
  const selRe = /querySelector(?:All)?\(\s*['"]#([A-Za-z0-9_-]+)['"]\s*\)/g;
  scripts.forEach((code) => {
    let s;
    while ((s = selRe.exec(code))) {
      if (!ids.has(s[1])) problems.push('script querySelector #' + s[1] + ' has no match');
    }
  });

  if (problems.length) {
    failures++;
    console.log('FAIL ' + f);
    problems.forEach(p => console.log('     - ' + p));
  } else {
    console.log('PASS ' + f + '  (' + scripts.length + ' inline script(s) parse clean)');
  }
}

console.log('\n' + (failures ? failures + ' FAILED' : 'ALL JS CHECKS PASSED'));
process.exit(failures ? 1 : 0);

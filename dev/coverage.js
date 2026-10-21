// Coverage audit: which pages miss canonical / og:url / twitter / description / JSON-LD.
const fs = require('fs');
const path = require('path');

function walk(dir, acc) {
  acc = acc || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'tools' || e.name === 'dev' || e.name === 'gen') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

const files = walk('.');
const miss = { desc: [], canon: [], ogurl: [], tw: [], ld: [] };
for (const f of files) {
  const h = fs.readFileSync(f, 'utf8');
  if (!/name="description"/.test(h)) miss.desc.push(f);
  if (!/rel="canonical"/.test(h)) miss.canon.push(f);
  if (!/property="og:url"/.test(h)) miss.ogurl.push(f);
  if (!/name="twitter:card"/.test(h)) miss.tw.push(f);
  if (!/application\/ld\+json/.test(h)) miss.ld.push(f);
}
console.log('TOTAL PAGES: ' + files.length);
for (const k of Object.keys(miss)) {
  console.log('\nMISSING ' + k.toUpperCase() + ' (' + miss[k].length + '):');
  for (const f of miss[k]) console.log('   ' + f);
}

// Inspect state shapes of the 5 stateful pages
console.log('\n\n=== STATEFUL PAGE STORE KEYS ===');
for (const f of ['30-day-paycheck-reset.html','debt-free.html','hourly-money.html','missions.html','savings-challenge.html']) {
  const h = fs.readFileSync(f, 'utf8');
  const keys = new Set();
  const re = /(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(\s*['"`]([A-Za-z0-9_:-]+)['"`]/g;
  let m;
  while ((m = re.exec(h))) keys.add(m[1]);
  // find the const/var assignment of the key
  const defs = [];
  const re2 = /(?:var|const|let)\s+([A-Za-z0-9_]+)\s*=\s*['"`]([^'"`]+)['"`]/g;
  let m2;
  while ((m2 = re2.exec(h))) {
    if (/KEY|LS_|STORE|STORAGE/i.test(m2[1])) defs.push(m2[1] + ' = ' + m2[2]);
  }
  console.log(f + '\n   literal keys: ' + [...keys].join(', ') + '\n   defs: ' + (defs.join(' | ') || '(none)'));
}

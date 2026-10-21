// Probe injection anchors across ALL pages (root + hourly-pay subdirs).
const fs = require('fs');
const path = require('path');

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

const files = walk('.');
const stats = {
  hasH1: 0, h1Single: 0, hasHeadClose: 0, hasBodyClose: 0,
  hasTcuSection: 0, tcuSelfContained: 0, hasStyle: 0, hasManifest: 0
};
const problems = [];

for (const f of files) {
  const h = fs.readFileSync(f, 'utf8');
  const h1s = h.match(/<h1\b/gi) || [];
  if (h1s.length) stats.hasH1++;
  if (h1s.length === 1) stats.h1Single++;
  else problems.push(f + ' -> h1 count ' + h1s.length);
  if (h.includes('</head>')) stats.hasHeadClose++;
  else problems.push(f + ' -> no </head>');
  if (h.includes('</body>')) stats.hasBodyClose++;
  else problems.push(f + ' -> no </body>');
  if (h.includes('class="tcu"')) stats.hasTcuSection++;
  else problems.push(f + ' -> no tcu section');
  if (/<style\b/i.test(h)) stats.hasStyle++;
  if (h.includes('rel="manifest"')) stats.hasManifest++;
}

// Check the tcu section can be closed: from 'class="tcu"' find the next </section>
for (const f of files) {
  const h = fs.readFileSync(f, 'utf8');
  const i = h.indexOf('class="tcu"');
  if (i < 0) continue;
  const j = h.indexOf('</section>', i);
  if (j > 0) stats.tcuSelfContained++;
  else problems.push(f + ' -> tcu section not closable');
}

// Theme detection: does the page use the charcoal/amber tokens?
let charcoal = 0, light = 0;
for (const f of files) {
  const h = fs.readFileSync(f, 'utf8');
  if (h.includes('--bg:#141414') || h.includes('--bg: #141414')) charcoal++;
  else light++;
}
console.log(JSON.stringify(stats, null, 2));
console.log('charcoal-theme pages: ' + charcoal + ', other-theme: ' + light);
console.log('\nPROBLEMS (' + problems.length + '):');
for (const p of problems) console.log('  ' + p);
console.log('\nFILES (' + files.length + '): ' + files.map(f => f.replace(/^\./, '')).join(', '));

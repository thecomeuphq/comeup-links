// Live-check every Gumroad slug the site links to.
//
// A dead checkout link is worse than no link: it looks like a working
// purchase button. This script resolves every slug against the real
// Gumroad account and fails if any of them 404s.
//
// Usage:
//   node dev/gumroad-check.js          # check slugs found in the HTML
//   node dev/gumroad-check.js --all    # also check every slug in gen/products.js
//
// Add to the pre-push checklist. A slug that is intentionally not published
// yet (e.g. a bundle SKU) must be left empty in gen/config.js rather than
// hard-coded into a page.

const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE = 'https://bradley57.gumroad.com/l/';
const FORBIDDEN = ['wupxq', 'oaqjpg']; // the two FREE products — never link

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

// Collect slugs referenced by the shipped HTML.
const htmlSlugs = new Map(); // slug -> [files]
for (const f of walk('.')) {
  const h = fs.readFileSync(f, 'utf8');
  const re = /gumroad\.com\/l\/([a-z0-9]+)/g;
  let m;
  while ((m = re.exec(h))) {
    const s = m[1];
    if (!htmlSlugs.has(s)) htmlSlugs.set(s, []);
    htmlSlugs.get(s).push(f);
  }
}

// Optionally include every product slug we know about.
if (process.argv.includes('--all')) {
  const { PAID } = require('../gen/products');
  for (const p of PAID) {
    if (!htmlSlugs.has(p.slug)) htmlSlugs.set(p.slug, ['gen/products.js (not linked)']);
  }
}

function head(slug) {
  return new Promise((resolve) => {
    const req = https.request(BASE + slug, { method: 'GET', timeout: 20000, headers: { 'User-Agent': 'openclaw-link-check' } }, (res) => {
      // A renamed product keeps the old slug alive with a 301. Follow it, so
      // a working checkout is not reported as dead.
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, BASE + slug).toString();
        headUrl(next).then((r) => resolve({ status: res.statusCode, final: r.status, url: next }));
        return;
      }
      res.resume();
      res.on('end', () => resolve({ status: res.statusCode, final: res.statusCode, url: BASE + slug }));
    });
    req.on('error', (e) => resolve({ status: 'ERR ' + e.message, final: 'ERR', url: BASE + slug }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT', final: 'TIMEOUT', url: BASE + slug }); });
    req.end();
  });
}

function headUrl(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'GET', timeout: 20000, headers: { 'User-Agent': 'openclaw-link-check' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        headUrl(next).then((r) => resolve({ status: r.status, url: next }));
        return;
      }
      res.resume();
      res.on('end', () => resolve({ status: res.statusCode, url }));
    });
    req.on('error', (e) => resolve({ status: 'ERR ' + e.message, url }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT', url }); });
    req.end();
  });
}

(async () => {
  console.log('Checking ' + htmlSlugs.size + ' Gumroad slug(s)...\n');
  const dead = [];
  const free = [];
  for (const slug of [...htmlSlugs.keys()].sort()) {
    if (FORBIDDEN.includes(slug)) {
      free.push(slug);
      console.log('  FREE    ' + slug + '  <-- MUST NOT BE LINKED');
      continue;
    }
    const r = await head(slug);
    // A slug is good if it ends at a 200, even if it redirects on the way
    // (that is what happens when a Gumroad product is renamed).
    const ok = r.final === 200;
    if (!ok) dead.push(slug);
    const where = htmlSlugs.get(slug).join(', ');
    const note = r.status !== r.final ? ' -> ' + r.final + ' ' + r.url.replace(BASE, '') : '';
    console.log('  ' + (ok ? 'OK     ' : 'DEAD   ') + slug.padEnd(10) + r.status + note + '   ' + where);
  }

  console.log('');
  let bad = 0;
  if (free.length) {
    console.log('FAIL: ' + free.length + ' FREE product(s) linked. Remove them.');
    bad++;
  }
  if (dead.length) {
    console.log('FAIL: ' + dead.length + ' dead checkout link(s): ' + dead.join(', '));
    console.log('      Either create the product on Gumroad, or stop linking it.');
    bad++;
  }
  if (!bad) console.log('All Gumroad links resolve, and no free product is linked.');
  process.exit(bad ? 1 : 0);
})();

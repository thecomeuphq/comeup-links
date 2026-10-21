// Audit the social/SEO head layer on every shipped page.
//
// Catches the four failure modes that actually bit the site:
//   1. og:image pointing at a URL that is not under og/   (wrong path -> 404)
//   2. og:image:alt whose content attribute contains a nested <meta> tag
//      (the "$1 replacement" corruption: a "$15" in the title was read as a
//      capture-group reference and the whole block was spliced in)
//   3. a page with no <h1>, or more than one <h1>
//   4. a relative og:image (scrapers do not resolve these)
//
// Usage: node dev/head-audit.js
// Exit code 1 when any error is found, so it can gate a push.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://thecomeuphq.github.io/comeup-links';

function walk(dir, acc) {
  acc = acc || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.output', 'dev', 'gen', 'audit', 'og'].includes(e.name)) continue;
    if (e.name.startsWith('_')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(path.relative(ROOT, p).replace(/\\/g, '/'));
  }
  return acc;
}

const files = walk(ROOT).sort();
const errors = [];
let pages = 0;

for (const f of files) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  pages++;

  // --- og:image path must exist under og/ ---------------------------------
  const ogM = h.match(/property=["']og:image["']\s+content=["']([^"']*)["']/i);
  if (!ogM) {
    errors.push(`${f}  MISSING og:image tag`);
  } else {
    const url = ogM[1];
    if (!url.startsWith('http')) {
      errors.push(`${f}  RELATIVE og:image  "${url}"  (scrapers will not resolve it)`);
    } else if (!url.startsWith(SITE + '/og/')) {
      errors.push(`${f}  og:image NOT under og/  "${url}"  (live 404)`);
    } else {
      // does the file actually exist on disk?
      const rel = url.slice((SITE + '/').length);
      if (!fs.existsSync(path.join(ROOT, rel))) {
        errors.push(`${f}  og:image file MISSING on disk  ${rel}`);
      }
    }
  }

  // --- og:image:alt must not contain a nested tag -------------------------
  const altM = h.match(/property=["']og:image:alt["']\s+content=["']([^"']*)["']/i);
  if (altM) {
    if (/<\s*meta/i.test(altM[1])) {
      errors.push(`${f}  CORRUPT og:image:alt — contains a nested <meta> tag`);
    }
    // The tag itself is corrupt when it OPENS more than one <meta. A
    // well-formed tag contains exactly one.
    const altTag = h.match(/<meta\s+property=["']og:image:alt["'][^>]*>/i)?.[0] || '';
    if ((altTag.match(/<meta\b/gi) || []).length > 1) {
      errors.push(`${f}  CORRUPT og:image:alt TAG — opens more than one <meta`);
    }
  }

  // --- exactly one h1 ------------------------------------------------------
  const h1s = h.match(/<h1[\s>]/gi) || [];
  if (h1s.length === 0) {
    errors.push(`${f}  NO <h1>`);
  } else if (h1s.length > 1) {
    errors.push(`${f}  ${h1s.length} <h1> tags (want exactly 1)`);
  }

  // --- required head tags --------------------------------------------------
  for (const [label, re] of [
    ['og:title', /property=["']og:title["']/i],
    ['og:description', /property=["']og:description["']/i],
    ['og:url', /property=["']og:url["']/i],
    ['twitter:card', /name=["']twitter:card["']/i],
    ['twitter:image', /name=["']twitter:image["']/i],
    ['canonical', /rel=["']canonical["']/i],
    ['JSON-LD', /application\/ld\+json/i],
  ]) {
    if (!re.test(h)) errors.push(`${f}  MISSING ${label}`);
  }
}

console.log(`PAGES AUDITED: ${pages}`);
console.log(`ERRORS: ${errors.length}`);
console.log('');
if (errors.length) {
  errors.forEach((e) => console.log('  ' + e));
  console.log('');
  console.log('FAIL');
  process.exit(1);
} else {
  console.log('PASS — every page has a clean, on-disk, non-corrupt head.');
}

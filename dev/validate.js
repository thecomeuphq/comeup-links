// Validate newly generated pages: structure, required metadata, no free
// Gumroad links, and that every internal href resolves to a real file.
const fs = require('fs');
const path = require('path');

const targets = process.argv.slice(2);
if (!targets.length) { console.error('usage: node dev/validate.js page1.html ...'); process.exit(2); }

// Build the set of real files (all types, not just .html — the manifest
// and sitemap are linked from pages too).
function walk(dir, acc) {
  acc = acc || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'dev' || e.name === 'gen') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}
const real = new Set();
for (const f of walk('.')) {
  const d = path.dirname(f).replace(/^\./, '').replace(/\\/g, '/');
  const rel = (d === '' ? '' : d + '/') + path.basename(f);
  real.add(rel);
  real.add(rel.replace(/index\.html$/, ''));
}

let failures = 0;

for (const t of targets) {
  const h = fs.readFileSync(t, 'utf8');
  const problems = [];

  // --- required metadata ---
  const need = [
    ['<!DOCTYPE html>', 'doctype'],
    ['<meta charset="utf-8">', 'charset'],
    ['name="viewport"', 'viewport'],
    ['name="theme-color"', 'theme-color'],
    ['<title>', 'title'],
    ['name="description"', 'description'],
    ['rel="canonical"', 'canonical'],
    ['property="og:url"', 'og:url'],
    ['name="twitter:card"', 'twitter:card'],
    ['application/ld+json', 'json-ld'],
    ['class="tcu"', 'tcu block'],
    ['href="#main-content"', 'skip link'],
    ['id="main-content"', 'main landmark'],
    ['</html>', 'closing html']
  ];
  for (const [needle, label] of need) {
    if (!h.includes(needle)) problems.push('missing ' + label + ' (' + needle + ')');
  }

  // --- h1 count ---
  const h1s = (h.match(/<h1\b/gi) || []).length;
  if (h1s !== 1) problems.push('h1 count is ' + h1s + ', expected 1');

  // --- forbidden content ---
  if (/wupxq|oaqjpg/.test(h)) problems.push('links a FREE gumroad product (wupxq/oaqjpg)');
  if (/var var\b/.test(h)) problems.push('duplicate var keyword');
  if (h.includes('</script>', h.indexOf('</script>') + 1) && h.includes('application/ld+json')) {
    // multiple script tags are fine; just ensure JSON-LD blocks are balanced
  }
  const ldCount = (h.match(/application\/ld\+json/g) || []).length;
  const ldClose = (h.match(/<\/script>/g) || []).length;
  if (ldCount > ldClose) problems.push('JSON-LD block not closed');

  // --- internal links resolve ---
  const re = /(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  let m;
  const bad = [];
  while ((m = re.exec(h))) {
    const href = m[1];
    if (/^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(href)) continue;
    let clean = href.split('#')[0].split('?')[0];
    if (!clean) continue;
    let target = path.normalize(path.join(path.dirname(t), clean)).replace(/\\/g, '/');
    target = target.replace(/^\.\//, '');
    while (target.startsWith('../')) target = target.slice(3);
    if (target === '' || target === '.') target = path.basename(t);
    if (target.endsWith('/')) {
      if (!real.has(target + 'index.html')) bad.push(href + ' (missing ' + target + 'index.html)');
    } else if (!real.has(target)) {
      bad.push(href + ' (missing ' + target + ')');
    }
  }
  if (bad.length) problems.push('broken internal link(s): ' + bad.join(' | '));

  // --- manifest target exists ---
  const man = h.match(/rel="manifest" href="([^"]+)"/);
  if (man) {
    const mp = path.normalize(path.join(path.dirname(t), man[1])).replace(/\\/g, '/');
    if (!fs.existsSync(mp)) problems.push('manifest target missing: ' + man[1]);
  }

  if (problems.length) {
    failures++;
    console.log('FAIL ' + t);
    for (const p of problems) console.log('     - ' + p);
  } else {
    console.log('PASS ' + t + '  (' + h.length + ' bytes)');
  }
}

console.log('\n' + (failures ? failures + ' PAGE(S) FAILED' : 'ALL PAGES PASSED'));
process.exit(failures ? 1 : 0);

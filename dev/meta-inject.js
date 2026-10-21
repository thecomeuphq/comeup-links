// Inject the social/SEO head layer that is missing across the site:
//
//   1. <meta property="og:image">      -> the share card (currently 0/97)
//   2. <meta property="og:image:width/height/alt>
//   3. <meta name="twitter:image">
//   4. twitter:card  summary  ->  summary_large_image
//   5. <script type="application/ld+json">  WebPage / SoftwareApplication
//
// Rules:
//   - ADDITIVE ONLY. Nothing existing is deleted, replaced or reordered.
//   - IDEMPOTENT. Running it twice changes nothing the second time.
//   - The og:image path is relative to the page, so a page in
//     hourly-pay/18-an-hour/ must point at ../../og/hourly-pay/18-an-hour.png
//
// Usage: node dev/meta-inject.js [--dry]

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://thecomeuphq.github.io/comeup-links';
const DRY = process.argv.includes('--dry');

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

const strip = (s) => (s || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function ogPathFor(f) {
  // hourly-pay/18-an-hour/index.html -> hourly-pay/18-an-hour.png
  return f.replace(/\/index\.html$/, '').replace(/\.html$/, '') + '.png';
}

// The card for a page lives under og/ in the repo, and the og:image url must
// point at og/ as well. An earlier version built the url from the page path
// alone ("/debt-free.png"), so every single share card on the site 404'd.
// og/manifest.json is the source of truth: it maps page -> og/<slug>.png.
function ogRelFor(f) {
  const manifestPath = path.join(ROOT, 'og', 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (manifest[f]) return manifest[f];
    } catch (e) {
      // fall through to the computed path
    }
  }
  return 'og/' + ogPathFor(f);
}

function relativeFrom(f, target) {
  // target is repo-relative like "og/hourly-pay/18-an-hour.png"
  const fromDir = path.posix.dirname(f);
  let rel = path.posix.relative(fromDir, target);
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

// og:image must be an ABSOLUTE url. A relative one like
// "../og/hourly-pay.png" is not resolved by most social scrapers (they do
// not treat the og:image value as a document-relative reference), so the
// card 404s. Always build from the manifest path, never from a relative
// path.join().
function ogAbsUrl(f) {
  return SITE + '/' + ogRelFor(f);
}

// The alt text for the share card. Prefer the page's og:title, drop the
// brand suffix, and never let a stray tag through — an earlier version of
// this file nested a <meta> tag inside the alt attribute.
function ogAltFor(h, title) {
  const ogTitle = strip((h.match(/property=["']og:title["']\s+content=["']([^"']*)["']/i) || [])[1]);
  let alt = ogTitle || title || 'The Come Up';
  alt = alt.replace(/\s*[|\u2013\u2014-]\s*The Come Up\s*$/i, '').trim();
  // A "$" in a title (e.g. "$15 an Hour") must survive untouched. This is
  // an attribute VALUE, never a replacement string, so it is safe here —
  // but the value is scrubbed of quotes and angle brackets so it can never
  // re-open the tag and nest another <meta> inside it.
  alt = alt.replace(/["'<>]/g, '');
  return alt + ' — The Come Up';
}

function isToolPage(h, title) {
  if (/\b(calculator|engine|auditor|quiz|planner|tracker|selector|simulator|shield|protocol|analyzer|estimator|splitter|worksheet|roadmap|guide)\b/i.test(title)) return true;
  if (/<input[^>]+type=["']number/i.test(h)) return true;
  return false;
}

function buildJsonLd(f, h, title, desc, canonical) {
  const url = canonical || SITE + '/' + (f === 'index.html' ? '' : f);
  const isRoot = f === 'index.html';
  const tool = isToolPage(h, title);

  const graph = [];

  const crumb = [];
  const segs = f.split('/');
  let acc = '';
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s === 'index.html') break;
    acc += (acc ? '/' : '') + s;
    const name = s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    crumb.push({
      '@type': 'ListItem',
      position: crumb.length + 1,
      name: s === 'index.html' ? 'Home' : name,
      item: SITE + '/' + (acc ? acc + (s === 'index.html' ? '' : '') : ''),
    });
  }
  // fix item urls for index.html entries
  for (const c of crumb) {
    if (!c.item.endsWith('/') && !/\.[a-z]+$/.test(c.item)) c.item += '/';
  }

  if (tool) {
    graph.push({
      '@type': 'SoftwareApplication',
      name: title,
      description: desc,
      url,
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    });
  } else {
    graph.push({
      '@type': isRoot ? 'WebSite' : 'WebPage',
      name: title,
      description: desc,
      url,
      isPartOf: { '@type': 'WebSite', name: 'The Come Up', url: SITE + '/' },
    });
  }

  if (crumb.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: crumb.map((c, i) => ({ ...c, position: i + 1 })),
    });
  }

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 0);
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
const files = walk(ROOT).sort();
let changed = 0;
const log = [];

for (const f of files) {
  const abs = path.join(ROOT, f);
  let h = fs.readFileSync(abs, 'utf8');
  const before = h;

  const title = strip((h.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]);
  const desc = strip((h.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || [])[1]);
  const canonical = (h.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i) || [])[1] || '';
  const ogUrl = (h.match(/property=["']og:url["']\s+content=["']([^"']*)["']/i) || [])[1] || '';

  const ogAbs = ogAbsUrl(f);

  // --- 1-3. og:image (+ width/height/alt) and twitter:image ---------------
  //
  // This block must be able to REPAIR a broken head, not just add a missing
  // one. An earlier version of this file interpolated the block into a
  // '$1\n' replacement string, so any "$" in a title (e.g. "$15 an Hour")
  // was treated as a capture-group reference. That produced a corrupt
  // og:image:alt attribute with a nested <meta> tag, and a relative
  // og:image url that social scrapers cannot resolve.
  const ogImgRe = /<meta\s+property=["']og:image["']\s+content=["'][^"']*["']\s*\/?>/i;
  const existingAltRe = /<meta\s+property=["']og:image:alt["']\s+content=["'][^"']*["']\s*\/?>/i;
  const existingTwImgRe = /<meta\s+name=["']twitter:image["']\s+content=["'][^"']*["']\s*\/?>/i;
  const existingWRe = /<meta\s+property=["']og:image:width["']\s+content=["'][^"']*["']\s*\/?>/i;
  const existingHRe = /<meta\s+property=["']og:image:height["']\s+content=["'][^"']*["']\s*\/?>/i;

  // Remove a meta tag by NAME, robustly.
  //
  // A plain regex like /<meta property="og:image:alt" content="[^"]*">/ cannot
  // match a CORRUPT tag whose content attribute contains quotes of its own
  // (the "$1 replacement" bug produced content="<meta property="og:description"
  // content="...">). The naive pattern stops at the first inner quote and
  // leaves the rest of the broken tag behind as visible text.
  //
  // So: if the line that holds the tag also holds a SECOND <meta, the tag is
  // corrupt and the whole line goes. Otherwise the tag is well-formed and the
  // strict regex is safe.
  function removeMetaByName(src, name) {
    const lines = src.split('\n');
    const kept = [];
    for (const line of lines) {
      const hasTag = name === 'og:image'
        ? /<meta\s+property=["']og:image["']/i.test(line)
        : name === 'og:image:alt'
          ? /<meta\s+property=["']og:image:alt["']/i.test(line)
          : name === 'og:image:width'
            ? /<meta\s+property=["']og:image:width["']/i.test(line)
            : name === 'og:image:height'
              ? /<meta\s+property=["']og:image:height["']/i.test(line)
              : /<meta\s+name=["']twitter:image["']/i.test(line);
      if (!hasTag) { kept.push(line); continue; }

      // Count how many <meta tags this line opens. More than one means the
      // line is corrupt (a nested tag got spliced into an attribute value).
      const opens = (line.match(/<meta\b/gi) || []).length;
      if (opens > 1) continue;          // drop the whole corrupt line
      // Drop the line entirely when the tag IS the whole line. Keeping an
      // empty string instead stacked 5 blank lines into every <head> (one
      // per removed tag) and they accumulated on every re-run.
      if (/^\s*<meta\b[^>]*>\s*$/.test(line)) continue;
      kept.push(line.replace(/<meta\b[^>]*>/i, ''));
    }
    return kept.join('\n');
  }

  const ogImgOk = ogImgRe.test(h) && h.match(ogImgRe)[0].includes(ogAbs);
  //
  // The alt tag is CORRUPT when a second <meta was spliced into its
  // content attribute - that is what the old "$1 replacement" bug did.
  // Detect that by counting the <meta opens in the matched tag: a healthy
  // tag has exactly one, a corrupt tag has two or more.
  //
  // The previous check tested the matched tag for '<meta', but the tag
  // ALWAYS starts with '<meta', so it was always false. That made the
  // injector rewrite all 98 pages on every single run.
  const altTag = h.match(/<meta\s+property=["']og:image:alt["'][^>]*>/i);
  const altOk = !!altTag && (altTag[0].match(/<meta\b/gi) || []).length === 1;
  const twOk = existingTwImgRe.test(h) && h.match(existingTwImgRe)[0].includes(ogAbs);
  const wOk = existingWRe.test(h);
  const hOk = existingHRe.test(h);

  if (!ogImgOk || !altOk || !twOk || !wOk || !hOk) {
    const alt = ogAltFor(h, title);
    const block = [
      `<meta property="og:image" content="${escAttr(ogAbs)}">`,
      `<meta property="og:image:width" content="1200">`,
      `<meta property="og:image:height" content="630">`,
      `<meta property="og:image:alt" content="${escAttr(alt)}">`,
      `<meta name="twitter:image" content="${escAttr(ogAbs)}">`,
    ].join('\n');

    // Remove every existing copy of the tags we are about to write, so the
    // repair is idempotent and never leaves a stale or corrupt duplicate.
    h = removeMetaByName(h, 'og:image:width');
    h = removeMetaByName(h, 'og:image:height');
    h = removeMetaByName(h, 'og:image:alt');
    h = removeMetaByName(h, 'twitter:image');
    h = removeMetaByName(h, 'og:image');

    // insert right after the og:description line so the og block stays together
    //
    // NOTE: the replacement must be a FUNCTION. If the block were interpolated
    // into a '$1\n' + block string, any "$" inside the block (e.g. "$15 an
    // Hour") would be read as a capture-group reference and the tag would be
    // mangled. Using a replacer function returns the matched text verbatim.
    if (/<meta\s+property=["']og:description["'][^>]*>/i.test(h)) {
      h = h.replace(/(<meta\s+property=["']og:description["'][^>]*>)/i, (m) => m + '\n' + block);
    } else if (/<meta\s+property=["']og:url["'][^>]*>/i.test(h)) {
      h = h.replace(/(<meta\s+property=["']og:url["'][^>]*>)/i, (m) => m + '\n' + block);
    } else {
      const end = h.search(/<\/head>/i);
      h = h.slice(0, end) + block + '\n' + h.slice(end);
    }
    log.push((ogImgOk ? 'og:repair' : 'og:image  ') + ' -> ' + f);
  }

  // --- 3b. collapse blank-line runs inside <head> ------------------------
  //
  // An earlier version of removeMetaByName() replaced a removed meta tag
  // with an EMPTY LINE instead of dropping the line, so every page piled up
  // a stack of blank lines in <head> (5 per run, and they grew on re-runs).
  // This collapses any run of blank lines inside <head> to a single one.
  {
    const headEnd = h.search(/<\/head>/i);
    if (headEnd !== -1) {
      const head = h.slice(0, headEnd);
      const rest = h.slice(headEnd);
      const clean = head.replace(/(?:[ \t]*\r?\n){2,}/g, '\n');
      h = clean + rest;
    }
  }
  // --- 4. twitter:card summary -> summary_large_image --------------------
  h = h.replace(/<meta\s+name=["']twitter:card["']\s+content=["']summary["']\s*\/?>/i,
    '<meta name="twitter:card" content="summary_large_image">');

  // --- 5. JSON-LD ---------------------------------------------------------
  if (!/<script[^>]*type=["']application\/ld\+json["']/i.test(h)) {
    const ld = buildJsonLd(f, h, title, desc, canonical || ogUrl);
    const block = `<script type="application/ld+json">${ld}</script>`;
    const end = h.search(/<\/head>/i);
    if (end !== -1) {
      h = h.slice(0, end) + block + '\n' + h.slice(end);
      log.push('json-ld   -> ' + f);
    }
  }

  if (h !== before) {
    changed++;
    if (!DRY) fs.writeFileSync(abs, h, 'utf8');
  }
}

console.log((DRY ? '[dry] ' : '') + 'pages changed: ' + changed + ' / ' + files.length);
if (DRY) {
  console.log('\n--- would change ---');
  log.forEach((l) => console.log('  ' + l));
}

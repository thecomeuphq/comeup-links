// Generate one 1200x630 Open Graph card per page.
//
//   node dev/og-image.js            generate cards for every page
//   node dev/og-image.js --only x   generate for one page
//
// Design tokens are lifted from gen/base.js so the card matches the site:
//   bg #141414, surface #1f1f1f, text #f5f5f5, muted #bdbdbd, amber #f5a623
//
// Output: og/<slug>.png  (og:image path referenced from every <head>)
// Renders with @resvg/resvg-js — no browser needed, no network needed.

const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://thecomeuphq.github.io/comeup-links';
const OUT = path.join(ROOT, 'og');

const C = {
  bg: '#141414',
  surface: '#1f1f1f',
  text: '#f5f5f5',
  muted: '#bdbdbd',
  amber: '#f5a623',
  dim: '#858585',
};

const FONTS = {
  fontFiles: [
    'C:/Windows/Fonts/segoeui.ttf',
    'C:/Windows/Fonts/segoeuib.ttf',
    'C:/Windows/Fonts/seguisb.ttf',
  ],
  loadSystemFonts: true,
  defaultFontFamily: 'Segoe UI',
};

// ---------------------------------------------------------------------------
// page discovery
// ---------------------------------------------------------------------------
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

function readPage(f) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const title = strip((h.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]);
  const desc = strip((h.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || [])[1]);
  const ogTitle = strip((h.match(/property=["']og:title["']\s+content=["']([^"']*)["']/i) || [])[1]);
  const h1 = strip((h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]);
  return { f, title, desc, ogTitle, h1 };
}

// The card headline: prefer the page's own og:title, then h1, then title.
// Titles often end in "| The Come Up" — that suffix is the brand line and
// belongs at the bottom of the card, not in the headline.
function headline(p) {
  let t = p.ogTitle || p.h1 || p.title || 'The Come Up';
  t = t.replace(/\s*[|\u2013\u2014-]\s*The Come Up\s*$/i, '').trim();
  return t || 'The Come Up';
}

function subline(p) {
  const d = p.desc || '';
  return d.replace(/\s*[|\u2013\u2014-]\s*The Come Up\s*$/i, '').trim();
}

// ---------------------------------------------------------------------------
// svg helpers
// ---------------------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Wrap text to a max character width, breaking on spaces.
function wrap(text, max) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    if (!line.length) { line = w; continue; }
    if ((line + ' ' + w).length <= max) { line += ' ' + w; }
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}

function tspanBlock(lines, x, startY, lh, attrs) {
  return lines.map((l, i) =>
    `<text x="${x}" y="${startY + i * lh}" ${attrs}>${esc(l)}</text>`
  ).join('\n  ');
}

// A rough "does this fit" check so we can shrink the headline rather than
// overflow the 1200px card.
function fitSize(text, maxChars, start, min) {
  for (let s = start; s >= min; s -= 2) {
    if (Math.ceil(text.length / (maxChars * (s / start))) <= 3) return s;
  }
  return min;
}

function cardSvg(p) {
  const hl = headline(p);
  const sub = subline(p);

  const maxW = 1040;
  const hlSize = fitSize(hl, 26, 64, 38);
  const hlLines = wrap(hl, Math.round(26 * (hlSize / 64)));
  const usedLines = hlLines.slice(0, 3);
  const truncated = hlLines.length > 3;

  const subLines = sub ? wrap(sub, 78).slice(0, 2) : [];

  // Vertical layout
  const topY = 148;
  const hlY = topY + hlSize;
  const subY = hlY + usedLines.length * (hlSize * 1.12) + 34;

  const titleAttr = `font-family="Segoe UI" font-size="${hlSize}" font-weight="800" fill="${C.text}" letter-spacing="-1.5"`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#181818"/>
      <stop offset="55%" stop-color="#141414"/>
      <stop offset="100%" stop-color="#1c1913"/>
    </linearGradient>
    <linearGradient id="amberbar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.amber}"/>
      <stop offset="70%" stop-color="#c8801a"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="10" fill="url(#amberbar)"/>

  <!-- eyebrow -->
  <rect x="80" y="86" width="46" height="4" rx="2" fill="${C.amber}"/>
  <text x="142" y="98" font-family="Segoe UI" font-size="19" font-weight="800" fill="${C.amber}" letter-spacing="3.4">FREE MONEY TOOL</text>

  <!-- headline -->
  ${tspanBlock(usedLines, 80, hlY, Math.round(hlSize * 1.12), titleAttr)}
  ${truncated ? `<text x="80" y="${hlY + 3 * Math.round(hlSize * 1.12)}" font-family="Segoe UI" font-size="${hlSize}" font-weight="800" fill="${C.text}">…</text>` : ''}

  <!-- subline -->
  ${subLines.length ? tspanBlock(subLines, 80, subY, 38, `font-family="Segoe UI" font-size="27" font-weight="400" fill="${C.muted}"`) : ''}

  <!-- brand footer -->
  <line x1="80" y1="520" x2="1120" y2="520" stroke="#333333" stroke-width="1.5"/>
  <circle cx="100" cy="566" r="19" fill="${C.amber}" fill-opacity="0.14" stroke="${C.amber}" stroke-width="2"/>
  <text x="100" y="574" text-anchor="middle" font-family="Segoe UI" font-size="19" font-weight="800" fill="${C.amber}">C</text>
  <text x="134" y="574" font-family="Segoe UI" font-size="25" font-weight="800" fill="${C.text}">The Come Up</text>
  <text x="1120" y="574" text-anchor="end" font-family="Segoe UI" font-size="21" font-weight="600" fill="${C.dim}">thecomeuphq.github.io</text>
</svg>`;
}

function render(svg) {
  const r = new Resvg(svg, { font: FONTS, fitTo: { mode: 'width', value: 1200 } });
  return r.render().asPng();
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
const onlyArg = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1] || '';

function ogPathFor(f) {
  // hourly-pay/18-an-hour/index.html -> hourly-pay/18-an-hour.png
  const base = f.replace(/\/index\.html$/, '').replace(/\.html$/, '');
  return base + '.png';
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const all = walk(ROOT).sort();
  const pages = (onlyArg ? all.filter((f) => f.includes(onlyArg)) : all).map(readPage);

  let made = 0;
  for (const p of pages) {
    const png = render(cardSvg(p));
    const rel = ogPathFor(p.f);
    const dest = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, png);
    made++;
  }

  console.log('generated ' + made + ' OG card(s) into og/');
  if (!onlyArg) {
    // a manifest so the injector knows exactly which file belongs to which page
    const manifest = {};
    for (const p of pages) manifest[p.f] = 'og/' + ogPathFor(p.f);
    fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log('manifest: og/manifest.json');
  }
}

main();

// Add the "Copy my result" share control to the pages that are missing it.
//
// 14 pages already carry the .tcu-share-b CSS and the .tcu block with its
// CTA, but never got the button or the script. This inserts both, using
// the exact markup and the exact script that the other 84 pages use, so
// behaviour is identical site-wide.
//
// Idempotent: a page that already has a .tcu-share-b button is skipped.

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const shareGen = require(path.join(ROOT, 'gen', 'share.js'));

const DRY = process.argv.includes('--dry');

// The page -> the line it introduces itself with.
const INTROS = {
  '404.html': 'I found a tool on The Come Up:',
  'bundle.html': 'I am buying The Come Up bundle:',
  'catalog.html': 'I am shopping The Come Up:',
  'compare.html': 'I compared The Come Up tools:',
  'dashboard.html': 'My money dashboard from The Come Up:',
  'faq.html': 'I asked The Come Up:',
  'favorites.html': 'My saved tools on The Come Up:',
  'free-vs-paid.html': 'I compared free vs paid on The Come Up:',
  'guides.html': 'I am working through a The Come Up guide:',
  'payday-ritual.html': 'I ran my payday ritual from The Come Up:',
  'plan-link.html': 'I made a plan with The Come Up:',
  'printables.html': 'I am using The Come Up printables:',
  'problems.html': 'I found my problem on The Come Up:',
  'waitlist.html': 'I joined The Come Up:',
};

const BUTTON_HTML = `        <div class="tcu-share">
          <button class="tcu-share-b" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 0 0 1-2-2V4a2 0 0 1 2-2h9a2 0 0 1 2 2v1"/></svg>
            Copy my result
          </button>
          <span class="tcu-share-n" role="status" aria-live="polite"></span>
        </div>
`;

// The .tcu-cta div is the anchor we insert the share block BEFORE, so the
// order on the page matches the 84 pages that already have it.
function insertButton(h) {
  const ctaRe = /([ \t]*)<div class="tcu-cta">/;
  const m = h.match(ctaRe);
  if (!m) return null;
  const indent = m[1];
  const at = h.indexOf(m[0]);
  const block = BUTTON_HTML.split('\n').map((l) => (l ? indent + l.trim() : l)).join('\n');
  return h.slice(0, at) + block + '\n' + h.slice(at);
}

function appendScript(h, pagePath, intro) {
  const script = shareGen.build({ pagePath, intro, fields: null });
  const bodyEnd = h.lastIndexOf('</body>');
  if (bodyEnd === -1) return null;
  const block = `\n    <script>\n${script
    .split('\n')
    .map((l) => (l ? '    ' + l : l))
    .join('\n')}\n    </script>\n`;
  return h.slice(0, bodyEnd) + block + h.slice(bodyEnd);
}

let changed = 0;
const log = [];

for (const [page, intro] of Object.entries(INTROS)) {
  const abs = path.join(ROOT, page);
  if (!fs.existsSync(abs)) { log.push('MISSING  ' + page); continue; }
  let h = fs.readFileSync(abs, 'utf8');
  const before = h;

  if (/class=["'][^"']*tcu-share-b/i.test(h)) {
    log.push('skip     ' + page + ' (button already present)');
    continue;
  }
  if (!/\.tcu-share-b\s*\{/.test(h)) {
    log.push('SKIP-CSS ' + page + ' (no .tcu-share-b CSS on page)');
    continue;
  }

  const withBtn = insertButton(h);
  if (!withBtn) { log.push('NO-CTA   ' + page + ' (no .tcu-cta div to anchor to)'); continue; }
  h = withBtn;

  const withScript = appendScript(h, page, intro);
  if (!withScript) { log.push('NO-BODY  ' + page); continue; }
  h = withScript;

  if (h !== before) {
    changed++;
    log.push('FIXED    ' + page);
    if (!DRY) fs.writeFileSync(abs, h, 'utf8');
  }
}

console.log((DRY ? '[dry] ' : '') + 'pages fixed: ' + changed + ' / ' + Object.keys(INTROS).length);
log.forEach((l) => console.log('  ' + l));

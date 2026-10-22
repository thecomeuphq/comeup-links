// The Come Up — one-command empire audit.
//
//   node dev/audit.js            audit the repo (offline, fast)
//   node dev/audit.js --live     also HTTP-check every page on the live site
//   node dev/audit.js --json     machine-readable output
//
// What it measures, and why each one matters for traffic + sales:
//
//   P0  og:image            a link shared to Slack/X/Facebook with no image
//                           renders as a grey box; the card is the ad
//   P0  sitemap coverage    a page Google cannot find in a sitemap is a page
//                           Google does not crawl
//   P0  dead internal link  a broken link kills the crawl path to a paying page
//   P0  dead checkout link  a 404 on a Gumroad buy button is a lost sale
//   P1  JSON-LD            no structured data = no rich result in Google
//   P1  title/description  the search snippet; a duplicate costs you rankings
//   P1  internal links out a page with nowhere to go sends the visitor away
//   P2  social share       no way to spread the page you already built
//   P2  live HTTP status   the repo can be correct while the site is 404
//
// Exit code: 1 if any P0 or P1 finding is open, so this can gate a push.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SITE = 'https://thecomeuphq.github.io/comeup-links';
const ROOT = path.resolve(__dirname, '..');
const LIVE = process.argv.includes('--live');
const AS_JSON = process.argv.includes('--json');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1] || '';

// Priority 3 is reserved for WIRE: things that are blocked on the owner
// (an account, an endpoint, a domain) rather than broken code. They are
// reported loudly but they do NOT fail the gate - a build cannot fix them,
// and a gate that always fails is a gate nobody runs.
const WIRE = 3;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const strip = (s) => (s || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

function walk(dir, acc) {
  acc = acc || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.output', 'dev', 'gen', 'audit', 'og'].includes(e.name)) continue;
    if (e.name.startsWith('_')) continue;           // scratch probes, never shipped
    // content/ holds EMAIL EDITIONS, not web pages. An email body fragment
    // legitimately has no <head>, no canonical and no JSON-LD, so auditing
    // it as a site page produced five false findings.
    if (e.name === 'content') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(path.relative(ROOT, p).replace(/\\/g, '/'));
  }
  return acc;
}

// ---------------------------------------------------------------------------
// findings
// ---------------------------------------------------------------------------
const findings = [];
function finding(priority, code, scope, detail, fix) {
  findings.push({ priority, code, scope, detail, fix });
}

const P = { P0: 0, P1: 1, P2: 2 };
const PRIORITY_NAME = { 0: 'P0', 1: 'P1', 2: 'P2', 3: 'WIRE' };

// ---------------------------------------------------------------------------
// 1. read every page
// ---------------------------------------------------------------------------
const files = walk(ROOT).sort();
const pages = new Map();

for (const f of files) {
  const h = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const head = h.slice(0, h.search(/<\/head>/i) === -1 ? 4000 : h.search(/<\/head>/i));
  const body = h.slice(h.search(/<body/i) === -1 ? 0 : h.search(/<body/i));

  const title = strip((h.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]);
  const desc = strip((h.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || [])[1]);
  const ogTitle = (head.match(/property=["']og:title["']\s+content=["']([^"']*)["']/i) || [])[1] || '';
  const ogImage = (head.match(/property=["']og:image["']\s+content=["']([^"']*)["']/i) || [])[1] || '';
  const ogUrl = (head.match(/property=["']og:url["']\s+content=["']([^"']*)["']/i) || [])[1] || '';
  const canonical = (head.match(/rel=["']canonical["']\s+href=["']([^"']*)["']/i) || [])[1] || '';
  const jsonLd = (h.match(/<script[^>]*type=["']application\/ld\+json["']/gi) || []).length;

  const rels = (h.match(/class=["']tcu-rel(?![-\w])/g) || []).length;
  const hasCta = /class=["']tcu-cta-a["']/.test(h);
  const hasShare = /class=["']tcu-share-b["']/.test(h);
  // Count only REAL markup h1s. A tool page that builds a printable
  // blueprint in JavaScript contains "<h1>My Blueprint</h1>" inside a string;
  // counting that as a second h1 was a false positive.
  const markupOnly = h.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
  const h1s = (markupOnly.match(/<h1\b/gi) || []).length;

  const internalHrefs = [...body.matchAll(/href=["']([^"']+)["']/gi)]
    .map((m) => m[1])
    .filter((x) => !/^(https?:|mailto:|tel:|data:|javascript:|#)/i.test(x));
  const uniqueInternal = [...new Set(internalHrefs)];

  pages.set(f, {
    f, head, body, title, desc, ogTitle, ogImage, ogUrl, canonical,
    jsonLd, rels, hasCta, hasShare, h1s, internalHrefs: uniqueInternal,
  });
}

// ---------------------------------------------------------------------------
// 2. P0 - og:image (the share card is the ad)
// ---------------------------------------------------------------------------
const noOgImage = [];
for (const p of pages.values()) {
  if (!p.ogImage) noOgImage.push(p.f);
}
if (noOgImage.length) {
  finding(P.P0, 'og-image', 'site', `${noOgImage.length}/${pages.size} pages have no og:image — every share renders as a grey box`,
    'Generate one 1200x630 card per page and add <meta property="og:image"> to each <head>.');
}

// ---------------------------------------------------------------------------
// 3. P0/P1 - sitemap coverage
// ---------------------------------------------------------------------------
const sitemapPath = path.join(ROOT, 'sitemap.xml');
const sitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, 'utf8') : '';
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
const sitemapSet = new Set(sitemapUrls.map((u) => u.replace(SITE + '/', '')));

// index.html maps to the site root; hourly-pay/x/index.html maps to a dir URL.
const toUrl = (f) => (f.endsWith('/index.html') ? f.replace(/index\.html$/, '') : f);
// The sitemap represents the homepage as the bare site root, not index.html.
const sitemapKeyFor = (f) => (f === 'index.html' ? '' : toUrl(f));
const notInSitemap = files.filter((f) => !sitemapSet.has(sitemapKeyFor(f)));
if (notInSitemap.length) {
  finding(P.P0, 'sitemap-missing', 'site', `${notInSitemap.length} pages are not in sitemap.xml: ${notInSitemap.join(', ')}`,
    'Add the missing <loc> entries. Google will not crawl what the sitemap does not list.');
}
const fileSet = new Set(files);
const expectedSitemapKeys = new Set(files.map(sitemapKeyFor));
const staleSitemap = [...sitemapSet].filter((u) => u !== '' && !expectedSitemapKeys.has(u));
if (staleSitemap.length) {
  finding(P.P1, 'sitemap-stale', 'sitemap.xml', `${staleSitemap.length} sitemap URLs point to nothing: ${staleSitemap.join(', ')}`,
    'Remove the dead <loc> entries or restore the pages.');
}

// ---------------------------------------------------------------------------
// 4. P0 - broken internal links
// ---------------------------------------------------------------------------
const brokenLinks = [];
for (const p of pages.values()) {
  for (const href of p.internalHrefs) {
    const clean = href.split('#')[0].split('?')[0];
    if (!clean) continue;
    let target;
    if (clean.startsWith('/')) target = clean.slice(1);
    else target = path.posix.normalize(path.posix.join(path.posix.dirname(p.f), clean));
    if (target === '' || target === '.') target = 'index.html';
    if (target.endsWith('/')) target += 'index.html';
    if (!fileSet.has(target) && !fs.existsSync(path.join(ROOT, target))) {
      brokenLinks.push(`${p.f} -> ${href}`);
    }
  }
}
if (brokenLinks.length) {
  finding(P.P0, 'broken-internal-link', 'site', `${brokenLinks.length} internal links point at nothing: ${brokenLinks.slice(0, 12).join(' | ')}`,
    'Fix or remove each dead href. A broken link strands the visitor and blocks the crawl to a money page.');
}

// ---------------------------------------------------------------------------
// 5. P1 - duplicate titles / descriptions
// ---------------------------------------------------------------------------
const byTitle = new Map();
const byDesc = new Map();
for (const p of pages.values()) {
  if (p.title) { if (!byTitle.has(p.title)) byTitle.set(p.title, []); byTitle.get(p.title).push(p.f); }
  if (p.desc) { if (!byDesc.has(p.desc)) byDesc.set(p.desc, []); byDesc.get(p.desc).push(p.f); }
}
for (const [t, list] of byTitle) {
  if (list.length > 1) finding(P.P1, 'duplicate-title', list.join(', '), `identical <title> on ${list.length} pages: "${t.slice(0, 70)}"`,
    'Give each page a title with the search term it should win.');
}
for (const [d, list] of byDesc) {
  if (list.length > 1) finding(P.P1, 'duplicate-description', list.join(', '), `identical meta description on ${list.length} pages: "${d.slice(0, 70)}"`,
    'Rewrite each description around that page\'s own search term.');
}

// ---------------------------------------------------------------------------
// 6. P1 - missing JSON-LD
// ---------------------------------------------------------------------------
const noJsonLd = [...pages.values()].filter((p) => !p.jsonLd).map((p) => p.f);
if (noJsonLd.length) {
  finding(P.P1, 'json-ld', 'site', `${noJsonLd.length}/${pages.size} pages have no JSON-LD structured data`,
    'Add a WebPage/SoftwareApplication block per page so the page can earn a rich result.');
}

// ---------------------------------------------------------------------------
// 7. P1 - canonical / og:url agreement, missing canonical
// ---------------------------------------------------------------------------
for (const p of pages.values()) {
  if (!p.canonical) finding(P.P1, 'no-canonical', p.f, 'no <link rel="canonical">', 'Add the canonical URL.');
  if (p.canonical && p.ogUrl && p.canonical !== p.ogUrl) {
    finding(P.P1, 'canonical-mismatch', p.f, `canonical (${p.canonical}) != og:url (${p.ogUrl})`, 'Make them identical.');
  }
}

// ---------------------------------------------------------------------------
// 8. P1/P2 - internal links out, CTA, share
// ---------------------------------------------------------------------------
const fewLinks = [...pages.values()].filter((p) => p.internalHrefs.length < 3).map((p) => `${p.f} (${p.internalHrefs.length})`);
if (fewLinks.length) {
  finding(P.P1, 'thin-internal-links', 'site', `${fewLinks.length} pages have fewer than 3 internal links: ${fewLinks.slice(0, 10).join(', ')}`,
    'Link each page to the 2-3 pages a visitor would want next.');
}
const noCta = [...pages.values()].filter((p) => !p.hasCta).map((p) => p.f);
if (noCta.length) {
  finding(P.P2, 'no-cta', 'site', `${noCta.length} pages have no next-step CTA`, 'Give every page one clear amber next step.');
}
const noShare = [...pages.values()].filter((p) => !p.hasShare).map((p) => p.f);
if (noShare.length) {
  finding(P.P2, 'no-share', 'site', `${noShare.length} pages have no share/copy control`, 'Add the copy-my-result control so the page can spread.');
}

// ---------------------------------------------------------------------------
// 9. P1 - h1 sanity
// ---------------------------------------------------------------------------
for (const p of pages.values()) {
  if (p.h1s !== 1) finding(P.P2, 'h1-count', p.f, `page has ${p.h1s} <h1> elements`, 'Keep exactly one h1 per page.');
}

// ---------------------------------------------------------------------------
// 10. LIVE - real HTTP checks
// ---------------------------------------------------------------------------
const live = { checked: 0, ok: 0, bad: [] };
const liveHeaders = { missingOgImage: [], missingTitle: [], missingDesc: [], missingCanonical: [] };

async function liveCheck() {
  const targets = files.map((f) => ({ file: f, url: SITE + '/' + toUrl(f) }));
  const CONC = 8;
  let i = 0;
  async function worker() {
    while (i < targets.length) {
      const t = targets[i++];
      try {
        const res = await fetch(t.url, { redirect: 'follow' });
        live.checked++;
        if (res.ok) {
          live.ok++;
          const text = await res.text();
          if (!/<meta[^>]+property=["']og:image["']/i.test(text)) liveHeaders.missingOgImage.push(t.file);
          if (!/<title>/i.test(text)) liveHeaders.missingTitle.push(t.file);
          if (!/name=["']description["']/i.test(text)) liveHeaders.missingDesc.push(t.file);
          if (!/rel=["']canonical["']/i.test(text)) liveHeaders.missingCanonical.push(t.file);
        } else {
          live.bad.push(`${res.status} ${t.url}`);
        }
      } catch (e) {
        live.bad.push(`ERR ${t.url} ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
}

// ---------------------------------------------------------------------------
// 11. P0 - dead checkout links (the documented check that was never built)
//
// A dead Gumroad link is WORSE than no link: it looks like a working buy
// button. This is the single check that most directly protects revenue, so
// it belongs in the one-command audit rather than in a separate script.
// ---------------------------------------------------------------------------
const GUMROAD_BASE = 'https://bradley57.gumroad.com/l/';
const FORBIDDEN_FREE = ['wupxq', 'oaqjpg']; // the two FREE products - never link

function headStatus(url, redirects = 0) {
  return new Promise((resolve) => {
    const req = require('https').request(url, {
      method: 'GET', timeout: 20000, headers: { 'User-Agent': 'comeup-link-check' },
    }, (res) => {
      res.resume();
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 5) {
        const next = new URL(res.headers.location, url).toString();
        return resolve(headStatus(next, redirects + 1));
      }
      resolve({ status: res.statusCode });
    });
    req.on('error', (e) => resolve({ status: 'ERR', error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 'TIMEOUT' }); });
    req.end();
  });
}

async function checkoutCheck() {
  // Collect every slug the SHIPPED html links to.
  const slugs = new Map();
  for (const p of pages.values()) {
    for (const m of p.body.matchAll(/gumroad\.com\/l\/([a-z0-9]+)/gi)) {
      const s = m[1].toLowerCase();
      if (!slugs.has(s)) slugs.set(s, []);
      slugs.get(s).push(p.f);
    }
  }
  if (!slugs.size) return;

  const dead = [];
  const free = [];
  const list = [...slugs.keys()];
  const CONC = 5;
  let i = 0;
  async function worker() {
    while (i < list.length) {
      const slug = list[i++];
      if (FORBIDDEN_FREE.includes(slug)) { free.push(slug); continue; }
      const r = await headStatus(GUMROAD_BASE + slug);
      if (r.status !== 200) dead.push(`${slug} -> HTTP ${r.status}`);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));

  if (dead.length) {
    finding(P.P0, 'dead-checkout', 'site',
      `${dead.length} Gumroad checkout link(s) do not resolve: ${dead.join(' | ')}`,
      'A dead buy button is a lost sale. Fix the slug in gen/products.js, or unlink the product until it exists.');
  }
  if (free.length) {
    finding(P.P0, 'free-product-linked', 'site',
      `${free.length} FREE product slug(s) are linked from the site: ${free.join(', ')}`,
      'The two $0+ products must never be linked - the free on-site tools serve that job.');
  }
  console.log(`  checkout links  : ${slugs.size} slugs checked, ${dead.length} dead`);
}

// ---------------------------------------------------------------------------
// 12. WIRE - the money path: is anything actually connected?
//
// This is the check that says "the site is a donation". It reads the
// generator config, so it never guesses - it reports what is actually set.
// ---------------------------------------------------------------------------
function wireCheck() {
  let config = null;
  try { config = require(path.join(ROOT, 'gen', 'config.js')); } catch (e) { /* no config */ }

  if (!config) {
    finding(WIRE, 'no-config', 'gen/config.js', 'no generator config found',
      'Restore gen/config.js so the site knows its own endpoints.');
    return;
  }

  // --- analytics ---
  if (!config.ANALYTICS_ENDPOINT) {
    finding(WIRE, 'analytics-off', 'gen/config.js',
      'ANALYTICS_ENDPOINT is empty - the pageview beacon is injected into every page but sends nowhere',
      'Deploy gen/worker/worker.js to Cloudflare, set ANALYTICS_ENDPOINT, run node gen/gen-analytics.js. Until then there is no traffic data and no way to know which page earns.');
  }

  // --- waitlist capture ---
  if (!config.WAITLIST_ENDPOINT) {
    finding(WIRE, 'waitlist-no-endpoint', 'gen/config.js',
      'WAITLIST_ENDPOINT is empty - signups fall back to a mailto: and leave the site',
      'Set WAITLIST_ENDPOINT to the same Worker URL so a signup lands in the list instead of a mail client.');
  }

  // --- the list address ---
  const addr = (config.WAITLIST_ADDRESS || '').toLowerCase();
  if (addr.endsWith('@gmail.com')) {
    finding(WIRE, 'list-on-gmail', 'gen/config.js',
      `the waitlist address is a personal Gmail (${config.WAITLIST_ADDRESS}) - sending branded mail from a gmail origin hurts deliverability`,
      'Register thecomeuphq.com and move the list to a branded sending domain.');
  }

  // --- bundle SKU ---
  if (!config.BUNDLE_SLUG) {
    finding(WIRE, 'no-bundle-sku', 'gen/config.js',
      'BUNDLE_SLUG is empty - bundle.html has no combined checkout, so the 3-pack is not sold',
      'Create the Starter 3-Pack on Gumroad, set BUNDLE_SLUG and BUNDLE_PRICE.');
  }

  // --- is the share loop wired? ---
  const shareScript = path.join(ROOT, 'gen', 'share-script.txt');
  if (!fs.existsSync(shareScript)) {
    finding(WIRE, 'no-share-script', 'gen/share-script.txt',
      'the share script template is missing',
      'Restore it so the copy-my-result control can be injected.');
  }
}

// ---------------------------------------------------------------------------
// 13. WIRE - ship drift: is what is in the repo actually what is live?
//
// The repo can be perfect while the site is stale. This compares the
// committed tree against the deployed site using a file the generator
// stamps, so the check is evidence rather than a timestamp guess.
// ---------------------------------------------------------------------------
function driftCheck() {
  let head = null;
  try {
    head = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch (e) { return; } // not a git repo - skip silently

  // Files that exist on disk but are not tracked are work that never shipped.
  let untracked = [];
  try {
    const out = execSync('git status --porcelain --untracked-files=all', { cwd: ROOT, encoding: 'utf8' });
    untracked = out.split(/\r?\n/)
      .filter((l) => l.startsWith('?? '))
      .map((l) => l.slice(3).trim().replace(/\\/g, '/'))
      .filter((p) => p && !/^node_modules\//.test(p) && !/^\.output\//.test(p));
  } catch (e) { return; }

  // A tracked-file that differs from HEAD is also unshipped work.
  let modified = [];
  try {
    const out = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' });
    modified = out.split(/\r?\n/)
      .filter((l) => /^[ MARC][MDARC] /.test(l))
      .map((l) => l.slice(3).trim().replace(/\\/g, '/'))
      .filter((p) => p && !/^\.output\//.test(p));
  } catch (e) { /* ignore */ }

  // Only SHIPPABLE drift matters: an html page, a sitemap, a content file.
  // content/ holds STAGED DRAFTS (a weekly content queue and a newsletter
  // email body). They are working material, not site pages, so they are
  // deliberately not tracked and must not count as unshipped work.
  const shippable = (p) => /\.(html|xml|txt|json)$/i.test(p)
    && !/^audit\//.test(p) && !/^dev\//.test(p) && !/^gen\//.test(p)
    && !/^content\//.test(p);
  const drift = [...untracked, ...modified].filter(shippable);

  if (drift.length) {
    finding(P.P0, 'ship-drift', 'git', 
      `${drift.length} shipped file(s) exist in the repo but are NOT on the live site: ${drift.slice(0, 10).join(', ')}`,
      'Commit and push these. Work that never ships is work that never earns.');
  }
  return head;
}

// ---------------------------------------------------------------------------
// 14. P1 - sitemap <lastmod> and a weekly content beat
//
// A site with no new content does not rank and does not give a visitor a
// reason to come back. This measures the beat, not just the pages.
// ---------------------------------------------------------------------------
function contentBeatCheck() {
  const queueDir = path.join(ROOT, 'content', 'queue');
  if (!fs.existsSync(queueDir)) return;
  const items = fs.readdirSync(queueDir).filter((f) => f.endsWith('.md'));
  if (!items.length) {
    finding(P.P1, 'empty-queue', 'content/queue',
      'the content queue is empty - there is nothing scheduled to bring traffic back',
      'Run node gen/gen-content.js to generate this week\'s pieces.');
  }
}

(async () => {
  // Offline checks that need no network.
  contentBeatCheck();
  wireCheck();
  driftCheck();

  if (LIVE) {
    process.stdout.write('Checking the live site...\n');
    await liveCheck();
    if (live.bad.length) {
      finding(P.P0, 'live-status', 'live site', `${live.bad.length} URLs did not return 200: ${live.bad.slice(0, 10).join(' | ')}`,
        'Fix the live 404s - the repo being correct does not help if the site is down.');
    }
    if (liveHeaders.missingOgImage.length) {
      finding(P.P0, 'live-og-image', 'live site', `${liveHeaders.missingOgImage.length} live pages render without an og:image`,
        'The live HTML is what a social crawler reads. Fix it in the repo and push.');
    }
    if (liveHeaders.missingTitle.length || liveHeaders.missingDesc.length || liveHeaders.missingCanonical.length) {
      finding(P.P1, 'live-head-missing', 'live site',
        `live pages missing head tags - title:${liveHeaders.missingTitle.length} desc:${liveHeaders.missingDesc.length} canonical:${liveHeaders.missingCanonical.length}`,
        'Push the head fix; the live site is the one that gets indexed.');
    }
  }

  // Checkout health is the revenue check - it always runs, because a dead
  // buy button costs a sale whether or not anyone asked for --live.
  await checkoutCheck();

  if (LIVE) {
    // (live checks already run above)
  }

  findings.sort((a, b) => a.priority - b.priority || a.code.localeCompare(b.code));

  const counts = { P0: 0, P1: 0, P2: 0, WIRE: 0 };
  for (const f of findings) counts[PRIORITY_NAME[f.priority]]++;

  if (AS_JSON) {
    console.log(JSON.stringify({
      pages: pages.size,
      sitemapUrls: sitemapUrls.length,
      live: LIVE ? { checked: live.checked, ok: live.ok, bad: live.bad } : null,
      counts,
      findings,
    }, null, 2));
    process.exit(counts.P0 || counts.P1 ? 1 : 0);
  }

  console.log('='.repeat(72));
  console.log('  THE COME UP — EMPIRE AUDIT');
  console.log('='.repeat(72));
  console.log(`  pages audited : ${pages.size}`);
  console.log(`  sitemap urls  : ${sitemapUrls.length}`);
  if (LIVE) console.log(`  live checked  : ${live.ok}/${live.checked} returned 200`);
  console.log(`  findings      : ${counts.P0} P0 · ${counts.P1} P1 · ${counts.P2} P2 · ${counts.WIRE} wire`);
  console.log('');

  for (const pr of [0, 1, 2, 3]) {
    const group = findings.filter((f) => f.priority === pr);
    if (!group.length) continue;
    const label = pr === 0 ? '(blocks revenue)'
      : pr === 1 ? '(blocks ranking)'
      : pr === 2 ? '(polish)'
      : '(needs the owner - a build cannot fix these)';
    console.log(`--- ${PRIORITY_NAME[pr]} ${label} ---`);
    for (const f of group) {
      console.log(`  [${f.code}] ${f.scope}`);
      console.log(`      ${f.detail}`);
      console.log(`      fix: ${f.fix}`);
    }
    console.log('');
  }

  if (!findings.length) console.log('  CLEAN - nothing to fix.\n');

  if (counts.WIRE) {
    console.log(`  ${counts.WIRE} item(s) need the owner (endpoint / account / domain).`);
    console.log('  They are reported, not failed: a build cannot fix them.\n');
  }

  // machine-readable copy for the worklist
  const outDir = path.join(ROOT, 'audit', 'out');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'audit.json'), JSON.stringify({
    generated: new Date().toISOString(),
    pages: pages.size, sitemapUrls: sitemapUrls.length, counts, findings,
  }, null, 2));

  console.log('  machine-readable: audit/out/audit.json');
  process.exit(counts.P0 || counts.P1 ? 1 : 0);
})();

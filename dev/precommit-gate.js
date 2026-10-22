// Authoritative pre-commit gate for the comeup-links repo.
// Every check here must be true before we push to GitHub Pages.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://thecomeuphq.github.io/comeup-links/';

let failures = 0;
function check(name, ok, detail) {
  if (!ok) failures++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail ? '  ->  ' + detail : ''));
}

function walk(dir, acc) {
  acc = acc || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.output', 'dev', 'gen', 'audit', 'og', 'assets'].includes(e.name)) continue;
    if (e.name.startsWith('_')) continue;
    // content/ holds STAGED DRAFTS (weekly content queue + the newsletter
    // email body). An email body fragment is not a site page: it has no
    // <head>, no og:image and no canonical, and it must never be published
    // on a public URL. Excluding it here stops the gate demanding that a
    // draft be a full page.
    if (e.name === 'content') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(path.relative(ROOT, p).replace(/\\/g, '/'));
  }
  return acc;
}
const pages = walk(ROOT).sort();
const norm = (u) => u.replace(BASE, '').replace(/index\.html$/, '').replace(/\/$/, '').replace(/\.html$/, '');

console.log('=== SITEMAP ===');
const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const smUrls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const smNorm = new Set(smUrls.map(norm));
const pageNorm = new Set(pages.map(norm));
const missing = [...pageNorm].filter((p) => !smNorm.has(p));
const extra = [...smNorm].filter((u) => !pageNorm.has(u));
check('every page is in the sitemap', missing.length === 0, missing.join(', ') || 'all ' + pages.length + ' pages');
check('no orphan urls in sitemap', extra.length === 0, extra.join(', ') || 'none');
check('sitemap url count matches page count', smUrls.length === pages.length, smUrls.length + ' urls / ' + pages.length + ' pages');
for (const p of ['hourly-pay/18-an-hour', 'join', 'missions']) {
  check('  sitemap contains ' + p, smNorm.has(p));
}

console.log('\n=== OG CARDS ===');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'og', 'manifest.json'), 'utf8'));
const mKeys = Object.keys(manifest);
let missingPng = [];
for (const k of mKeys) {
  const rel = manifest[k].replace(/^og\//, '');
  if (!fs.existsSync(path.join(ROOT, 'og', rel))) missingPng.push(k);
}
check('every manifest entry has a png on disk', missingPng.length === 0, missingPng.join(', ') || mKeys.length + ' entries');
const orphanPng = [];
for (const f of fs.readdirSync(path.join(ROOT, 'og'))) {
  if (!f.endsWith('.png')) continue;
  const used = mKeys.some((k) => manifest[k] === 'og/' + f);
  if (!used) orphanPng.push(f);
}
check('no orphan png files', orphanPng.length === 0, orphanPng.join(', ') || 'none');
check('manifest covers every page', mKeys.length === pages.length, mKeys.length + ' entries / ' + pages.length + ' pages');

console.log('\n=== PER-PAGE META ===');
const noH1 = [], badOg = [], badTw = [], noTitle = [], noDesc = [], noCanon = [], noShare = [], badLd = [];
for (const p of pages) {
  const h = fs.readFileSync(path.join(ROOT, p), 'utf8');
  const noScript = h.replace(/<script[\s\S]*?<\/script>/gi, '');
  if (!/<h1\b/i.test(noScript)) noH1.push(p);
  const ogImg = (h.match(/<meta property="og:image"\s+content="([^"]+)"/) || [])[1] || '';
  const twImg = (h.match(/<meta name="twitter:image"\s+content="([^"]+)"/) || [])[1] || '';
  if (!ogImg.includes('/og/') || !fs.existsSync(path.join(ROOT, ogImg.replace(BASE, '')))) badOg.push(p);
  if (!twImg.includes('/og/') || !fs.existsSync(path.join(ROOT, twImg.replace(BASE, '')))) badTw.push(p);
  if (!/<title>[^<]{10,}<\/title>/i.test(h)) noTitle.push(p);
  if (!/<meta name="description" content="[^"]{30,}"/i.test(h)) noDesc.push(p);
  if (!/<link rel="canonical" href="https:\/\/thecomeuphq\.github\.io\/comeup-links\//i.test(h)) noCanon.push(p);
  if (!/class=["'][^"']*tcu-share-b/i.test(h)) noShare.push(p);
  if (!/application\/ld\+json/i.test(h)) badLd.push(p);
}
check('every page has exactly one visible h1', noH1.length === 0, noH1.join(', ') || 'none missing');
check('og:image points at a real /og/ png', badOg.length === 0, badOg.join(', ') || 'all good');
check('twitter:image points at a real /og/ png', badTw.length === 0, badTw.join(', ') || 'all good');
check('every page has a title', noTitle.length === 0, noTitle.join(', ') || 'none missing');
check('every page has a description', noDesc.length === 0, noDesc.join(', ') || 'none missing');
check('every page has a canonical', noCanon.length === 0, noCanon.join(', ') || 'none missing');
check('every page has the share/copy control', noShare.length === 0, noShare.join(', ') || 'all 97 have it');
check('every page has JSON-LD', badLd.length === 0, badLd.join(', ') || 'none missing');

console.log('\n=== CLEANLINESS ===');
check('no stray share.html', !fs.existsSync(path.join(ROOT, 'share.html')));
check('no stray share.txt', !fs.existsSync(path.join(ROOT, 'share.txt')));
// What actually deploys is what git TRACKS, so the cleanup gate runs against
// the tracked file list, not the working directory.
const { execSync } = require('child_process');
let tracked = [];
try {
  tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
} catch (e) {
  check('could read git tracked file list', false, e.message);
}
check('no scratch _* files tracked', tracked.filter((f) => /(^|\/)_/.test(f)).length === 0,
  tracked.filter((f) => /(^|\/)_/.test(f)).join(', ') || 'none');
check('no node_modules tracked', tracked.filter((f) => f.startsWith('node_modules/')).length === 0,
  tracked.filter((f) => f.startsWith('node_modules/')).slice(0, 3).join(', ') || 'none');
check('no stray share.html tracked', !tracked.includes('share.html'));
check('node_modules is gitignored', fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8').includes('node_modules'));

console.log('\n=== WORKER + BEACON ===');
// The analytics beacon is injected into every page. If it uses a content
// type the browser refuses, the pageview is silently lost and the site
// looks healthy while sending nothing. This gate catches that.
const workerSrc = fs.readFileSync(path.join(ROOT, 'gen', 'worker', 'worker.js'), 'utf8');

// The CORS preflight must be answered BEFORE the method check. A regex with
// a character window was used here and it failed the wrong way: a correct
// worker whose two checks sit more than 400 characters apart was REJECTED,
// which trains people to ignore the gate. This checks the order by INDEX
// with comments stripped, so neither a long handler nor a commented-out
// check can fool it.
function stripJsComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}
const workerClean = stripJsComments(workerSrc);
const optAt = workerClean.indexOf("request.method === 'OPTIONS'");
const notPostAt = workerClean.indexOf("request.method !== 'POST'");
check('worker answers the OPTIONS preflight before the method check',
  optAt !== -1 && notPostAt !== -1 && optAt < notPostAt,
  'OPTIONS must be handled BEFORE the method check, or the browser blocks the request');
// The email send has TWO separate things: the send_email BINDING (an object
// with .send()) and the SIGNUP_EMAIL secret (the address string). Using the
// secret as if it were the binding is the bug that shipped - it made a
// successful signup return 500 to the visitor.
check('worker sends email through the EMAIL binding, not the secret',
  /env\.EMAIL\.send\s*\(/.test(workerClean),
  'the worker must call env.EMAIL.send({ to: env.SIGNUP_EMAIL })');
check('worker never calls .send() on the SIGNUP_EMAIL secret',
  !/env\.SIGNUP_EMAIL\.send\s*\(/.test(workerClean),
  'env.SIGNUP_EMAIL is an address string, not a binding - it has no .send()');
check('worker guards the email send so a missing binding cannot 500 a signup',
  /if\s*\(\s*env\.EMAIL\s*&&\s*env\.SIGNUP_EMAIL\s*\)/.test(workerClean),
  'both the EMAIL binding and the SIGNUP_EMAIL secret must be checked before sending');
check('worker binds the LIST namespace', /env\.LIST\.get/.test(workerSrc) && /env\.LIST\.put/.test(workerSrc));

// wrangler.toml must declare the send_email binding the worker calls.
const wranglerToml = fs.existsSync(path.join(ROOT, 'wrangler.toml'))
  ? fs.readFileSync(path.join(ROOT, 'wrangler.toml'), 'utf8') : '';
check('wrangler.toml declares the EMAIL send_email binding',
  /\[\[send_email\]\]/.test(wranglerToml) && /name\s*=\s*"EMAIL"/.test(wranglerToml),
  'wrangler.toml needs [[send_email]] with name = "EMAIL" or the worker cannot send mail');

const beaconBad = [];
for (const p of pages) {
  const h = fs.readFileSync(path.join(ROOT, p), 'utf8');
  if (!/privacy-first analytics \+ waitlist capture/.test(h)) continue;
  // sendBeacon only accepts a CORS-safelisted content type. application/json
  // is NOT one of them, so the beacon is refused and no pageview is sent.
  if (/new Blob\(\[payload\],\s*\{\s*type:\s*'application\/json'/.test(h)) beaconBad.push(p);
}
check('no page sends the beacon with a refused content type', beaconBad.length === 0,
  beaconBad.length + ' page(s) still use application/json in sendBeacon');

// The worker test proves the routing, the CORS preflight, the KV writes and
// the signup path actually behave. It is the cheapest proof the owner's
// deploy will work.
try {
  const { execSync } = require('child_process');
  const out = execSync('node dev/worker-test.js', { cwd: ROOT, encoding: 'utf8' });
  const m = out.match(/(\d+) passed, (\d+) failed/);
  check('worker behaviour test passes', !!m && m[2] === '0', m ? m[0] : out.slice(-200));
} catch (e) {
  const out = (e.stdout || '') + (e.stderr || '');
  const m = out.match(/(\d+) passed, (\d+) failed/);
  check('worker behaviour test passes', false, m ? m[0] : out.slice(-300));
}

// The order check above is only worth anything if it actually rejects a
// worker with the wrong order. This proves it does, by building one.
try {
  const { execSync } = require('child_process');
  const out = execSync('node dev/gate-order-test.js', { cwd: ROOT, encoding: 'utf8' });
  const m = out.match(/(\d+) passed, (\d+) failed/);
  check('the order check rejects a wrong-order worker', !!m && m[2] === '0', m ? m[0] : out.slice(-200));
} catch (e) {
  const out = (e.stdout || '') + (e.stderr || '');
  const m = out.match(/(\d+) passed, (\d+) failed/);
  check('the order check rejects a wrong-order worker', false, m ? m[0] : out.slice(-300));
}

console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'));
process.exit(failures === 0 ? 0 : 1);

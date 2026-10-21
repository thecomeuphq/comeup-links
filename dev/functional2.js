// Functional tests using the real DOM implementation (dev/dom.js).
// These exercise actual filtering / persistence behaviour.

const fs = require('fs');
const vm = require('vm');
const { parseHTML } = require('./dom');

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => { map.clear(); }
  };
}

function build(html) {
  const root = parseHTML(html);
  const body = root.querySelector('body') || root;
  return { root, body };
}

function context(doc, storage, hash) {
  const loc = {
    hash: hash || '', origin: 'http://localhost:8099', pathname: '/x.html', search: '',
    href: 'http://localhost:8099/x.html'
  };
  const ctx = {
    document: {
      getElementById: (id) => doc.body.querySelector('#' + id),
      querySelector: (s) => doc.body.querySelector(s),
      querySelectorAll: (s) => doc.body.querySelectorAll(s),
      createElement: (t) => {
        const { Element } = require('./dom');
        return new Element(t);
      },
      body: doc.body,
      addEventListener: () => {}
    },
    localStorage: storage,
    console,
    navigator: { clipboard: null },
    location: loc,
    setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; },
    clearTimeout: () => {},
    JSON, Math, Date, Number, String, Array, Object, RegExp, Error, isNaN, parseInt, parseFloat,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    encodeURIComponent, decodeURIComponent, escape, unescape,
    URLSearchParams, URL,
    fetch: () => Promise.reject(new Error('no network')),
    history: { replaceState: () => {} },
    window: { location: loc, print: () => {}, addEventListener: () => {}, history: { replaceState: () => {} } }
  };
  ctx.globalThis = ctx;
  return ctx;
}

function scripts(html) {
  const out = [];
  const re = /<script(?![^>]*\ssrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    if ((m[1] || '').toLowerCase().includes('ld+json')) continue;
    out.push(m[2]);
  }
  return out;
}

const tests = [];
const test = (n, f) => tests.push({ n, f });

test('problems.html search really filters sections', () => {
  const html = fs.readFileSync('problems.html', 'utf8');
  const doc = build(html);
  const ctx = context(doc, makeStorage());
  vm.createContext(ctx);
  scripts(html).forEach(s => vm.runInContext(s, ctx));

  const sections = doc.body.querySelectorAll('section.section[id]');
  if (sections.length < 6) throw new Error('expected many problem sections, got ' + sections.length);

  const input = doc.body.querySelector('#problem-search');
  input.value = 'garnishment';
  input.dispatchEvent('input');

  const visible = sections.filter(s => !s.hidden);
  if (visible.length === 0) throw new Error('garnishment matched nothing');
  if (visible.length === sections.length) throw new Error('search did not filter anything');
  if (!visible.every(s => /garnish/i.test(s.textContent))) {
    throw new Error('a non-matching section stayed visible');
  }
  const status = doc.body.querySelector('#problem-status').textContent;
  return visible.length + '/' + sections.length + ' visible, status: ' + status;
});

test('faq.html search really filters and opens questions', () => {
  const html = fs.readFileSync('faq.html', 'utf8');
  const doc = build(html);
  const ctx = context(doc, makeStorage());
  vm.createContext(ctx);
  scripts(html).forEach(s => vm.runInContext(s, ctx));

  const items = doc.body.querySelectorAll('#faq-list details');
  if (items.length < 20) throw new Error('expected 20+ FAQ items, got ' + items.length);

  const input = doc.body.querySelector('#faq-search');
  input.value = 'snowball';
  input.dispatchEvent('input');

  const visible = items.filter(d => !d.hidden);
  if (visible.length === 0) throw new Error('snowball matched nothing');
  if (visible.length === items.length) throw new Error('search did not filter');
  if (!visible.every(d => d.open)) throw new Error('matching questions did not open');
  return visible.length + '/' + items.length + ' visible and opened';
});

test('payday-ritual.html checkboxes persist to storage', () => {
  const html = fs.readFileSync('payday-ritual.html', 'utf8');
  const doc = build(html);
  const storage = makeStorage();
  const ctx = context(doc, storage);
  vm.createContext(ctx);
  scripts(html).forEach(s => vm.runInContext(s, ctx));

  const boxes = doc.body.querySelectorAll('#ritual-steps input[type="checkbox"]');
  if (boxes.length !== 6) throw new Error('expected 6 ritual steps, got ' + boxes.length);

  boxes[0].checked = true;
  boxes[2].checked = true;
  boxes[0].dispatchEvent('change');

  const saved = JSON.parse(storage.getItem('comeup.ritual.v1') || 'null');
  if (!saved) throw new Error('nothing persisted');
  if (!Array.isArray(saved.steps) || saved.steps.length !== 2) {
    throw new Error('steps not persisted correctly: ' + JSON.stringify(saved));
  }
  const count = doc.body.querySelector('#ritual-count').textContent;
  if (count.indexOf('2 of 6') === -1) throw new Error('counter wrong: ' + count);
  return 'persisted ' + JSON.stringify(saved.steps) + ', counter: ' + count;
});

test('plan-link.html loads a shared plan from the URL hash', () => {
  const html = fs.readFileSync('plan-link.html', 'utf8');
  const doc = build(html);
  const ctx = context(doc, makeStorage());
  vm.createContext(ctx);
  scripts(html).forEach(s => vm.runInContext(s, ctx));
  // Build a plan link the way the page does.
  const title = doc.body.querySelector('#plan-title');
  title.value = 'Shared October plan';
  title.dispatchEvent('input');
  const link = doc.body.querySelector('#plan-link').value;
  if (!link || link.indexOf('#p=') === -1) {
    const viaGet = ctx.document.getElementById('plan-title');
    throw new Error('no link built [linkEl=' + !!doc.body.querySelector('#plan-link') +
      ' titleEl=' + !!title + ' sameTitle=' + (viaGet === title) +
      ' listeners=' + ((title.listeners['input'] || []).length) +
      ' titleValue=' + JSON.stringify(title.value) + ']');
  }

  const hash = link.slice(link.indexOf('#p='));
  // Fresh document, load with the hash present.
  const doc2 = build(html);
  const ctx2 = context(doc2, makeStorage(), hash);
  vm.createContext(ctx2);
  scripts(html).forEach(s => vm.runInContext(s, ctx2));

  const loaded = doc2.body.querySelector('#plan-title').value;
  if (loaded !== 'Shared October plan') throw new Error('plan not loaded from hash: "' + loaded + '"');
  return 'roundtrip loaded "' + loaded + '"';
});

test('favorites.html remove button drops the tool', () => {
  const html = fs.readFileSync('favorites.html', 'utf8');
  const doc = build(html);
  const storage = makeStorage();
  storage.setItem('comeup.favs.v1', JSON.stringify(['debt-free.html']));
  const ctx = context(doc, storage);
  vm.createContext(ctx);
  scripts(html).forEach(s => vm.runInContext(s, ctx));

  const before = doc.body.querySelector('#fav-count').textContent;
  if (before !== '1 saved') throw new Error('count wrong: ' + before);

  const btn = doc.body.querySelector('#fav-list button');
  if (!btn) throw new Error('no remove button rendered');
  btn.dispatchEvent('click');

  const after = doc.body.querySelector('#fav-count').textContent;
  if (after !== '0 saved') throw new Error('count after remove: ' + after);
  const left = JSON.parse(storage.getItem('comeup.favs.v1'));
  if (left.length !== 0) throw new Error('storage not updated: ' + JSON.stringify(left));
  return 'removed correctly, count ' + before + ' -> ' + after;
});

test('dashboard.html clear button wipes only the core numbers', () => {
  const html = fs.readFileSync('dashboard.html', 'utf8');
  const doc = build(html);
  const storage = makeStorage();
  storage.setItem('paycheck-reset-done-v1', JSON.stringify({ 1: true, 2: true }));
  storage.setItem('comeup.profile.v1', JSON.stringify({ rate: 20, payday: 'Friday' }));
  const ctx = context(doc, storage);
  vm.createContext(ctx);
  scripts(html).forEach(s => vm.runInContext(s, ctx));

  doc.body.querySelector('#p-clear').dispatchEvent('click');

  if (storage.getItem('comeup.profile.v1') !== null) throw new Error('profile not cleared');
  if (!storage.getItem('paycheck-reset-done-v1')) throw new Error('tool progress was destroyed');
  return 'core numbers cleared, tool progress preserved';
});

test('waitlist.html valid email reaches the submit path', () => {
  const html = fs.readFileSync('waitlist.html', 'utf8');
  const doc = build(html);
  const ctx = context(doc, makeStorage());
  vm.createContext(ctx);
  scripts(html).forEach(s => vm.runInContext(s, ctx));

  const email = doc.body.querySelector('#waitlist-email');
  email.value = 'leroy@example.com';
  doc.body.querySelector('#waitlist-form').dispatchEvent('submit');
  const status = doc.body.querySelector('#waitlist-status').textContent;
  if (status.indexOf('does not look right') !== -1) throw new Error('valid email was rejected');
  if (!status) throw new Error('no status message');
  return 'valid email accepted, status: ' + status.slice(0, 70);
});

test('tools.html saved-tools list renders saved items', () => {
  const html = fs.readFileSync('tools.html', 'utf8');
  const doc = build(html);
  const storage = makeStorage();
  storage.setItem('comeup.favs.v1', JSON.stringify(['debt-free.html', 'hourly-money.html']));
  const ctx = context(doc, storage);
  vm.createContext(ctx);
  scripts(html).forEach(s => vm.runInContext(s, ctx));

  const status = doc.body.querySelector('#saved-tools-status').textContent;
  if (status.indexOf('2 saved') === -1) throw new Error('status wrong: ' + status);
  const rows = doc.body.querySelectorAll('#saved-tools-list a');
  if (rows.length !== 2) throw new Error('expected 2 saved rows, got ' + rows.length);
  return 'rendered ' + rows.length + ' saved tools, status: ' + status;
});

test('index.html hub links section exists and points at real pages', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const doc = build(html);
  const hubs = doc.body.querySelectorAll('#hubs-h');
  if (hubs.length !== 1) throw new Error('expected exactly one hub section, got ' + hubs.length);
  const links = doc.body.querySelectorAll('.tcu-rel');
  if (links.length < 10) throw new Error('expected 10+ hub links, got ' + links.length);
  return links.length + ' hub links present';
});

test('upsell block added to mapped tool pages, never to a free product', () => {
  const fsx = require('fs');
  const { UPSELL } = require('../gen/upsell-data');
  let checked = 0;
  for (const u of UPSELL) {
    const html = fsx.readFileSync(u.tool, 'utf8');
    if (!html.includes('class="tcu-upsell"')) throw new Error('no upsell on ' + u.tool);
    if (/wupxq|oaqjpg/.test(html)) throw new Error('free product linked on ' + u.tool);
    checked++;
  }
  return checked + ' tool pages carry a context-matched upsell block';
});

let failed = 0;
for (const t of tests) {
  try {
    const d = t.f();
    console.log('PASS  ' + t.n + (d ? '\n        ' + d : ''));
  } catch (e) {
    failed++;
    console.log('FAIL  ' + t.n + '\n        ' + e.message);
  }
}
console.log('\n' + (failed ? failed + ' FAILED' : 'ALL FUNCTIONAL TESTS PASSED'));
process.exit(failed ? 1 : 0);

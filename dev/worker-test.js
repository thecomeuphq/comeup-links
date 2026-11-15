// Test the Cloudflare Worker logic locally before the owner deploys it.
// Mocks the KV namespace and the email binding, then exercises the real
// routes: OPTIONS preflight, GET /status, POST pageview, POST signup.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.cwd();
const src = fs.readFileSync(path.join(ROOT, 'gen', 'worker', 'worker.js'), 'utf8');

// --- mock KV ---
const kv = new Map();
const LIST = {
  async get(k) { return kv.has(k) ? kv.get(k) : null; },
  async put(k, v) { kv.set(k, v); },
  async list() { return { keys: [...kv.keys()].map(name => ({ name })) }; },
};

const sent = [];
// EMAIL is a send_email BINDING - an object with a .send() method.
// SIGNUP_EMAIL is a plain STRING secret - the address that receives the
// mail. They are deliberately different types: the old worker treated the
// secret as if it were the binding, which could never have worked.
const EMAIL = { async send(m) { sent.push(m); return { messageId: 'test-1' }; } };
const SIGNUP_EMAIL = 'owner@example.com';

async function handle(request) {
  // The worker uses ESM `export default`. Strip it and evaluate the object.
  const body = src.replace(/export\s+default\s*/, 'globalThis.__worker = ');
  const sandbox = { globalThis: {}, Response, Request, URL, Date, JSON, Number, String, console };
  vm.createContext(sandbox);
  vm.runInContext(body, sandbox);
  const worker = sandbox.globalThis.__worker;
  return worker.fetch(request, { LIST, EMAIL, SIGNUP_EMAIL });
}

// Every POST from the real site carries Origin: https://thecomeuphq.com, so
// the default test request does too. Pass extraHeaders to override.
function req(method, url, body, extraHeaders) {
  const headers = Object.assign(
    { Origin: 'https://thecomeuphq.com', 'CF-Connecting-IP': '203.0.113.' + (++ipSeq % 250) },
    body ? { 'Content-Type': 'application/json' } : {},
    extraHeaders || {}
  );
  for (const k of Object.keys(headers)) if (headers[k] === null) delete headers[k];
  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}
let ipSeq = 0;

// One long-lived worker instance, for tests that need in-memory state
// (the per-IP rate limit) to persist across requests.
function freshWorker() {
  const body = src.replace(/export\s+default\s*/, 'globalThis.__worker = ');
  const sandbox = { globalThis: {}, Response, Request, URL, Date, JSON, Number, String, console };
  vm.createContext(sandbox);
  vm.runInContext(body, sandbox);
  return sandbox.globalThis.__worker;
}

const BASE = 'https://comeup-analytics.test';
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { console.log('  PASS  ' + name); pass++; }
  else { console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); fail++; }
}

(async () => {
  console.log('\n=== WORKER BEHAVIOUR TEST ===\n');

  // 1. OPTIONS preflight must return 204 with CORS headers
  {
    const r = await handle(req('OPTIONS', BASE + '/'));
    check('OPTIONS returns 204', r.status === 204, 'got ' + r.status);
    check('OPTIONS has Access-Control-Allow-Origin (the site origin)', r.headers.get('Access-Control-Allow-Origin') === 'https://thecomeuphq.com');
    check('OPTIONS allows Content-Type', /Content-Type/i.test(r.headers.get('Access-Control-Allow-Headers') || ''));
  }

  // 2. GET /status before any traffic
  {
    const r = await handle(req('GET', BASE + '/status'));
    const j = await r.json();
    check('GET /status returns 200', r.status === 200);
    check('GET /status reports service comeup', j.service === 'comeup');
    check('GET /status starts at 0 pageviews', j.pageviewsToday === 0, 'got ' + j.pageviewsToday);
  }

  // 3. POST a pageview -> increments today's count
  {
    const r = await handle(req('POST', BASE + '/', { type: 'pageview', path: '/index.html', utm_campaign: 'test' }));
    check('POST pageview returns 200', r.status === 200);
    const s = await handle(req('GET', BASE + '/status'));
    const j = await s.json();
    check('pageview counted', j.pageviewsToday === 1, 'got ' + j.pageviewsToday);
    const r2 = await handle(req('GET', BASE + '/status'));
    const j2 = await r2.json();
    check('signups still 0', j2.signupsTotal === 0);
  }

  // 4. POST a pageview with NO type field (what the beacon sends) must still count
  {
    const r = await handle(req('POST', BASE + '/', { path: '/bundle.html' }));
    check('POST without type returns 200', r.status === 200);
    const s = await handle(req('GET', BASE + '/status'));
    const j = await s.json();
    check('untyped pageview counted', j.pageviewsToday === 2, 'got ' + j.pageviewsToday);
  }

  // 5. POST a signup -> stored, counted, and emailed
  {
    const r = await handle(req('POST', BASE + '/', { type: 'signup', email: 'worker@example.com', name: 'Test', path: '/waitlist.html' }));
    check('POST signup returns 200', r.status === 200);
    const s = await handle(req('GET', BASE + '/status'));
    const j = await s.json();
    check('signup counted', j.signupsTotal === 1, 'got ' + j.signupsTotal);
    check('signup stored in KV', kv.has('signup:worker@example.com'));
    check('owner was emailed', sent.length === 1, 'emails sent: ' + sent.length);
    if (sent.length) check('email addressed to owner', sent[0].to === 'owner@example.com');
    if (sent.length) check('email sent from the owner address', sent[0].from === 'owner@example.com');
    // The bug that shipped: the secret was treated as the binding, so
    // env.SIGNUP_EMAIL.send() threw. If the worker ever goes back to that,
    // this test must fail rather than silently stop emailing.
    check('the email binding and the address secret are DIFFERENT things',
      typeof SIGNUP_EMAIL === 'string' && typeof EMAIL.send === 'function',
      'the worker must use env.EMAIL.send({ to: env.SIGNUP_EMAIL })');
  }

  // 5b. No EMAIL binding -> the signup is still stored and counted, and
  //     the request still succeeds. A missing notification must never cost
  //     a lead.
  {
    const body = src.replace(/export\s+default\s*/, 'globalThis.__worker = ');
    const sandbox = { globalThis: {}, Response, Request, URL, Date, JSON, Number, String, console };
    vm.createContext(sandbox);
    vm.runInContext(body, sandbox);
    const worker = sandbox.globalThis.__worker;
    const r = await worker.fetch(
      req('POST', BASE + '/', { type: 'signup', email: 'nobinding@example.com' }),
      { LIST, SIGNUP_EMAIL } // deliberately no EMAIL binding
    );
    check('signup without the EMAIL binding still returns 200', r.status === 200, 'got ' + r.status);
    check('signup without the EMAIL binding is STILL stored', kv.has('signup:nobinding@example.com'));
  }

  // 6. A bad email is rejected
  {
    const r = await handle(req('POST', BASE + '/', { type: 'signup', email: 'not-an-email' }));
    check('invalid email rejected with 400', r.status === 400, 'got ' + r.status);
  }

  // 5c. REGRESSION: a signup that arrives WITHOUT a type field.
  //
  // The waitlist form has two POST paths and they have sent different
  // payloads. The older one (gen-p3's own fetch) sends
  // { email, name, source, ts } with no type. The worker used to route on
  // payload.type alone, so that signup was counted as a PAGEVIEW and never
  // stored - while the visitor was told "You are on the list". The lead was
  // lost with no error anywhere.
  //
  // A signup is now recognised by the email it carries, so a missing type
  // field can never silently discard a lead.
  {
    const before = kv.size;
    const r = await handle(req('POST', BASE + '/', {
      email: 'untyped@example.com',
      name: 'No Type',
      source: 'comeup-links',
    }));
    check('signup without a type field returns 200', r.status === 200, 'got ' + r.status);
    check('signup without a type field is STORED', kv.has('signup:untyped@example.com'));
    check('signup without a type field is not silently dropped', kv.size > before);
  }

  // 7. Malformed body is rejected, not a 500
  {
    const bad = new Request(BASE + '/', { method: 'POST', body: 'not json', headers: { Origin: 'https://thecomeuphq.com' } });
    const resp = await handle(bad);
    check('malformed body returns 400', resp.status === 400, 'got ' + resp.status);
  }

  // 8. CORS header present on a normal POST
  {
    const r = await handle(req('POST', BASE + '/', { type: 'pageview', path: '/x' }));
    check('POST carries CORS origin header (echoes the site origin)', r.headers.get('Access-Control-Allow-Origin') === 'https://thecomeuphq.com', 'got ' + r.headers.get('Access-Control-Allow-Origin'));
  }

  // ---- Nov 14, 2026 security sweep (MEDIUM-1) ----

  // 9. Origin allowlist
  {
    const before = kv.get('pv:' + new Date().toISOString().slice(0, 10));
    const r = await handle(req('POST', BASE + '/', { type: 'pageview', path: '/x' }, { Origin: 'https://evil.example' }));
    check('POST from a foreign Origin is rejected with 403', r.status === 403, 'got ' + r.status);
    check('foreign-Origin POST wrote nothing', kv.get('pv:' + new Date().toISOString().slice(0, 10)) === before);
    const r2 = await handle(req('POST', BASE + '/', { type: 'pageview', path: '/x' }, { Origin: null }));
    check('POST with no Origin and no Referer is rejected with 403', r2.status === 403, 'got ' + r2.status);
    const r3 = await handle(req('POST', BASE + '/', { type: 'pageview', path: '/x' }, { Origin: null, Referer: 'https://thecomeuphq.com/yield-shield.html' }));
    check('POST with no Origin but a site Referer is accepted', r3.status === 200, 'got ' + r3.status);
    const r4 = await handle(req('POST', BASE + '/', { type: 'pageview', path: '/x' }, { Origin: 'https://www.thecomeuphq.com' }));
    check('POST from www.thecomeuphq.com is accepted', r4.status === 200, 'got ' + r4.status);
    const r5 = await handle(req('POST', BASE + '/', { type: 'pageview', path: '/x' }, { Origin: 'https://thecomeuphq.com.evil.example' }));
    check('look-alike origin is rejected', r5.status === 403, 'got ' + r5.status);
    const r6 = await handle(req('POST', BASE + '/', { type: 'signup', email: 'evil@example.com' }, { Origin: 'https://evil.example' }));
    check('foreign-Origin signup is rejected and not stored', r6.status === 403 && !kv.has('signup:evil@example.com'));
  }

  // 10. Raw input never becomes a KV key
  {
    await handle(req('POST', BASE + '/', { type: 'pageview', path: '/a b:c' + 'x'.repeat(500), utm_campaign: 'camp:aign' + 'y'.repeat(500) }));
    const keys = [...kv.keys()];
    check('path key is cleaned and capped', keys.some(k => k.startsWith('path:/a_b_c')) && keys.filter(k => k.startsWith('path:')).every(k => k.length <= 5 + 128));
    check('utm key is cleaned and capped', keys.some(k => k.startsWith('utm:camp_aign')) && keys.filter(k => k.startsWith('utm:')).every(k => k.length <= 4 + 64));
    check('real path key unchanged', kv.has('path:/index.html'));
    check('real utm key unchanged', kv.has('utm:test'));
  }

  // 11. Gumroad clicks: real target kept as a URL, junk target refused
  {
    const ok = await handle(req('POST', BASE + '/', { type: 'gumroad_click', path: '/x', target: 'https://bradley57.gumroad.com/l/abc' }));
    check('real gumroad click accepted', ok.status === 200, 'got ' + ok.status);
    check('gumroad key keeps the URL', kv.has('gum:' + new Date().toISOString().slice(0, 10) + ':https://bradley57.gumroad.com/l/abc'));
    const bad = await handle(req('POST', BASE + '/', { type: 'gumroad_click', path: '/x', target: 'https://evil.example/' + 'z'.repeat(50) }));
    check('non-gumroad click target rejected', bad.status === 400, 'got ' + bad.status);
  }

  // 12. Body size cap
  {
    const r = await handle(req('POST', BASE + '/', { type: 'pageview', path: '/x', junk: 'q'.repeat(5000) }));
    check('oversized body rejected with 413', r.status === 413, 'got ' + r.status);
  }

  // 13. Email validation and signup field cleaning
  {
    for (const e of ['a@b', 'a b@c.com', 'a@b..com', 'x'.repeat(65) + '@example.com', 'a@example.c', 'a@-example.com']) {
      const r = await handle(req('POST', BASE + '/', { type: 'signup', email: e }));
      check('bad email rejected: ' + e.slice(0, 30), r.status === 400, 'got ' + r.status);
    }
    const sentBefore = sent.length;
    const r = await handle(req('POST', BASE + '/', { type: 'signup', email: 'clean@example.com', name: 'Bob\r\nBcc: x@evil.example', path: '/w:x' }));
    check('signup with junk name accepted', r.status === 200, 'got ' + r.status);
    const rec = JSON.parse(kv.get('signup:clean@example.com') || '{}');
    check('name has no line breaks', !/[\r\n]/.test(rec.name || 'x'), JSON.stringify(rec.name));
    check('email body has no injected line', sent.length === sentBefore + 1 && !/\nBcc:/.test(sent[sent.length - 1].text));
    const totalBefore = Number(kv.get('count:signups'));
    const r2 = await handle(req('POST', BASE + '/', { type: 'signup', email: 'Clean@Example.com' }));
    check('repeat signup still answers 200', r2.status === 200, 'got ' + r2.status);
    check('repeat signup not re-counted', Number(kv.get('count:signups')) === totalBefore);
    check('repeat signup not re-emailed', sent.length === sentBefore + 1);
  }

  // 14. Per-IP rate limits (one worker instance so memory persists)
  {
    const w = freshWorker();
    const env = { LIST, EMAIL, SIGNUP_EMAIL };
    const ip = { 'CF-Connecting-IP': '198.51.100.7' };
    let codes = [];
    for (let i = 0; i < 31; i++) {
      const r = await w.fetch(req('POST', BASE + '/', { type: 'pageview', path: '/rl' }, ip), env);
      codes.push(r.status);
    }
    check('first 30 POSTs from one IP in a minute accepted', codes.slice(0, 30).every(c => c === 200), codes.join(','));
    check('31st POST from one IP in a minute gets 429', codes[30] === 429, 'got ' + codes[30]);
    const other = await w.fetch(req('POST', BASE + '/', { type: 'pageview', path: '/rl' }, { 'CF-Connecting-IP': '198.51.100.8' }), env);
    check('a different IP is not limited', other.status === 200, 'got ' + other.status);

    const w2 = freshWorker();
    const sip = { 'CF-Connecting-IP': '198.51.100.9' };
    const sc = [];
    for (let i = 0; i < 4; i++) {
      const r = await w2.fetch(req('POST', BASE + '/', { type: 'signup', email: 'rl' + i + '@example.com' }, sip), env);
      sc.push(r.status);
    }
    check('3 signups per IP per 10 min allowed, 4th gets 429', sc.slice(0, 3).every(c => c === 200) && sc[3] === 429, sc.join(','));

    // The free Rate Limiting binding, when bound, is honoured.
    const w3 = freshWorker();
    const r = await w3.fetch(req('POST', BASE + '/', { type: 'pageview', path: '/rl' }),
      { LIST, RATE_LIMITER: { async limit() { return { success: false }; } } });
    check('RATE_LIMITER binding saying no -> 429', r.status === 429, 'got ' + r.status);
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();

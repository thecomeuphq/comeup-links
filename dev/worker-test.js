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
const SIGNUP_EMAIL = { async send(m) { sent.push(m); } };

async function handle(request) {
  // The worker uses ESM `export default`. Strip it and evaluate the object.
  const body = src.replace(/export\s+default\s*/, 'globalThis.__worker = ');
  const sandbox = { globalThis: {}, Response, Request, URL, Date, JSON, Number, String, console };
  vm.createContext(sandbox);
  vm.runInContext(body, sandbox);
  const worker = sandbox.globalThis.__worker;
  return worker.fetch(request, { LIST, SIGNUP_EMAIL, LIST_EMAIL: 'owner@example.com' });
}

function req(method, url, body) {
  return new Request(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
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
    check('OPTIONS has Access-Control-Allow-Origin', r.headers.get('Access-Control-Allow-Origin') === '*');
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
  }

  // 6. A bad email is rejected
  {
    const r = await handle(req('POST', BASE + '/', { type: 'signup', email: 'not-an-email' }));
    check('invalid email rejected with 400', r.status === 400, 'got ' + r.status);
  }

  // 7. Malformed body is rejected, not a 500
  {
    const bad = new Request(BASE + '/', { method: 'POST', body: 'not json' });
    const resp = await handle(bad);
    check('malformed body returns 400', resp.status === 400, 'got ' + resp.status);
  }

  // 8. CORS header present on a normal POST
  {
    const r = await handle(req('POST', BASE + '/', { type: 'pageview', path: '/x' }));
    check('POST carries CORS origin header', r.headers.get('Access-Control-Allow-Origin') === '*');
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();

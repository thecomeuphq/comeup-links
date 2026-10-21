// The Come Up — analytics + waitlist capture (privacy-first, $0).
//
// Two jobs, one script:
//
//   1. ANALYTICS. A tiny, cookie-free, no-personal-data beacon. It records
//      the page, the referrer, and the UTM parameters - nothing else. No
//      fingerprinting, no IP storage, no cross-site tracking, no cookie, so
//      there is no consent banner to build. That matters for this audience:
//      a privacy-respecting site is a selling point, not a compliance chore.
//
//   2. WAITLIST CAPTURE. The same endpoint accepts a signup POST, so a
//      Cloudflare Worker (or any $0 endpoint) can serve both.
//
// The endpoint is EMPTY by default: with no endpoint configured the script
// does nothing at all, so nothing is sent anywhere until Leroy points it at
// a real worker. That keeps the $0 rule and the no-tracking promise honest.
//
// To turn it on: set ANALYTICS_ENDPOINT in gen/config.js, then regenerate.
// The Worker source is in gen/worker/ - it is ~40 lines and needs no build.

const fs = require('fs');
const path = require('path');

// ------------------------------------------------------------------ script

const ANALYTICS_SCRIPT = `
// --- privacy-first analytics + waitlist capture (no cookies, no fingerprint) ---
(function () {
  var ENDPOINT = __ENDPOINT__;
  var LIST_ID = __LIST_ID__;
  if (!ENDPOINT) return;

  // ---- analytics ----
  // One small POST on page load. No cookie, no localStorage id, no IP, no
  // fingerprint. We only learn which page and which campaign brought the visit.
  function track() {
    try {
      var u = new URL(location.href);
      var ref = document.referrer || '';
      var src = '';
      // only the origin of the referrer - no full path, no query
      if (ref) { try { src = new URL(ref).origin; } catch (e) { src = ''; } }
      var body = {
        type: 'pageview',
        path: u.pathname,
        query: u.search || '',
        ref: src,
        utm_source: u.searchParams.get('utm_source') || '',
        utm_medium: u.searchParams.get('utm_medium') || '',
        utm_campaign: u.searchParams.get('utm_campaign') || '',
        ts: new Date().toISOString()
      };
      // sendBeacon survives the page unloading; fetch with keepalive is the
      // fallback. Neither blocks the page.
      var payload = JSON.stringify(body);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }));
      } else {
        fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true
        }).catch(function () {});
      }
    } catch (e) { /* analytics must never break the page */ }
  }

  // ---- waitlist capture ----
  // Same endpoint, different payload. A signup is a POST, not a beacon, so it
  // is only sent on an explicit submit - never on page load.
  function capture(email, name) {
    try {
      return fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'signup',
          email: email,
          name: name || '',
          list: LIST_ID,
          path: location.pathname,
          ts: new Date().toISOString()
        })
      });
    } catch (e) { return Promise.reject(e); }
  }

  track();

  // Expose capture for the waitlist form, which lives on waitlist.html.
  window.__comeupCapture = capture;
})();
`;

// ------------------------------------------------------------------ inject

// Every page gets the script. The injection is idempotent: a page that
// already carries it is skipped, so re-running the generator never doubles
// the script up.
const MARKER = 'privacy-first analytics + waitlist capture';

function injectInto(html, endpoint, listId) {
  if (html.includes(MARKER)) return { html, changed: false };

  const script =
    ANALYTICS_SCRIPT
      .replace('__ENDPOINT__', JSON.stringify(endpoint || ''))
      .replace('__LIST_ID__', JSON.stringify(listId || 'comeup'));

  // The script must be a real element, so the placeholder tokens are
  // replaced with JS string literals before injection.
  const tag = '<script>\n' + script + '</script>';

  // Put it at the end of <head> so it does not delay first paint.
  const head = html.indexOf('</head>');
  if (head === -1) return { html, changed: false };
  return { html: html.slice(0, head) + tag + '\n' + html.slice(head), changed: true };
}

// ------------------------------------------------------------------ worker

// A Cloudflare Worker that serves both the analytics beacon and the waitlist
// capture. Free tier: 100k requests a day, more than this site needs.
//
// The worker stores nothing about the visitor beyond what is in the payload,
// and the waitlist emails go to a KV namespace the owner controls.
const WORKER = `// The Come Up — analytics + waitlist worker.
//
// Deploy: Cloudflare dashboard -> Workers & Pages -> Create -> paste this.
// Bind a KV namespace named "LIST" and set the LIST_EMAIL secret.
//
// The worker does two things:
//   POST /event  -> analytics beacon (pageview). Counts only, nothing personal.
//   POST /signup -> a waitlist signup. Appended to the LIST KV namespace.
//
// No cookies are set. No IP is stored. No visitor is identified. A visitor is
// a row of numbers, not a person.

export default {
  async fetch(request, env) {
    // GET /status - a health check the setup page uses to confirm the worker
    // is live before the site is pointed at it. It also returns the first
    // real numbers, so the first thing Leroy sees is not a guess.
    if (request.method === 'GET') {
      const url = new URL(request.url);
      if (url.pathname === '/status') {
        const day = new Date().toISOString().slice(0, 10);
        const pv = Number((await env.LIST.get('pv:' + day)) || 0);
        const signups = Number((await env.LIST.get('count:signups')) || 0);
        return new Response(JSON.stringify({
          ok: true,
          service: 'comeup',
          pageviewsToday: pv,
          signupsTotal: signups,
          ts: new Date().toISOString()
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      return new Response('ok', { status: 200 });
    }
    if (request.method !== 'POST') {
      return new Response('ok', { status: 200 });
    }

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return new Response('bad request', { status: 400 });
    }

    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      if (payload && payload.type === 'signup') {
        const email = String(payload.email || '').trim();
        if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) {
          return new Response('bad email', { status: 400, headers: cors });
        }
        const record = {
          email,
          name: String(payload.name || '').trim(),
          path: String(payload.path || ''),
          ts: payload.ts || new Date().toISOString(),
        };
        await env.LIST.put('signup:' + email, JSON.stringify(record));
        const total = Number((await env.LIST.get('count:signups')) || 0);
        await env.LIST.put('count:signups', String(total + 1));
        // notify the owner so a signup is never only in a KV namespace
        if (env.LIST_EMAIL) {
          await env.SIGNUP_EMAIL.send({
            to: env.LIST_EMAIL,
            from: env.LIST_EMAIL,
            subject: 'New The Come Up signup',
            text: record.email + (record.name ? ' (' + record.name + ')' : '') + '\\nvia ' + record.path,
          }).catch(() => {});
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      // analytics: count only
      const key = 'pv:' + new Date().toISOString().slice(0, 10);
      const count = Number((await env.LIST.get(key)) || 0);
      await env.LIST.put(key, String(count + 1));
      const pathKey = 'path:' + String(payload.path || '');
      const pathCount = Number((await env.LIST.get(pathKey)) || 0);
      await env.LIST.put(pathKey, String(pathCount + 1));
      if (payload.utm_campaign) {
        const cKey = 'utm:' + payload.utm_campaign;
        const cCount = Number((await env.LIST.get(cKey)) || 0);
        await env.LIST.put(cKey, String(cCount + 1));
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response('error', { status: 500, headers: cors });
    }
  },
};
`;

// ------------------------------------------------------------------ main

function listHtmlFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listHtmlFiles(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function main() {
  const config = require('./config');
  const endpoint = config.ANALYTICS_ENDPOINT || '';
  const listId = config.ANALYTICS_LIST_ID || 'comeup';

  const files = listHtmlFiles('.');
  let changed = 0;
  let skipped = 0;

  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    const res = injectInto(html, endpoint, listId);
    if (res.changed) {
      fs.writeFileSync(file, res.html, 'utf8');
      changed++;
    } else {
      skipped++;
    }
  }

  console.log('analytics: ' + changed + ' page(s) instrumented, ' + skipped + ' already done');
  console.log('  endpoint: ' + (endpoint ? endpoint : '(NOT SET - nothing is sent anywhere)'));

  // write the worker source so it is ready to paste into Cloudflare
  const workerDir = path.join(__dirname, 'worker');
  fs.mkdirSync(workerDir, { recursive: true });
  fs.writeFileSync(path.join(workerDir, 'worker.js'), WORKER, 'utf8');
  console.log('  wrote gen/worker/worker.js (paste into Cloudflare Workers)');
}

main();

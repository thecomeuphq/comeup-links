// The Come Up — analytics + waitlist worker.
//
// Deploy: npx wrangler deploy (the wrangler.toml in this repo has every
// binding already declared - see audit/OWNER-SETUP.md for the two values
// the owner has to fill in).
//
// Two bindings are needed:
//   LIST         - a KV namespace. Stores pageview counts and signups.
//   EMAIL        - a send_email binding. Lets the Worker send the
//                  notification email. WITHOUT IT the Worker cannot send
//                  mail and must not try.
// Plus one secret:
//   SIGNUP_EMAIL - the address that RECEIVES signups, as a plain string.
//                  It is used for both the To and the From header.
//
// If the EMAIL binding or the SIGNUP_EMAIL secret is missing, signups are
// still stored and still counted - only the notification email is skipped.
//
// The worker does two things, on any POST path:
//   a beacon POST  -> analytics pageview. Counts only, nothing personal.
//   a signup POST  -> a waitlist signup, stored in the LIST KV namespace.
// The body decides which: { type: 'signup', email, name, path } is a signup,
// anything else is counted as a pageview.
//
// No cookies are set. No IP is stored. No visitor is identified. A visitor is
// a row of numbers, not a person.

// Key parts come from the visitor's URL, so they are untrusted input: a
// scanner or a junk link can mint unbounded KV keys with random campaign
// strings. Clean every part before it becomes a key - letters, digits and
// . _ / - survive, everything else (including the ':' key separator)
// becomes '_', and each part is length-capped.
function cleanPart(v, max) {
  return String(v || '').replace(/[^A-Za-z0-9._/-]/g, '_').slice(0, max);
}

// ---- abuse protection (Nov 14, 2026 security sweep, MEDIUM-1) ----
//
// Before this, any POST from anywhere was accepted with no limit, so a
// script could burn the free-tier KV write quota (about 1,000 writes a day)
// and stop real analytics and signups, or fill the owner's inbox with fake
// signup emails. Four cheap guards, none of which costs a KV write:
//
//   1. Origin / Referer allowlist - only the site's own pages may POST.
//   2. Per-IP rate limit - the free Workers Rate Limiting binding
//      (env.RATE_LIMITER, declared in wrangler.toml) when it is bound, plus
//      an in-memory per-isolate cap that always runs. A KV-based counter was
//      rejected on purpose: it would spend the same scarce KV writes the
//      limiter is meant to protect.
//   3. Body size cap and per-field length caps / cleaning before anything
//      becomes a KV key or goes into an email.
//   4. Stricter email validation, and a repeat signup for the same address
//      is neither re-counted nor re-emailed.
//
// Origin can be faked by a non-browser script, so (1) mainly stops other
// websites from using visitors' browsers; (2) is what limits scripts.

const ALLOWED_ORIGINS = [
  'https://thecomeuphq.com',
  'https://www.thecomeuphq.com',
  // GitHub Pages default host; it redirects to the custom domain, kept so a
  // page that is ever served from it still counts.
  'https://thecomeuphq.github.io',
];

function originOf(v) {
  if (!v || v === 'null') return '';
  try { return new URL(v).origin; } catch (e) { return ''; }
}

// Browsers send Origin on every POST. Referer is the fallback for the rare
// client that drops Origin. No allowed Origin or Referer -> rejected.
function allowedOrigin(request) {
  const o = originOf(request.headers.get('Origin'));
  if (o) return ALLOWED_ORIGINS.includes(o) ? o : '';
  const r = originOf(request.headers.get('Referer'));
  return ALLOWED_ORIGINS.includes(r) ? r : '';
}

const MAX_BODY_BYTES = 4096;      // a real beacon is ~300 bytes
const IP_POSTS_PER_MIN = 30;      // in-memory cap, per isolate
const IP_SIGNUPS_PER_10MIN = 3;   // in-memory cap, per isolate
const MAX_TRACKED_KEYS = 5000;    // keeps the in-memory map small

const hits = new Map();
function overLimit(key, limit, windowMs) {
  const now = Date.now();
  const bucket = key + ':' + Math.floor(now / windowMs);
  const n = (hits.get(bucket) || 0) + 1;
  if (hits.size >= MAX_TRACKED_KEYS && !hits.has(bucket)) {
    // drop every bucket from an older window, then if still full, clear
    const cur = ':' + Math.floor(now / windowMs);
    for (const k of hits.keys()) if (!k.endsWith(cur)) hits.delete(k);
    if (hits.size >= MAX_TRACKED_KEYS) hits.clear();
  }
  hits.set(bucket, n);
  return n > limit;
}

// Plain text for an email body or a stored field: no control characters
// (so no header / line injection), trimmed, length-capped.
function cleanText(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

// RFC 5321 caps: 254 total, 64 local part. Letters, digits and the usual
// local-part symbols; a dotted domain with a 2+ letter TLD.
const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,24}$/;
function validEmail(e) {
  return typeof e === 'string' && e.length <= 254 && EMAIL_RE.test(e) && !e.includes('..');
}

// A Gumroad click target must be a real https gumroad.com URL. Kept as a URL
// (the /report read-back shows it as one), with control characters removed
// and the length capped.
function cleanGumroadTarget(v) {
  const t = cleanText(v, 200);
  try {
    const u = new URL(t);
    if (u.protocol !== 'https:') return '';
    if (u.hostname !== 'gumroad.com' && !u.hostname.endsWith('.gumroad.com')) return '';
    return t;
  } catch (e) { return ''; }
}

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
      if (url.pathname === '/report') {
        // Per-date read-back: arrivals keyed by (date, page, campaign) and
        // Gumroad outbound clicks for that date. This is the read the
        // Oct 27 ad readout needed and did not have (FLAG-2026-004).
        const day = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
        const pvDay = Number((await env.LIST.get('pv:' + day)) || 0);
        const signupsR = Number((await env.LIST.get('count:signups')) || 0);
        const arrivals = [];
        const gumroadClicks = [];
        let cursor = undefined;
        do {
          const listed = await env.LIST.list({ cursor });
          for (const k of listed.keys) {
            if (k.name.startsWith('arr:' + day + ':')) {
              const rest = k.name.slice(('arr:' + day + ':').length);
              const i1 = rest.indexOf(':');
              const pth = i1 === -1 ? rest : rest.slice(0, i1);
              const rem = i1 === -1 ? '' : rest.slice(i1 + 1);
              const i2 = rem.lastIndexOf(':');
              arrivals.push({
                path: pth,
                campaign: i2 === -1 ? rem : rem.slice(0, i2),
                source: i2 === -1 ? '' : rem.slice(i2 + 1),
                count: Number((await env.LIST.get(k.name)) || 0)
              });
            } else if (k.name.startsWith('gum:' + day + ':')) {
              gumroadClicks.push({
                target: k.name.slice(('gum:' + day + ':').length),
                count: Number((await env.LIST.get(k.name)) || 0)
              });
            }
          }
          cursor = listed.list_complete ? undefined : listed.cursor;
        } while (cursor);
        arrivals.sort((x, y) => y.count - x.count);
        gumroadClicks.sort((x, y) => y.count - x.count);
        return new Response(JSON.stringify({
          ok: true,
          service: 'comeup',
          date: day,
          pageviews: pvDay,
          signupsTotal: signupsR,
          arrivals,
          gumroadClicks,
          ts: new Date().toISOString()
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      return new Response('ok', { status: 200 });
    }
    // The site's own pages get their origin echoed back; any other origin
    // gets no CORS grant, so a browser on another site cannot read a reply.
    const origin = allowedOrigin(request);
    const cors = {
      'Access-Control-Allow-Origin': origin || 'https://thecomeuphq.com',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin',
    };

    // The CORS preflight must be answered BEFORE the method check. The old
    // order rejected every OPTIONS request with a plain 200, so a browser
    // preflight failed and the signup fetch was blocked before it left the
    // page. The preflight never carried a body, so it must also not be
    // parsed as one.
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return new Response('ok', { status: 200 });
    }

    // 1. Origin / Referer allowlist.
    if (!origin) {
      return new Response('forbidden', { status: 403, headers: cors });
    }

    // 2. Per-IP rate limit. CF-Connecting-IP is set by Cloudflare and cannot
    // be supplied by the client. Nothing about the IP is stored.
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (overLimit('ip:' + ip, IP_POSTS_PER_MIN, 60 * 1000)) {
      return new Response('slow down', { status: 429, headers: cors });
    }
    if (env.RATE_LIMITER && typeof env.RATE_LIMITER.limit === 'function') {
      try {
        const { success } = await env.RATE_LIMITER.limit({ key: 'ip:' + ip });
        if (!success) return new Response('slow down', { status: 429, headers: cors });
      } catch (e) { /* limiter unavailable: the in-memory cap still applies */ }
    }

    // 3. Body size cap, then parse. The beacon sends text/plain with a JSON
    // body, so the body is read as text and parsed, as before.
    const declared = Number(request.headers.get('Content-Length') || 0);
    if (declared > MAX_BODY_BYTES) {
      return new Response('too large', { status: 413, headers: cors });
    }
    let payload;
    try {
      const raw = await request.text();
      if (raw.length > MAX_BODY_BYTES) {
        return new Response('too large', { status: 413, headers: cors });
      }
      payload = JSON.parse(raw);
    } catch (e) {
      return new Response('bad request', { status: 400, headers: cors });
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return new Response('bad request', { status: 400, headers: cors });
    }

    try {
      // A signup is recognised by the EMAIL it carries, not only by the
      // type field. The waitlist form has two POST paths (the analytics
      // capture and its own fetch) and they have sent different payloads.
      // Routing on the type field alone meant a payload without
      // type: 'signup' was counted as a pageview and the lead was lost
      // while the visitor was told "You are on the list".
      const isSignup = payload && (
        payload.type === 'signup' ||
        (typeof payload.email === 'string' && payload.email.trim() !== '')
      );
      if (isSignup) {
        const email = String(payload.email || '').trim();
        if (!validEmail(email)) {
          return new Response('bad email', { status: 400, headers: cors });
        }
        if (overLimit('signup:' + ip, IP_SIGNUPS_PER_10MIN, 10 * 60 * 1000)) {
          return new Response('slow down', { status: 429, headers: cors });
        }
        const ts = typeof payload.ts === 'string' && payload.ts.length <= 40 &&
          !isNaN(Date.parse(payload.ts)) ? payload.ts : new Date().toISOString();
        const record = {
          email,
          name: cleanText(payload.name, 100),
          path: cleanPart(payload.path, 128),
          ts,
        };
        const signupKey = 'signup:' + email.toLowerCase();
        // A repeat signup for an address already on the list is answered
        // with the same success, but not re-counted and not re-emailed, so
        // the count and the owner's inbox cannot be inflated by resubmits.
        const existing = await env.LIST.get(signupKey);
        if (existing !== null) {
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { ...cors, 'Content-Type': 'application/json' },
          });
        }
        await env.LIST.put(signupKey, JSON.stringify(record));
        const total = Number((await env.LIST.get('count:signups')) || 0);
        await env.LIST.put('count:signups', String(total + 1));
        // notify the owner so a signup is never only in a KV namespace.
        //
        // env.EMAIL is a send_email BINDING - an object with a .send()
        // method, declared in wrangler.toml. env.SIGNUP_EMAIL is a plain
        // STRING secret - the address that receives the email. They are two
        // different things and one value cannot be both, which is why the
        // old code (env.SIGNUP_EMAIL.send({ to: env.SIGNUP_EMAIL })) could
        // never have worked.
        //
        // If either is missing the signup is STILL stored and STILL
        // counted - only the notification email is skipped.
        if (env.EMAIL && env.SIGNUP_EMAIL) {
          await env.EMAIL.send({
            to: env.SIGNUP_EMAIL,
            from: env.SIGNUP_EMAIL,
            subject: 'New The Come Up signup',
            text: record.email + (record.name ? ' (' + record.name + ')' : '') + '\nvia ' + record.path,
          }).catch(() => {});
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      // Gumroad outbound click: counted separately, never as a pageview.
      if (payload && payload.type === 'gumroad_click') {
        const gDay = new Date().toISOString().slice(0, 10);
        const target = cleanGumroadTarget(payload.target);
        if (!target) {
          return new Response('bad target', { status: 400, headers: cors });
        }
        const gKey = 'gum:' + gDay + ':' + target;
        const gCount = Number((await env.LIST.get(gKey)) || 0);
        await env.LIST.put(gKey, String(gCount + 1));
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      // analytics: count only
      const key = 'pv:' + new Date().toISOString().slice(0, 10);
      const count = Number((await env.LIST.get(key)) || 0);
      await env.LIST.put(key, String(count + 1));
      // Raw visitor input never becomes a KV key: cleaned and capped.
      const pathKey = 'path:' + cleanPart(payload.path, 128);
      const pathCount = Number((await env.LIST.get(pathKey)) || 0);
      await env.LIST.put(pathKey, String(pathCount + 1));
      if (payload.utm_campaign) {
        const cKey = 'utm:' + cleanPart(payload.utm_campaign, 64);
        const cCount = Number((await env.LIST.get(cKey)) || 0);
        await env.LIST.put(cKey, String(cCount + 1));
      }
      // Arrival record keyed by (date, page, campaign) - readable back per
      // date through GET /report, which the old global counters could not do.
      const arrKey = 'arr:' + new Date().toISOString().slice(0, 10) + ':' +
        cleanPart(payload.path, 128) + ':' +
        (payload.utm_campaign ? cleanPart(payload.utm_campaign, 64) : 'none') + ':' +
        (payload.utm_source ? cleanPart(payload.utm_source, 32) : 'none');
      const arrCount = Number((await env.LIST.get(arrKey)) || 0);
      await env.LIST.put(arrKey, String(arrCount + 1));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response('error', { status: 500, headers: cors });
    }
  },
};

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
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return new Response('bad request', { status: 400 });
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
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
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
        const gKey = 'gum:' + gDay + ':' + String(payload.target || '').trim().slice(0, 200);
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
      const pathKey = 'path:' + String(payload.path || '');
      const pathCount = Number((await env.LIST.get(pathKey)) || 0);
      await env.LIST.put(pathKey, String(pathCount + 1));
      if (payload.utm_campaign) {
        const cKey = 'utm:' + payload.utm_campaign;
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

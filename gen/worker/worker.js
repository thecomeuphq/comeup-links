// The Come Up — analytics + waitlist worker.
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
        // notify the owner so a signup is never only in a KV namespace
        if (env.LIST_EMAIL) {
          await env.SIGNUP_EMAIL.send({
            to: env.LIST_EMAIL,
            from: env.LIST_EMAIL,
            subject: 'New The Come Up signup',
            text: record.email + (record.name ? ' (' + record.name + ')' : '') + '\nvia ' + record.path,
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

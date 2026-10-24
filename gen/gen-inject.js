// Additive injections into EXISTING pages.
//
// Rule: never delete, replace, or redesign an existing tool. Everything here
// only INSERTS new blocks or new sections. No existing element is modified,
// removed, or reordered.
//
//   Phase 16  -> context-matched upsell block on the 13 mapped tool pages
//   Phase 8   -> "Save tools" section appended to tools.html
//   Phase 6   -> hub links row appended to index.html and tools.html
//   Phase 25  -> sitemap entries for every new page
//   Phase M1  -> EmailOctopus capture block on 16 funnel pages (FLAG-2026-001)
//
// The script is idempotent: running it twice changes nothing the second time.

const fs = require('fs');
const path = require('path');
const { UPSELL } = require('./upsell-data');
const { PAID, GUMROAD, UTM } = require('./products');

const SITE = 'https://thecomeuphq.github.io/comeup-links';
const FORBIDDEN = ['wupxq', 'oaqjpg'];

function link(slug, campaign) {
  if (FORBIDDEN.includes(slug)) throw new Error('refusing to link free product: ' + slug);
  return `${GUMROAD}/l/${slug}?${UTM}&utm_campaign=${campaign}`;
}

const bySlug = {};
PAID.forEach(p => { bySlug[p.slug] = p; });

const changed = [];

// ---------------------------------------------------------------------------
// Phase 16 — context-matched upsell block on existing tool pages
// ---------------------------------------------------------------------------
function upsellBlock(slug) {
  const p = bySlug[slug];
  if (!p) throw new Error('unknown product slug: ' + slug);
  return `
      <section class="tcu-upsell" style="margin-top:28px; padding:16px; border:1px solid #6b4f18; border-radius:14px; background:linear-gradient(125deg,#241a07,#1f1f1f);">
        <h2 style="margin:0 0 6px; font-size:16px; color:#f5a623; letter-spacing:.01em;">Want this on paper?</h2>
        <p style="margin:0 0 13px; font-size:14px; line-height:1.55; color:#bdbdbd;">The free tool gives you the number. This tracker gives you the system you keep using &mdash; one-time ${'$'}${p.price.toFixed(2)}, yours to print and reprint.</p>
        <a href="${link(slug, 'tool_upsell')}" target="_blank" rel="noopener" style="display:inline-flex; align-items:center; justify-content:center; min-height:44px; padding:11px 17px; border-radius:12px; background:#f5a623; color:#17130c; font-size:14px; font-weight:800; text-decoration:none;">Get ${p.name} &mdash; ${'$'}${p.price.toFixed(2)}</a>
        <p style="margin:12px 0 0; font-size:12px; line-height:1.6; color:#8a8a8a;">One-time purchase, no subscription. Everything on this site stays free &mdash; <a href="free-vs-paid.html">see what stays free</a>.</p>
      </section>`;
}

for (const u of UPSELL) {
  const file = u.tool;
  if (!fs.existsSync(file)) { console.log('  skip (missing): ' + file); continue; }
  let h = fs.readFileSync(file, 'utf8');

  // Idempotency: skip if the marker is already present.
  if (h.includes('class="tcu-upsell"')) { console.log('  skip (already has upsell): ' + file); continue; }

  const anchor = '<section class="tcu"';
  const idx = h.indexOf(anchor);
  if (idx === -1) { console.log('  skip (no tcu anchor): ' + file); continue; }

  // Find the start of the line the tcu section sits on so the insert is clean.
  const lineStart = h.lastIndexOf('\n', idx) + 1;
  const indent = h.slice(lineStart, idx).match(/^\s*/)[0];

  h = h.slice(0, lineStart) + indent + upsellBlock(u.slug).trimStart() + '\n' + h.slice(lineStart);
  fs.writeFileSync(file, h);
  changed.push(file);
  console.log('  + upsell -> ' + file);
}

// ---------------------------------------------------------------------------
// Phase 8 — "Save tools" section appended to tools.html
// ---------------------------------------------------------------------------
// New elements only. Existing cards are untouched. The star is a real button
// sitting outside the anchor, so the markup stays valid HTML.
const TOOLS_HTML = 'tools.html';
{
  let h = fs.readFileSync(TOOLS_HTML, 'utf8');
  if (h.includes('id="saved-tools-list"')) {
    console.log('  skip (already has saved tools): ' + TOOLS_HTML);
  } else {
    const block = `
    <section class="saved-tools" id="saved-tools" aria-labelledby="saved-tools-h">
      <h2 id="saved-tools-h">&#9733; Save tools for later</h2>
      <p class="sub">Star the ones you keep coming back to. Saved tools live in this browser only &mdash; no account, and nothing uploaded. You can open your list any time from <a href="favorites.html">My saved tools</a>.</p>
      <p class="search-status" id="saved-tools-status" role="status" aria-live="polite"></p>
      <div id="saved-tools-list"></div>
    </section>
`;
    const anchor = '<section class="tcu"';
    const idx = h.indexOf(anchor);
    if (idx === -1) { console.log('  skip (no tcu anchor): ' + TOOLS_HTML); }
    else {
      const lineStart = h.lastIndexOf('\n', idx) + 1;
      h = h.slice(0, lineStart) + block.trimStart() + '\n' + h.slice(lineStart);

      // Append the script just before </body>.
      const script = `
    <script>
      (function () {
        var KEY = 'comeup.favs.v1';
        function load() {
          try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; }
          catch (e) { return []; }
        }
        function save(list) {
          try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
        }
        var listEl = document.getElementById('saved-tools-list');
        var statusEl = document.getElementById('saved-tools-status');
        if (!listEl) return;

        var CARDS = Array.prototype.slice.call(document.querySelectorAll('a.card[href]'));
        function meta(href) {
          var el = CARDS.filter(function (c) { return c.getAttribute('href') === href; })[0];
          if (!el) return null;
          var t = el.querySelector('.t');
          var d = el.querySelector('.d');
          return { href: href, t: t ? t.textContent.trim() : href, d: d ? d.textContent.trim() : '' };
        }
        function allTools() {
          var seen = {};
          var out = [];
          CARDS.forEach(function (c) {
            var href = c.getAttribute('href');
            if (!href || href.charAt(0) === '#' || seen[href]) return;
            if (/^https?:/i.test(href)) return;
            seen[href] = true;
            var m = meta(href);
            if (m) out.push(m);
          });
          return out;
        }
        function render() {
          var saved = load();
          listEl.innerHTML = '';
          if (!saved.length) {
            var p = document.createElement('p');
            p.className = 'empty show';
            p.textContent = 'No tools saved yet. Use the star next to any tool below to add it to your list.';
            listEl.appendChild(p);
            if (statusEl) statusEl.textContent = '0 saved';
            return;
          }
          var box = document.createElement('div');
          saved.forEach(function (href) {
            var m = meta(href) || { href: href, t: href, d: '' };
            var row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:14px;padding:12px 15px;border-bottom:1px solid #333;';
            var left = document.createElement('div');
            var a = document.createElement('a');
            a.href = m.href;
            a.textContent = m.t;
            a.style.cssText = 'font-weight:750;font-size:14px;';
            left.appendChild(a);
            if (m.d) {
              var sub = document.createElement('div');
              sub.textContent = m.d;
              sub.style.cssText = 'margin-top:3px;font-size:12.5px;color:#bdbdbd;';
              left.appendChild(sub);
            }
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = 'Remove';
            btn.setAttribute('aria-label', 'Remove ' + m.t + ' from saved tools');
            btn.style.cssText = 'min-height:40px;padding:9px 13px;border:1px solid #3a3a3a;border-radius:10px;background:#252525;color:#f5f5f5;font:inherit;font-size:13px;font-weight:750;cursor:pointer;';
            btn.addEventListener('click', function () {
              save(load().filter(function (x) { return x !== href; }));
              render();
              if (statusEl) statusEl.textContent = 'Removed ' + m.t + '.';
            });
            row.appendChild(left);
            row.appendChild(btn);
            box.appendChild(row);
          });
          listEl.appendChild(box);
          if (statusEl) statusEl.textContent = saved.length + ' saved tool' + (saved.length === 1 ? '' : 's') + '.';
        }

        // Add a star toggle to every internal tool card, as a sibling so the
        // existing anchor markup is not altered.
        CARDS.forEach(function (card) {
          var href = card.getAttribute('href');
          if (!href || href.charAt(0) === '#' || /^https?:/i.test(href)) return;
          if (card.parentNode && card.parentNode.querySelector('.tcu-star[data-star-for="' + href + '"]')) return;
          var star = document.createElement('button');
          star.type = 'button';
          star.className = 'tcu-star';
          star.setAttribute('data-star-for', href);
          star.setAttribute('aria-label', 'Save ' + (card.querySelector('.t') ? card.querySelector('.t').textContent.trim() : href) + ' to my tools');
          star.style.cssText = 'position:absolute;top:8px;right:8px;z-index:2;width:32px;height:32px;border-radius:9px;border:1px solid #3a3a3a;background:#181818;color:#8a8a8a;font-size:15px;line-height:1;cursor:pointer;display:grid;place-items:center;';
          function paintStar() {
            var on = load().indexOf(href) !== -1;
            star.textContent = on ? '\\u2605' : '\\u2606';
            star.style.color = on ? '#f5a623' : '#8a8a8a';
            star.setAttribute('aria-pressed', on ? 'true' : 'false');
          }
          star.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            var saved = load();
            var i = saved.indexOf(href);
            if (i === -1) saved.push(href); else saved.splice(i, 1);
            save(saved);
            paintStar();
            render();
            if (statusEl) statusEl.textContent = (i === -1 ? 'Saved ' : 'Removed ') + href + '.';
          });
          if (card.style.position !== 'relative') card.style.position = 'relative';
          card.parentNode.insertBefore(star, card);
          paintStar();
        });

        render();
      })();
    </script>
`;
      const bodyClose = h.lastIndexOf('</body>');
      if (bodyClose === -1) { console.log('  skip (no </body>): ' + TOOLS_HTML); }
      else {
        h = h.slice(0, bodyClose) + script + h.slice(bodyClose);
        fs.writeFileSync(TOOLS_HTML, h);
        changed.push(TOOLS_HTML);
        console.log('  + saved tools -> ' + TOOLS_HTML);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Hub links row on index.html and tools.html (Phase 6 connective tissue)
// ---------------------------------------------------------------------------
const HUBS = [
  ['problems.html', 'Problems hub', 'Start from the problem, not the tool name.'],
  ['compare.html', 'Compare tools', 'Side-by-side, so you pick the right one.'],
  ['faq.html', 'Money FAQ', 'Answers to the questions people actually ask.'],
  ['guides.html', 'Guides & playbooks', 'The deeper explainers behind the tools.'],
  ['dashboard.html', 'Money dashboard', 'Every number you have saved, in one place.'],
  ['favorites.html', 'My saved tools', 'The tools you keep coming back to.'],
  ['payday-ritual.html', 'Payday ritual', 'A repeatable 20-minute payday routine.'],
  ['printables.html', 'Printable worksheets', 'Print-and-go versions, one page each.'],
  ['plan-link.html', 'Share a plan as a link', 'Send a plan without a signup.'],
  ['catalog.html', 'Paid trackers', 'Printables for when paper works better.']
];

function hubRow(indent) {
  const cards = HUBS.map(h => `${indent}  <a class="tcu-rel" href="${h[0]}">
${indent}    <span class="tcu-rel-t">${h[1]}</span>
${indent}    <span class="tcu-rel-d">${h[2]}</span>
${indent}  </a>`).join('\n');
  return `
${indent}<section class="tcu" aria-labelledby="hubs-h">
${indent}  <h2 class="tcu-h" id="hubs-h">Find your way around</h2>
${indent}  <div class="tcu-rels">
${cards}
${indent}  </div>
${indent}</section>
`;
}

for (const file of ['index.html', 'tools.html']) {
  let h = fs.readFileSync(file, 'utf8');
  if (h.includes('id="hubs-h"')) { console.log('  skip (already has hubs): ' + file); continue; }
  // Insert before the existing "Keep going" tcu section so the page keeps
  // its current ending. If there is no tcu section, append before </body>.
  const idx = h.indexOf('<section class="tcu"');
  let at;
  if (idx === -1) at = h.lastIndexOf('</body>');
  else {
    const lineStart = h.lastIndexOf('\n', idx) + 1;
    at = lineStart;
  }
  if (at === -1) { console.log('  skip (no anchor): ' + file); continue; }
  const indent = h.slice(h.lastIndexOf('\n', at) + 1, at).match(/^\s*/)[0] || '    ';
  h = h.slice(0, at) + hubRow(indent) + h.slice(at);
  fs.writeFileSync(file, h);
  changed.push(file);
  console.log('  + hub links -> ' + file);
}


// ---------------------------------------------------------------------------
// Phase M1 — EmailOctopus capture block (FLAG-2026-001, 2026-10-24)
// ---------------------------------------------------------------------------
// Additive only: one capture section + one small script inserted before the
// "Keep going" tcu section (the same anchor Phase 16 uses), so the order on
// tool pages reads: tool -> upsell -> capture -> keep going. The tool is
// NEVER gated: the form sits after tool use. Endpoint comes from
// gen/config.js (WAITLIST_ENDPOINT) — never a second hardcoded copy.
// Idempotency marker: class="tcu-capture". waitlist.html (native form) and
// rivetdue.html (B2B, separate decision) are deliberately NOT targets.
const { WAITLIST_ENDPOINT: M1_ENDPOINT } = require('./config');
const M1_HONEYPOT = 'hpc4b27b6e-eb38-11e9-be00-06b4694bee2a';
// Gemini critique 2026-10-24 (SHIP WITH REFINEMENTS): Discord line under the
// form REMOVED (exit ramp), Reset page heading/CTA made asset-specific,
// CTA unified to "Get My Free Printable", placeholder set per critique.

function captureBlock(heading, body) {
  return `
      <section class="tcu-capture" style="margin-top:28px; padding:16px; border:1px solid #6b4f18; border-radius:14px; background:linear-gradient(125deg,#241a07,#1f1f1f);">
        <h2 style="margin:0 0 6px; font-size:16px; color:#f5a623; letter-spacing:.01em;">${heading}</h2>
        <p style="margin:0 0 13px; font-size:14px; line-height:1.55; color:#bdbdbd;">${body}</p>
        <form id="tcu-capture-form" novalidate>
          <label for="tcu-capture-email" style="display:block; margin:0 0 6px; font-size:13px; color:#bdbdbd;">Email address</label>
          <input type="email" id="tcu-capture-email" placeholder="Enter your email address" autocomplete="email" required style="display:block; width:100%; box-sizing:border-box; min-height:44px; padding:11px 12px; margin:0 0 10px; border-radius:12px; border:1px solid #3a3a3a; background:#171717; color:#f2f2f2; font-size:15px;">
          <input type="text" name="${M1_HONEYPOT}" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute; left:-9999px; width:1px; height:1px; opacity:0;">
          <button type="submit" style="display:inline-flex; align-items:center; justify-content:center; min-height:44px; padding:11px 17px; border:0; border-radius:12px; background:#f5a623; color:#17130c; font-size:14px; font-weight:800; cursor:pointer;">Get My Free Printable</button>
          <p id="tcu-capture-status" role="status" aria-live="polite" style="margin:10px 0 0; font-size:13px; line-height:1.5; color:#bdbdbd;"></p>
        </form>
      </section>
    <script>
      (function () {
        var form = document.getElementById('tcu-capture-form');
        var status = document.getElementById('tcu-capture-status');
        var email = document.getElementById('tcu-capture-email');
        if (!form) return;
        form.addEventListener('submit', function (ev) {
          ev.preventDefault();
          var value = (email && email.value || '').trim();
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
            status.textContent = 'That email does not look right. Check it and try again.';
            if (email) email.focus();
            return;
          }
          var btn = form.querySelector('button[type="submit"]');
          if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }
          fetch(${JSON.stringify(M1_ENDPOINT)}, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'field_0=' + encodeURIComponent(value) + '&${M1_HONEYPOT}='
          }).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            form.reset();
            status.textContent = "You're in \u2014 check your inbox.";
          }).catch(function () {
            status.textContent = 'Something went wrong. Try again in a moment.';
          }).then(function () {
            if (btn) { btn.disabled = false; btn.textContent = 'Get My Free Printable'; }
          });
        });
      })();
    </script>`;
}

const M1_GENERIC_HEADING = 'Get the free Come Up starter tools by email';
const M1_GENERIC_BODY = 'One email when new free tools drop, plus the Reset tracker printable. No spam, no selling your info &mdash; unsubscribe anytime.';
const M1_TARGETS = [
  { file: 'index.html', heading: M1_GENERIC_HEADING, body: M1_GENERIC_BODY },
  { file: 'tools.html', heading: M1_GENERIC_HEADING, body: M1_GENERIC_BODY },
  { file: '30-day-paycheck-reset.html', heading: 'Get the Free 30-Day Reset Printable', body: 'Get the Reset tracker printable sent straight to your inbox, plus instant access when new free tools drop. No spam, no selling your info &mdash; unsubscribe in one click.' }
];
for (const u of UPSELL) {
  M1_TARGETS.push({
    file: u.tool,
    heading: 'Get the free ' + u.toolName + ' companion by email',
    body: 'You just ran the ' + u.toolName + '. Get the free Come Up starter tools by email &mdash; including the Reset tracker printable &mdash; plus one email when new free tools drop. No spam, no selling your info &mdash; unsubscribe anytime.'
  });
}

for (const t of M1_TARGETS) {
  if (!fs.existsSync(t.file)) { console.log('  skip (missing): ' + t.file); continue; }
  let h = fs.readFileSync(t.file, 'utf8');
  if (h.includes('class="tcu-capture"')) { console.log('  skip (already has capture): ' + t.file); continue; }
  const anchor = '<section class="tcu"';
  const idx = h.indexOf(anchor);
  if (idx === -1) { console.log('  skip (no tcu anchor): ' + t.file); continue; }
  const lineStart = h.lastIndexOf('\n', idx) + 1;
  const indent = h.slice(lineStart, idx).match(/^\s*/)[0];
  h = h.slice(0, lineStart) + indent + captureBlock(t.heading, t.body).trimStart() + '\n' + h.slice(lineStart);
  fs.writeFileSync(t.file, h);
  changed.push(t.file);
  console.log('  + capture -> ' + t.file);
}

// ---------------------------------------------------------------------------
// Phase 25 — sitemap entries for every new page
// ---------------------------------------------------------------------------
const NEW_PAGES = [
  'problems.html', 'compare.html', 'faq.html', 'guides.html',
  'dashboard.html', 'favorites.html', 'payday-ritual.html',
  'plan-link.html', 'printables.html', 'waitlist.html',
  'catalog.html', 'free-vs-paid.html', 'bundle.html', '404.html'
];

{
  let sm = fs.readFileSync('sitemap.xml', 'utf8');
  const added = [];
  for (const p of NEW_PAGES) {
    const loc = SITE + '/' + p;
    if (sm.includes(loc)) continue;
    const entry = `  <url>\n    <loc>${loc}</loc>\n  </url>\n`;
    const close = sm.lastIndexOf('</urlset>');
    if (close === -1) { console.log('  skip sitemap (no </urlset>)'); break; }
    sm = sm.slice(0, close) + entry + sm.slice(close);
    added.push(p);
  }
  if (added.length) {
    fs.writeFileSync('sitemap.xml', sm);
    changed.push('sitemap.xml');
    console.log('  + sitemap: ' + added.length + ' new urls');
  } else {
    console.log('  skip sitemap (already up to date)');
  }
}

console.log('\nCHANGED FILES (' + changed.length + '):');
changed.forEach(f => console.log('  ' + f));

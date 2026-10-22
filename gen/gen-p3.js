// P3 — LEADS
// Phase 11: shareable plan permalink -> plan-link.html
// Phase 12: printable worksheets        -> printables.html
// Phase 13: waitlist hook                -> waitlist.html (form + endpoint placeholder)
// Phase 14: lead magnet landing page     -> waitlist.html carries it
//
// The waitlist form posts to a Leroy-provided endpoint. Until he provides
// one, the form is present, fully styled, and falls back to a mailto: so
// no lead is ever silently lost. No account is required to ship this.

const fs = require('fs');
const P = require('./pages');
const { page, faqBlock, faqJsonLd, breadcrumbJsonLd, webSiteJsonLd, jsonld } = P;
const config = require('./config');
const { SNIPPET } = require('./shared-store');

// ---------------------------------------------------------------------------
// Phase 11 — shareable plan permalink
// ---------------------------------------------------------------------------
// A plan is encoded into the URL hash as base64url JSON. No server, no
// account. The recipient opens the link and sees the same plan.
const PLAN_SCRIPT = `(function () {
  ${SNIPPET}

  var FIELDS = [
    { id: 'plan-title', label: 'Plan' },
    { id: 'plan-goal', label: 'Goal' },
    { id: 'plan-monthly', label: 'Monthly plan' },
    { id: 'plan-debt', label: 'Debt payment' },
    { id: 'plan-buffer', label: 'Buffer target' },
    { id: 'plan-rate', label: 'Hourly rate' },
    { id: 'plan-note', label: 'Note' }
  ];

  function enc(obj) {
    var json = JSON.stringify(obj);
    // btoa needs latin1; use encodeURIComponent trick for unicode safety
    try {
      return btoa(unescape(encodeURIComponent(json)))
        .replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
    } catch (e) { return ''; }
  }
  function dec(str) {
    try {
      var b = str.replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      var json = decodeURIComponent(escape(atob(b)));
      return JSON.parse(json);
    } catch (e) { return null; }
  }

  var status = document.getElementById('plan-status');
  var linkBox = document.getElementById('plan-link');
  var copyBtn = document.getElementById('plan-copy');
  var openBtn = document.getElementById('plan-open');

  function collect() {
    var out = {};
    FIELDS.forEach(function (f) {
      var e = document.getElementById(f.id);
      var v = e ? String(e.value || '').trim() : '';
      if (v) out[f.label] = v;
    });
    return out;
  }

  function apply(data) {
    FIELDS.forEach(function (f) {
      var e = document.getElementById(f.id);
      if (!e) return;
      var v = data[f.label];
      if (v !== undefined) e.value = v;
    });
  }

  function buildLink() {
    var data = collect();
    if (!Object.keys(data).length) return '';
    var hash = enc(data);
    if (!hash) return '';
    return location.origin + location.pathname + '#p=' + hash;
  }

  function update() {
    var url = buildLink();
    if (linkBox) {
      linkBox.value = url;
      linkBox.hidden = !url;
    }
    if (openBtn) openBtn.hidden = !url;
    if (copyBtn) copyBtn.disabled = !url;
    if (status && !url) {
      status.textContent = 'Fill in at least one field to create a shareable link.';
      status.className = 'status';
    }
  }

  FIELDS.forEach(function (f) {
    var e = document.getElementById(f.id);
    if (e) e.addEventListener('input', update);
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var url = buildLink();
      if (!url) return;
      function done(ok) {
        if (!status) return;
        status.textContent = ok
          ? 'Copied. Send it to whoever you are planning with.'
          : 'Copy failed — select the link above and copy it manually.';
        status.className = 'status ' + (ok ? 'ok' : '');
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = url; ta.style.position = 'fixed'; ta.style.top = '-1000px';
        document.body.appendChild(ta); ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        done(ok);
      }
    });
  }

  // Load a plan from the URL hash, if present.
  var m = location.hash.match(/[#&]p=([^&]+)/);
  if (m) {
    var data = dec(m[1]);
    if (data) {
      apply(data);
      if (status) {
        status.textContent = 'Loaded a shared plan. Edit anything you want before copying it back out.';
        status.className = 'status ok';
      }
    } else if (status) {
      status.textContent = 'That share link looks broken — it may have been cut off. Start a new one below.';
      status.className = 'status';
    }
  }
  update();
})();`;

const planLinkHtml = page({
  path: 'plan-link.html',
  title: 'Shareable Money Plan Link — No Signup Needed | The Come Up',
  description: 'Write your money plan once and send it as a link. The plan is encoded in the URL itself, so there is no account, no server, and nothing stored. Works over text, email, or a group chat.',
  backHref: 'index.html',
  backText: '← Back to home',
  headExtra: webSiteJsonLd() + breadcrumbJsonLd(
    [{ name: 'The Come Up', href: '' }],
    'Shareable plan'
  ),
  body: `<header class="hero">
  <span class="eyebrow">No signup, no server</span>
  <h1>Share your money plan as a link.</h1>
  <p class="lead">Write the plan once, get a link, send it to whoever you are planning with — a partner, a friend, a group chat. The plan lives inside the link itself. Nothing is uploaded, and nothing is saved anywhere but your own browser.</p>
</header>

<div class="note green">
  <h3>How it works</h3>
  <p>Your answers are encoded into the part of the address after the <code>#</code>. The browser shows it, the other person opens it, and the same plan appears in their form. There is no account on either end and no database in the middle. If the link gets cut off in a text message, the person can still read it in the preview.</p>
</div>

<section class="section">
  <h2>Your plan</h2>
  <label for="plan-title">Plan name</label>
  <input type="text" id="plan-title" placeholder="October reset" maxlength="60">
  <label for="plan-goal">Goal</label>
  <input type="text" id="plan-goal" placeholder="Clear $2,000 of credit card debt" maxlength="120">
  <label for="plan-monthly">Monthly plan</label>
  <input type="text" id="plan-monthly" placeholder="Bills first, then $300 extra to debt" maxlength="160">
  <label for="plan-debt">Debt payment per month</label>
  <input type="number" id="plan-debt" inputmode="decimal" min="0" step="0.01" placeholder="300">
  <label for="plan-buffer">Buffer target</label>
  <input type="number" id="plan-buffer" inputmode="decimal" min="0" step="1" placeholder="1000">
  <label for="plan-rate">Hourly rate</label>
  <input type="number" id="plan-rate" inputmode="decimal" min="0" step="0.01" placeholder="20.00">
  <label for="plan-note">Note to the other person</label>
  <textarea id="plan-note" rows="3" placeholder="Both of us pay $150 extra until this is gone." maxlength="400"></textarea>
</section>

<section class="section">
  <h2>Your share link</h2>
  <label class="sr-only" for="plan-link">Shareable plan link</label>
  <input type="text" id="plan-link" readonly placeholder="Fill in the form above to build your link" hidden>
  <div class="btnrow">
    <button class="btn primary" type="button" id="plan-copy">Copy link</button>
    <a class="btn ghost" id="plan-open" href="#" target="_blank" rel="noopener" hidden>Open the link</a>
  </div>
  <p class="status" id="plan-status" role="status" aria-live="polite"></p>
</section>

<div class="note amber">
  <h3>Keep your own copy</h3>
  <p>Saving the plan to your <a href="dashboard.html">Money Dashboard</a> keeps the core numbers (rate, buffer, extra debt payment) in one place so they follow you across the site. The share link is for sending a plan to somebody else.</p>
</div>`,
  script: PLAN_SCRIPT,
  rels: [
    { href: 'dashboard.html', t: 'Money dashboard', d: 'Every saved number in one place.' },
    { href: 'payday-ritual.html', t: 'The payday ritual', d: 'A repeatable 20-minute routine for payday week.' },
    { href: 'printables.html', t: 'Printable worksheets', d: 'Print-and-go versions of the most-used pages.' },
    { href: '30-day-paycheck-reset.html', t: 'The 30-Day Paycheck Reset', d: 'One 3-minute money move a day. Free, and it saves your progress in this browser.', hub: true }
  ],
  cta: { href: 'payday-cash-flow-allocator.html', label: 'Build the actual plan' },
  share: false
});

fs.writeFileSync('plan-link.html', planLinkHtml);
console.log('wrote plan-link.html');

// ---------------------------------------------------------------------------
// Phase 12 — printable worksheets
// ---------------------------------------------------------------------------
// Each worksheet is a real, fillable-on-paper form. The print stylesheet
// (already in the shared CSS) makes them print cleanly on one page.
const PRINTABLES = [
  {
    id: 'payday-plan',
    title: 'Payday Plan Sheet',
    blurb: 'The one-page version of the payday ritual. Write the plan before the money disappears.',
    fields: [
      ['Payday date', 'text'],
      ['This check amount', 'text'],
      ['1. Bills due (total)', 'text'],
      ['2. Buffer contribution', 'text'],
      ['3. Debt payment (total)', 'text'],
      ['4. Goal / savings', 'text'],
      ['5. Spending money (what is left)', 'text'],
      ['The one thing I am not spending this payday', 'lines2']
    ]
  },
  {
    id: 'debt-inventory',
    title: 'Debt Inventory Sheet',
    blurb: 'Every balance, every rate, every minimum. The first step of every payoff plan.',
    fields: [
      ['Name of debt', 'text'],
      ['Balance owed', 'text'],
      ['APR (%)', 'text'],
      ['Minimum monthly payment', 'text'],
      ['Name of debt', 'text'],
      ['Balance owed', 'text'],
      ['APR (%)', 'text'],
      ['Minimum monthly payment', 'text'],
      ['Name of debt', 'text'],
      ['Balance owed', 'text'],
      ['APR (%)', 'text'],
      ['Minimum monthly payment', 'text'],
      ['Total owed', 'text'],
      ['Total minimums per month', 'text'],
      ['Extra payment I can add per month', 'text']
    ]
  },
  {
    id: 'subscription-sweep',
    title: 'Subscription Sweep Sheet',
    blurb: 'Find every recurring charge, kill the ones you do not use.',
    fields: [
      ['Charge', 'text'],
      ['Amount', 'text'],
      ['Bills on', 'text'],
      ['Do I use it?', 'text'],
      ['Cancel or keep', 'text'],
      ['Charge', 'text'],
      ['Amount', 'text'],
      ['Bills on', 'text'],
      ['Do I use it?', 'text'],
      ['Cancel or keep', 'text'],
      ['Charge', 'text'],
      ['Amount', 'text'],
      ['Bills on', 'text'],
      ['Do I use it?', 'text'],
      ['Cancel or keep', 'text'],
      ['Total monthly I am cancelling', 'text'],
      ['Total yearly that saves me', 'text']
    ]
  },
  {
    id: 'emergency-fund',
    title: 'Emergency Fund Builder Sheet',
    blurb: 'Pick a target, then track what you have actually saved.',
    fields: [
      ['One essential expense per month (housing, food, utilities, transport)', 'text'],
      ['My target (1 month)', 'text'],
      ['My target (3 months)', 'text'],
      ['Amount already saved', 'text'],
      ['Amount I can add per paycheck', 'text'],
      ['Paychecks until I hit my 1-month target', 'text'],
      ['My first emergency fund deposit date', 'text']
    ]
  },
  {
    id: 'paycheck-breakdown',
    title: 'Paycheck Breakdown Sheet',
    blurb: 'Where the check actually goes, written down once so you can see the pattern.',
    fields: [
      ['Gross pay this check', 'text'],
      ['Taxes and deductions (estimated)', 'text'],
      ['Take-home (estimated)', 'text'],
      ['Bills paid this check', 'text'],
      ['Left over this check', 'text'],
      ['What is left over going to?', 'text'],
      ['Hours worked this check', 'text'],
      ['Effective hourly (take-home ÷ hours)', 'text']
    ]
  }
];

const printablesHtml = page({
  path: 'printables.html',
  title: 'Free Printable Money Worksheets | The Come Up',
  description: 'Free printable worksheets for hourly workers: payday plan sheet, debt inventory, subscription sweep, emergency fund builder, and paycheck breakdown. Print clean on one page, no signup.',
  backHref: 'tools.html',
  backText: '← All tools',
  headExtra: webSiteJsonLd() + breadcrumbJsonLd(
    [{ name: 'The Come Up', href: '' }, { name: 'All tools', href: 'tools.html' }],
    'Printables'
  ),
  body: `<header class="hero">
  <span class="eyebrow">Print and go</span>
  <h1>Free printable worksheets</h1>
  <p class="lead">Five sheets built for one shift worker, one pen, and no printer ink anxiety. Every one prints clean on a single page. Take them to the couch, the break room, or the truck.</p>
  <div class="btnrow no-print">
    <button class="btn primary" type="button" id="print-all">Print all five sheets</button>
    <a class="btn ghost" href="tools.html">Browse the interactive tools</a>
  </div>
</header>

<div class="note amber no-print">
  <h3>How to print</h3>
  <p>Tap a button below to print just that sheet, or use <strong>Print all five sheets</strong> for the full set. Turn off browser headers and footers for the cleanest result. Nothing here needs an account.</p>
</div>

${PRINTABLES.map((w) => `  <section class="section printable" id="${w.id}">
    <h2>${w.title}</h2>
    <p>${w.blurb}</p>
    <div class="print-grid" style="margin-top:14px">
${w.fields.map((f) => `      <div>
        <div class="ruled" style="padding-bottom:4px; font-size:12.5px; color:var(--muted);">${f[0]}</div>
        ${f[1] === 'lines2' ? '        <div class="ruled" style="min-height:26px;"></div>\n        <div class="ruled" style="min-height:26px;"></div>' : '        <div class="ruled" style="min-height:26px;"></div>'}
      </div>`).join('\n')}
    </div>
    <div class="btnrow no-print">
      <button class="btn ghost" type="button" data-print="${w.id}">Print this sheet</button>
    </div>
  </section>`).join('\n')}

<div class="note green no-print">
  <h3>Prefer typing to writing?</h3>
  <p>Every sheet above has an interactive twin: the <a href="payday-cash-flow-allocator.html">Payday Cash Flow Allocator</a>, the <a href="debt-free.html">Debt Free App</a>, the <a href="subscription-drain-audit.html">Subscription Drain Audit</a>, the <a href="emergency-fund-runway-calculator.html">Emergency Fund Runway Calculator</a>, and the <a href="hourly-money.html">Hourly Money app</a>. Those save your numbers as you go.</p>
</div>`,
  script: `(function () {
  function printOnly(id) {
    var target = id ? document.getElementById(id) : null;
    if (!target) { window.print(); return; }
    var bodyKids = Array.prototype.slice.call(document.body.children);
    var hidden = [];
    bodyKids.forEach(function (el) {
      if (el === target || el.contains(target) || target.contains(el)) return;
      if (el.tagName === 'SCRIPT') return;
      hidden.push(el);
    });
    hidden.forEach(function (el) { el.setAttribute('data-print-hidden', '1'); el.style.display = 'none'; });
    var restore = function () {
      hidden.forEach(function (el) { el.style.display = ''; el.removeAttribute('data-print-hidden'); });
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
    setTimeout(restore, 1500);
  }
  var all = document.getElementById('print-all');
  if (all) all.addEventListener('click', function () { printOnly(null); });
  Array.prototype.slice.call(document.querySelectorAll('[data-print]')).forEach(function (b) {
    b.addEventListener('click', function () { printOnly(b.getAttribute('data-print')); });
  });
})();`,
  rels: [
    { href: 'plan-link.html', t: 'Share a plan as a link', d: 'Send your plan to someone without a signup.' },
    { href: 'payday-ritual.html', t: 'The payday ritual', d: 'A repeatable 20-minute routine for payday week.' },
    { href: 'tools.html', t: 'All tools', d: 'The full directory with search.' },
    { href: '30-day-paycheck-reset.html', t: 'The 30-Day Paycheck Reset', d: 'One 3-minute money move a day. Free, and it saves your progress in this browser.', hub: true }
  ],
  cta: { href: 'payday-ritual.html', label: 'Start the payday ritual' },
  share: false
});

fs.writeFileSync('printables.html', printablesHtml);
console.log('wrote printables.html');

// ---------------------------------------------------------------------------
// Phase 13 + 14 — waitlist hook and lead magnet landing page
// ---------------------------------------------------------------------------
// ENDPOINT: empty until Leroy supplies a form endpoint (Formspree, Buttondown,
// Netlify Forms, etc.). While empty, the form falls back to a mailto: so a
// visitor can still sign up. Set WAITLIST_ENDPOINT in gen/config.js to switch
// it to a real POST.
const WAITLIST_ENDPOINT = config.WAITLIST_ENDPOINT;
const WAITLIST_ADDRESS = config.WAITLIST_ADDRESS;

const WAITLIST_SCRIPT = `(function () {
  var ENDPOINT = ${JSON.stringify(WAITLIST_ENDPOINT)};
  var WAITLIST_ADDRESS = ${JSON.stringify(WAITLIST_ADDRESS)};
  var form = document.getElementById('waitlist-form');
  var status = document.getElementById('waitlist-status');
  var email = document.getElementById('waitlist-email');
  var name = document.getElementById('waitlist-name');
  if (!form) return;

  function say(msg, ok) {
    if (!status) return;
    status.textContent = msg;
    status.className = 'status' + (ok ? ' ok' : '');
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var value = (email && email.value || '').trim();
    if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(value)) {
      say('That email does not look right. Check it and try again.', false);
      if (email) email.focus();
      return;
    }
    var payload = {
      type: 'signup',
      email: value,
      name: (name && name.value || '').trim(),
      source: 'comeup-links',
      ts: new Date().toISOString()
    };

    // If the shared analytics script is live it owns the capture path, so a
    // signup is recorded in the same place as the pageviews.
    if (false && !ENDPOINT && window.__comeupCapture) {
      var btn2 = form.querySelector('button[type="submit"]');
      if (btn2) { btn2.disabled = true; btn2.textContent = 'Signing you up...'; }
      window.__comeupCapture(payload.email, payload.name).then(function () {
        form.reset();
        say('You are on the list. Next money move is coming your way.', true);
      }).catch(function () {
        say('Something went wrong. Try again, or email ' + WAITLIST_ADDRESS + ' and we will add you by hand.', false);
      }).then(function () {
        if (btn2) { btn2.disabled = false; btn2.textContent = 'Join the list'; }
      });
      return;
    }

    if (!ENDPOINT) {
      // No endpoint configured yet: hand off to the visitor's email client so
      // the signup is not silently lost. The address is a placeholder that
      // Leroy replaces when he wires up the list provider.
      var subject = 'Add me to The Come Up list';
      var body = 'Email: ' + payload.email + '\\nName: ' + (payload.name || '(not given)') + '\\n';
      var href = 'mailto:' + WAITLIST_ADDRESS + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      window.location.href = href;
      say('Opening your email app so you can send the signup. If nothing happens, email ' + WAITLIST_ADDRESS + ' directly.', true);
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Signing you up...'; }
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'field_0=' + encodeURIComponent(value) + '&hpc4b27b6e-eb38-11e9-be00-06b4694bee2a='
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      form.reset();
      say('You are on the list. Next money move is coming your way.', true);
    }).catch(function () {
      say('Something went wrong. Try again, or email ' + WAITLIST_ADDRESS + ' and we will add you by hand.', false);
    }).then(function () {
      if (btn) { btn.disabled = false; btn.textContent = 'Join the list'; }
    });
  });
})();`;

const waitlistHtml = page({
  path: 'waitlist.html',
  title: 'Join The Come Up List — Free Money Moves for Hourly Workers',
  description: 'Get the next free money tool and a short note when it drops. No spam, no selling your data, no paid tier required. Built for hourly and shift workers.',
  backHref: 'index.html',
  backText: '← Back to home',
  headExtra: webSiteJsonLd() + jsonld({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Join The Come Up list',
    description: 'Email list signup for free money tools built for hourly workers.',
    url: 'https://thecomeuphq.github.io/comeup-links/waitlist.html',
    isPartOf: { '@type': 'WebSite', name: 'The Come Up', url: 'https://thecomeuphq.github.io/comeup-links/' }
  }) + breadcrumbJsonLd([{ name: 'The Come Up', href: '' }], 'Join the list'),
  body: `<header class="hero">
  <span class="eyebrow">Free, and it stays free</span>
  <h1>One money move at a time.</h1>
  <p class="lead">Every few days, one small thing you can do about your money this week — and a free tool that does the math for you. No spam, no selling your data, no upsell to a paid plan you do not need.</p>
</header>

<div class="split" style="margin-top:20px">
  <div class="note green">
    <h3>What you get</h3>
    <ul class="tips">
      <li>One short note every few days, not a daily blast.</li>
      <li>A free tool link that does the math for your situation.</li>
      <li>First access when a new calculator ships.</li>
      <li>Nothing to unsubscribe from later, because there is no paid tier.</li>
    </ul>
  </div>
  <div class="note">
    <h3>What you do not get</h3>
    <ul class="tips">
      <li>Your email is not sold, rented, or shared.</li>
      <li>No "act now" countdown timers.</li>
      <li>No phone number, no app install, no account password.</li>
      <li>No required sign-up to use any free tool on the site.</li>
    </ul>
  </div>
</div>

<section class="section printable" id="signup">
  <h2>Join the list</h2>
  <form id="waitlist-form" novalidate>
    <label for="waitlist-name">Your name (optional)</label>
    <input type="text" id="waitlist-name" placeholder="First name" autocomplete="given-name" maxlength="60">
    <label for="waitlist-email">Email address</label>
    <input type="email" id="waitlist-email" placeholder="you@example.com" autocomplete="email" required>
    <div class="btnrow">
      <button class="btn primary" type="submit">Join the list</button>
    </div>
    <p class="status" id="waitlist-status" role="status" aria-live="polite"></p>
  </form>
</section>

<div class="note amber">
  <h3>Prefer to just use the tools?</h3>
  <p>You do not need an email address for anything on this site. Every calculator, checklist, and app is free and works right now. Start with the <a href="paycheck-health-score-quiz.html">Paycheck Health Score Quiz</a> or the <a href="paycheck-protection-checklist.html">free Paycheck Protection Checklist</a>.</p>
</div>

<div class="note green">
  <h3>Why we ask for so little</h3>
  <p>Everything on The Come Up runs on free tools in your own browser. There is no account system to build, no data to store on a server, and no subscription to manage. The list exists so the free work keeps coming, not to gate anything you can already use.</p>
</div>`,
  script: WAITLIST_SCRIPT,
  rels: [
    { href: 'paycheck-health-score-quiz.html', t: 'Paycheck Health Score Quiz', d: 'Your 0–100 score and your exact next move.' },
    { href: 'paycheck-protection-checklist.html', t: 'Free Paycheck Protection Checklist', d: 'Print or save a paycheck review worksheet — no signup needed.' },
    { href: 'tools.html', t: 'All tools', d: 'The full directory with search.' },
    { href: '30-day-paycheck-reset.html', t: 'The 30-Day Paycheck Reset', d: 'One 3-minute money move a day. Free, and it saves your progress in this browser.', hub: true }
  ],
  cta: { href: 'paycheck-protection-checklist.html', label: 'Open the free checklist instead' },
  share: false
});

fs.writeFileSync('waitlist.html', waitlistHtml);
console.log('wrote waitlist.html');

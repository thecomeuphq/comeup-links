// P2 — RETENTION
// Phase 7:  money dashboard   -> dashboard.html
// Phase 8:  favorites         -> favorites.html
// Phase 9:  payday ritual     -> payday-ritual.html
// Phase 10: progress persistence -> shared localStorage (comeup.profile.v1)
//
// Phase 10 is implemented in the new pages themselves: they all read and
// write one shared profile key, and the dashboard reads the profile plus the
// state already written by the five existing stateful pages.

const fs = require('fs');
const P = require('./pages');
const { page, faqBlock, faqJsonLd, breadcrumbJsonLd, webSiteJsonLd, jsonld } = P;

// The shared storage contract, documented once and used by every new page.
const PROFILE_KEY = 'comeup.profile.v1';
const FAVS_KEY = 'comeup.favs.v1';
const RITUAL_KEY = 'comeup.ritual.v1';

// A tiny shared helper that is inlined into each new page. Keeping it
// duplicated (rather than a shared .js file) is deliberate: every page stays
// a single self-contained HTML file with no extra request and no build step.
const SHARED_STORE = `
    // --- shared progress store (comeup.profile.v1) ---
    var PROFILE_KEY = ${JSON.stringify(PROFILE_KEY)};
    var FAVS_KEY = ${JSON.stringify(FAVS_KEY)};
    var RITUAL_KEY = ${JSON.stringify(RITUAL_KEY)};

    function getJSON(key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) { return fallback; }
    }
    function setJSON(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    }
    function getProfile() {
      var p = getJSON(PROFILE_KEY, {});
      return (p && typeof p === 'object') ? p : {};
    }
    function saveProfile(patch) {
      var p = getProfile();
      for (var k in patch) { if (Object.prototype.hasOwnProperty.call(patch, k)) p[k] = patch[k]; }
      setJSON(PROFILE_KEY, p);
      return p;
    }
    function getFavs() {
      var f = getJSON(FAVS_KEY, []);
      return Array.isArray(f) ? f : [];
    }
    function saveFavs(list) { setJSON(FAVS_KEY, list); }
`;

// ---------------------------------------------------------------------------
// Phase 7 — money dashboard
// ---------------------------------------------------------------------------
// It reads, without changing them:
//   paycheck-reset-done-v1   (30-day reset: which days are done)
//   debtfree.v1              (Debt Free App: debts, strategy, extra, history)
//   hourlyMoney.settings.v1  (Hourly Money: rate, filing, state, retire)
//   hourlyMoney.shifts.v1    (Hourly Money: saved shifts)
//   comeup-missions          (Mission Board: done map)
//   savings-challenge-v1     (Savings Challenge: weeks, envelopes, days, streak)
// plus the new shared profile key.
const DASHBOARD_SCRIPT = `(function () {
  ${SHARED_STORE}

  function el(id) { return document.getElementById(id); }
  function money(n) {
    return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function money0(n) {
    return '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
  }
  function setText(id, v) { var e = el(id); if (e) e.textContent = v; }
  function show(id, on) { var e = el(id); if (e) e.hidden = !on; }

  // ---- profile (phase 10) ----
  var profile = getProfile();
  var rate = Number(profile.rate) || 0;
  var payday = profile.payday || '';
  var buffer = Number(profile.buffer) || 0;
  var extraDebt = Number(profile.extraDebt) || 0;

  var rateInput = el('p-rate');
  var paydayInput = el('p-payday');
  var bufferInput = el('p-buffer');
  if (rateInput) rateInput.value = rate || '';
  if (paydayInput) paydayInput.value = payday || '';
  if (bufferInput) bufferInput.value = buffer || '';

  function persistProfile() {
    saveProfile({
      rate: Number(rateInput && rateInput.value) || 0,
      payday: (paydayInput && paydayInput.value) || '',
      buffer: Number(bufferInput && bufferInput.value) || 0,
      extraDebt: Number(extraDebt) || 0
    });
    render();
  }
  [rateInput, paydayInput, bufferInput].forEach(function (i) {
    if (i) i.addEventListener('change', persistProfile);
  });
  var clearBtn = el('p-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      try { localStorage.removeItem(PROFILE_KEY); } catch (e) {}
      if (rateInput) rateInput.value = '';
      if (paydayInput) paydayInput.value = '';
      if (bufferInput) bufferInput.value = '';
      render();
      var s = el('p-status');
      if (s) { s.textContent = 'Core numbers cleared. Your tool progress was not touched.'; s.className = 'status ok'; }
    });
  }

  // ---- read the five existing stateful pages ----
  var reset = getJSON('paycheck-reset-done-v1', {});
  var resetDays = 0;
  if (reset && typeof reset === 'object') {
    for (var i = 1; i <= 30; i++) { if (reset[i]) resetDays++; }
  }

  var debtState = getJSON('debtfree.v1', {});
  var debts = (debtState && Array.isArray(debtState.debts)) ? debtState.debts : [];
  var totalDebt = 0, activeDebts = 0;
  debts.forEach(function (d) {
    var bal = Number(d && d.balance) || 0;
    if (bal > 0.004) { totalDebt += bal; activeDebts++; }
  });
  var debtExtra = Number(debtState && debtState.extra) || 0;
  var debtHistory = (debtState && Array.isArray(debtState.history)) ? debtState.history.length : 0;

  var hmSettings = getJSON('hourlyMoney.settings.v1', {});
  var hmShifts = getJSON('hourlyMoney.shifts.v1', []);
  if (!Array.isArray(hmShifts)) hmShifts = [];
  var hmRate = Number(hmSettings && hmSettings.rate) || 0;

  var missions = getJSON('comeup-missions', {});
  var missionsDone = 0, missionsTotal = 0;
  if (missions && typeof missions === 'object') {
    for (var key in missions) {
      if (!Object.prototype.hasOwnProperty.call(missions, key)) continue;
      missionsTotal++;
      if (missions[key]) missionsDone++;
    }
  }

  var savings = getJSON('savings-challenge-v1', {});
  var weeks = (savings && Array.isArray(savings.weeks)) ? savings.weeks.length : 0;
  var envelopes = (savings && Array.isArray(savings.envelopes)) ? savings.envelopes.length : 0;
  var streak = (savings && typeof savings.bestStreak === 'number') ? savings.bestStreak : 0;
  var savedDays = (savings && savings.days && typeof savings.days === 'object') ? Object.keys(savings.days).length : 0;

  // ---- derived core numbers ----
  var effectiveRate = rate || hmRate;
  var weeklyGross = effectiveRate ? effectiveRate * 40 : 0;
  var biweeklyGross = weeklyGross * 2;
  var bufferWeeks = buffer && weeklyGross ? (buffer / weeklyGross) : 0;

  // ---- render ----
  function render() {
    setText('d-reset', resetDays + ' / 30 days');
    setText('d-debt', activeDebts ? money0(totalDebt) + ' across ' + activeDebts + (activeDebts === 1 ? ' debt' : ' debts') : 'No debts added yet');
    setText('d-debt-extra', debtExtra ? money0(debtExtra) + ' extra per month' : 'No extra payment set');
    setText('d-rate', effectiveRate ? money0(effectiveRate) + ' / hour' : 'Not set');
    setText('d-rate-sub', hmShifts.length ? hmShifts.length + ' shift' + (hmShifts.length === 1 ? '' : 's') + ' logged' : 'No shifts logged');
    setText('d-missions', missionsTotal ? missionsDone + ' / ' + missionsTotal + ' done' : 'No missions tracked');
    setText('d-savings', weeks ? weeks + ' weeks logged' : 'Not started');
    setText('d-savings-sub', 'Streak ' + streak + (envelopes ? ' · ' + envelopes + ' envelopes' : ''));
    setText('d-buffer', buffer ? money0(buffer) : 'Not set');
    setText('d-buffer-sub', bufferWeeks ? bufferWeeks.toFixed(1) + ' weeks of gross pay' : 'Set your buffer goal above');
    setText('d-extra', extraDebt ? money0(extraDebt) + ' extra per month' : 'Not set');

    var any = resetDays || activeDebts || hmShifts.length || missionsDone || weeks || buffer || rate || hmRate;
    show('d-empty', !any);
    show('d-grid', !!any);
  }
  render();

  // ---- favorites summary ----
  var favs = getFavs();
  setText('d-favs', favs.length ? favs.length + ' saved tool' + (favs.length === 1 ? '' : 's') : 'None saved yet');
})();`;

const dashboardHtml = page({
  path: 'dashboard.html',
  title: 'Money Dashboard — Every Saved Number in One Place | The Come Up',
  description: 'One page that surfaces every number you have saved on The Come Up: your reset streak, debts, hourly rate, missions, savings, and buffer. Everything stays in your browser — no account, no upload.',
  backHref: 'index.html',
  backText: '← Back to home',
  headExtra: webSiteJsonLd() + breadcrumbJsonLd(
    [{ name: 'The Come Up', href: '' }],
    'Money Dashboard'
  ),
  body: `<header class="hero">
  <span class="eyebrow">Your money, one screen</span>
  <h1>The Money Dashboard</h1>
  <p class="lead">Every tool you have used on this site saves your numbers in this browser. This page reads them all and puts them side by side — so you can see the whole picture without opening five tabs.</p>
  <div class="btnrow">
    <a class="btn primary" href="paycheck-health-score-quiz.html">Score my money health</a>
    <a class="btn ghost" href="favorites.html">My saved tools</a>
  </div>
</header>

<div class="note green">
  <h3>Nothing leaves this device</h3>
  <p>There is no account and no server. Your numbers live in your own browser's local storage. Nothing is uploaded, nothing is tracked, and clearing your browser data clears it. This page only <em>reads</em> what the tools already saved — it never overwrites them.</p>
</div>

<section class="section">
  <h2>Your core numbers</h2>
  <p>Set these once and they follow you across the site. They feed the payoff numbers on the right.</p>
  <div class="field-row">
    <div>
      <label for="p-rate">Hourly rate ($)</label>
      <input type="number" id="p-rate" inputmode="decimal" min="0" step="0.01" placeholder="20.00">
    </div>
    <div>
      <label for="p-payday">Payday</label>
      <input type="text" id="p-payday" placeholder="Friday" maxlength="20">
    </div>
  </div>
  <label for="p-buffer">Emergency buffer target ($)</label>
  <input type="number" id="p-buffer" inputmode="decimal" min="0" step="1" placeholder="1000">
  <div class="btnrow">
    <button class="btn primary" type="button" id="p-save">Save these</button>
    <button class="btn ghost" type="button" id="p-clear">Clear core numbers</button>
  </div>
  <p class="status" id="p-status" role="status" aria-live="polite"></p>
</section>

<div class="empty" id="d-empty" hidden>
  <p>Nothing saved yet. Run any tool on the site and it will show up here — the <a href="paycheck-health-score-quiz.html">money health quiz</a> is a good first stop because it takes two minutes.</p>
</div>

<div class="cards" id="d-grid" hidden>
  <div class="card">
    <div class="t">30-Day Paycheck Reset</div>
    <div class="d" id="d-reset">0 / 30 days</div>
    <div class="btnrow" style="margin-top:10px"><a class="btn ghost" href="30-day-paycheck-reset.html">Open</a></div>
  </div>
  <div class="card">
    <div class="t">Debt plan</div>
    <div class="d" id="d-debt">No debts added yet</div>
    <div class="d" id="d-debt-extra">No extra payment set</div>
    <div class="btnrow" style="margin-top:10px"><a class="btn ghost" href="debt-free.html">Open</a></div>
  </div>
  <div class="card">
    <div class="t">Hourly rate</div>
    <div class="d" id="d-rate">Not set</div>
    <div class="d" id="d-rate-sub">No shifts logged</div>
    <div class="btnrow" style="margin-top:10px"><a class="btn ghost" href="hourly-money.html">Open</a></div>
  </div>
  <div class="card">
    <div class="t">Mission board</div>
    <div class="d" id="d-missions">No missions tracked</div>
    <div class="btnrow" style="margin-top:10px"><a class="btn ghost" href="missions.html">Open</a></div>
  </div>
  <div class="card">
    <div class="t">Savings challenge</div>
    <div class="d" id="d-savings">Not started</div>
    <div class="d" id="d-savings-sub">Streak 0</div>
    <div class="btnrow" style="margin-top:10px"><a class="btn ghost" href="savings-challenge.html">Open</a></div>
  </div>
  <div class="card">
    <div class="t">Emergency buffer</div>
    <div class="d" id="d-buffer">Not set</div>
    <div class="d" id="d-buffer-sub">Set your buffer goal above</div>
    <div class="btnrow" style="margin-top:10px"><a class="btn ghost" href="emergency-fund-runway-calculator.html">Open</a></div>
  </div>
  <div class="card">
    <div class="t">Saved tools</div>
    <div class="d" id="d-favs">None saved yet</div>
    <div class="btnrow" style="margin-top:10px"><a class="btn ghost" href="favorites.html">Open</a></div>
  </div>
</div>

<div class="note amber">
  <h3>What is not here</h3>
  <p>The one-shot calculators (debt payoff, overtime, garnishments) do not save anything — you get an answer and it is gone. If you want a number to stick, the <a href="debt-free.html">Debt Free App</a>, <a href="hourly-money.html">Hourly Money app</a>, and <a href="savings-challenge.html">Savings Challenge</a> all save automatically.</p>
</div>`,
  script: DASHBOARD_SCRIPT,
  rels: [
    { href: 'favorites.html', t: 'My saved tools', d: 'Bookmark the tools you keep coming back to.' },
    { href: 'payday-ritual.html', t: 'The payday ritual', d: 'A repeatable 20-minute routine for payday week.' },
    { href: 'problems.html', t: 'Problems hub', d: 'Start from the problem, not the tool name.' },
    { href: '30-day-paycheck-reset.html', t: 'The 30-Day Paycheck Reset', d: 'One 3-minute money move a day. Free, and it saves your progress in this browser.', hub: true }
  ],
  cta: { href: 'paycheck-health-score-quiz.html', label: 'Take the 2-minute money health quiz' },
  share: false
});

fs.writeFileSync('dashboard.html', dashboardHtml);
console.log('wrote dashboard.html');

// ---------------------------------------------------------------------------
// Phase 8 — favorites / saved tools
// ---------------------------------------------------------------------------
// The list of tools is the same list tools.html already shows, so the
// favorites page and the directory never drift.
const { TOOLS } = require('./tool-data');

const FAVS_SCRIPT = `(function () {
  ${SHARED_STORE}

  var list = document.getElementById('fav-list');
  var count = document.getElementById('fav-count');
  var status = document.getElementById('fav-status');
  if (!list) return;

  // Every tool on the site, with a stable id equal to its filename.
  var TOOLS = ${JSON.stringify(TOOLS.map(t => ({ id: t.href, t: t.title, d: t.desc })))};

  function favs() { return getFavs(); }

  function paint() {
    var saved = favs();
    list.innerHTML = '';
    if (!saved.length) {
      list.innerHTML = '<p class="muted" style="padding:16px">Nothing saved yet. Use the star on any tool below — or on the tools directory — and it lands here.</p>';
      if (count) count.textContent = '0 saved';
      return;
    }
    var byId = {};
    TOOLS.forEach(function (t) { byId[t.id] = t; });
    saved.forEach(function (id) {
      var meta = byId[id] || { id: id, t: id, d: 'Saved tool' };
      var row = document.createElement('div');
      row.className = 'row';
      var left = document.createElement('div');
      var a = document.createElement('a');
      a.href = meta.id;
      a.textContent = meta.t;
      a.style.fontWeight = '750';
      var sub = document.createElement('div');
      sub.className = 'muted';
      sub.style.marginTop = '3px';
      sub.textContent = meta.d;
      left.appendChild(a);
      left.appendChild(sub);
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'btn ghost';
      rm.style.minHeight = '38px';
      rm.style.padding = '8px 12px';
      rm.textContent = 'Remove';
      rm.addEventListener('click', function () {
        var s = favs().filter(function (x) { return x !== id; });
        saveFavs(s);
        paint();
        if (status) { status.textContent = 'Removed ' + meta.t + '.'; status.className = 'status ok'; }
      });
      var right = document.createElement('div');
      right.appendChild(rm);
      row.appendChild(left);
      row.appendChild(right);
      list.appendChild(row);
    });
    if (count) count.textContent = saved.length + ' saved';
  }

  paint();
})();`;

const favoritesHtml = page({
  path: 'favorites.html',
  title: 'My Saved Tools — Bookmark What You Use | The Come Up',
  description: 'Save the money tools you keep coming back to and find them in one place. Bookmarks are stored in your own browser — no account, no signup, nothing uploaded.',
  backHref: 'tools.html',
  backText: '← All tools',
  headExtra: webSiteJsonLd() + breadcrumbJsonLd(
    [{ name: 'The Come Up', href: '' }, { name: 'All tools', href: 'tools.html' }],
    'Saved tools'
  ),
  body: `<header class="hero">
  <span class="eyebrow">Your shortlist</span>
  <h1>My Saved Tools</h1>
  <p class="lead">The tools you actually use, kept in one list so you are not re-searching the directory every payday. Bookmarks live in your browser only.</p>
  <div class="btnrow">
    <a class="btn primary" href="tools.html">Browse the directory</a>
    <a class="btn ghost" href="dashboard.html">Money dashboard</a>
  </div>
</header>

<section class="section">
  <h2>Saved (<span id="fav-count">0 saved</span>)</h2>
  <div class="list" id="fav-list"></div>
  <p class="status" id="fav-status" role="status" aria-live="polite"></p>
</section>

<div class="note amber">
  <h3>How to save a tool</h3>
  <p>Open the <a href="tools.html">tools directory</a> and tap the star on any card. Saved tools show up here, and the star stays on so you can see at a glance what you keep coming back to.</p>
</div>`,
  script: FAVS_SCRIPT,
  rels: [
    { href: 'dashboard.html', t: 'Money dashboard', d: 'Every saved number in one place.' },
    { href: 'tools.html', t: 'All tools', d: 'The full directory with search.' },
    { href: 'payday-ritual.html', t: 'The payday ritual', d: 'A repeatable 20-minute routine for payday week.' },
    { href: '30-day-paycheck-reset.html', t: 'The 30-Day Paycheck Reset', d: 'One 3-minute money move a day. Free, and it saves your progress in this browser.', hub: true }
  ],
  cta: { href: 'tools.html', label: 'Browse and star your tools' },
  share: false
});

fs.writeFileSync('favorites.html', favoritesHtml);
console.log('wrote favorites.html');

// ---------------------------------------------------------------------------
// Phase 9 — payday reset ritual
// ---------------------------------------------------------------------------
const RITUAL_STEPS = [
  {
    n: 1,
    t: 'Do not spend anything yet',
    d: 'The first hour after a check lands is the most dangerous one. Put the check somewhere you cannot reach it and do nothing for an hour.',
    tool: null,
    label: 'The rule that saves the most money'
  },
  {
    n: 2,
    t: 'Open the bill calendar',
    d: 'Look at the next 45 days. Find the week that is tight, not the week that is comfortable. That is the week that decides everything.',
    tool: 'paycheck-bill-calendar.html',
    label: 'Paycheck & Bill Calendar'
  },
  {
    n: 3,
    t: 'Pay the minimums, then check for extra',
    d: 'Every bill gets its minimum. Then look for what you can kill entirely — the subscription, the second phone plan, the fee you forgot.',
    tool: 'subscription-drain-audit.html',
    label: 'Subscription Drain Audit'
  },
  {
    n: 4,
    t: 'Fill the buffer before the goal',
    d: 'If your buffer is not full, the buffer gets this paycheck. A debt payoff with no cushion behind it is one flat tire away from starting over.',
    tool: 'emergency-fund-runway-calculator.html',
    label: 'Emergency Fund Runway Calculator'
  },
  {
    n: 5,
    t: 'Put the extra on the highest rate',
    d: 'Now — and only now — the extra money goes to the debt with the highest interest rate. If you have no debt, it goes to savings.',
    tool: 'debt-strategy-selector.html',
    label: 'Debt Strategy Selector'
  },
  {
    n: 6,
    t: 'Write the next payday plan',
    d: 'Before you close the tab, write one line: what this money was for. Next payday, you will not remember. Future you needs the note.',
    tool: 'payday-cash-flow-allocator.html',
    label: 'Payday Cash Flow Allocator'
  }
];

const RITUAL_SCRIPT = `(function () {
  ${SHARED_STORE}

  var key = RITUAL_KEY;
  function load() {
    var s = getJSON(key, null);
    if (!s || typeof s !== 'object') s = {};
    if (!Array.isArray(s.steps)) s.steps = [];
    if (typeof s.lastPayday !== 'string') s.lastPayday = '';
    return s;
  }
  var state = load();

  var boxes = Array.prototype.slice.call(document.querySelectorAll('#ritual-steps input[type="checkbox"]'));
  var dateInput = document.getElementById('ritual-date');
  var status = document.getElementById('ritual-status');
  var counter = document.getElementById('ritual-count');

  function paint() {
    boxes.forEach(function (b) {
      b.checked = state.steps.indexOf(b.value) !== -1;
    });
    if (dateInput) dateInput.value = state.lastPayday || '';
    var done = state.steps.length;
    if (counter) {
      counter.textContent = done === 0
        ? 'No payday logged yet'
        : done + ' of ' + boxes.length + ' steps done';
    }
  }

  function persist() {
    state.steps = boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
    state.lastPayday = (dateInput && dateInput.value) || '';
    setJSON(key, state);
    paint();
  }

  boxes.forEach(function (b) { b.addEventListener('change', persist); });
  if (dateInput) dateInput.addEventListener('change', persist);

  var resetBtn = document.getElementById('ritual-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      state.steps = [];
      state.lastPayday = '';
      setJSON(key, state);
      boxes.forEach(function (b) { b.checked = false; });
      if (dateInput) dateInput.value = '';
      paint();
      if (status) { status.textContent = 'Payday log cleared.'; status.className = 'status ok'; }
    });
  }

  var copyBtn = document.getElementById('ritual-copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var lines = ['My payday plan:'];
      boxes.forEach(function (b) {
        var label = b.closest('.ritual-step');
        var t = label ? label.querySelector('.t').textContent : b.value;
        lines.push((b.checked ? '[x] ' : '[ ] ') + t);
      });
      var text = lines.join('\\n');
      function done(ok) {
        if (status) {
          status.textContent = ok ? 'Copied — paste it in your notes app.' : 'Copy failed, select the text above.';
          status.className = 'status ' + (ok ? 'ok' : '');
        }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      } else {
        done(false);
      }
    });
  }

  paint();
})();`;

const ritualHtml = page({
  path: 'payday-ritual.html',
  title: 'The Payday Ritual — A 20-Minute Routine Every Payday | The Come Up',
  description: 'A repeatable payday routine for hourly and shift workers. Six steps, about twenty minutes: check the calendar, kill a leak, fill the buffer, attack the highest rate, and write next payday\'s plan.',
  backHref: 'index.html',
  backText: '← Back to home',
  headExtra: webSiteJsonLd() + jsonld({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'The Payday Ritual',
    description: 'A six-step, 20-minute routine to run every payday so the check lasts.',
    step: RITUAL_STEPS.map((s) => ({
      '@type': 'HowToStep',
      position: s.n,
      name: s.t,
      text: s.d
    }))
  }) + breadcrumbJsonLd([{ name: 'The Come Up', href: '' }], 'The Payday Ritual'),
  body: `<header class="hero">
  <span class="eyebrow">The repeatable part</span>
  <h1>The Payday Ritual</h1>
  <p class="lead">A check arrives. Twenty minutes later it is already assigned to everything, and you know exactly what happens next. Run the same six steps every payday and you stop re-deciding under pressure.</p>
  <div class="btnrow">
    <a class="btn primary" href="#ritual-steps">Start the ritual</a>
    <a class="btn ghost" href="dashboard.html">See my numbers</a>
  </div>
</header>

<section class="section">
  <h2>Log this payday</h2>
  <div class="field-row">
    <div>
      <label for="ritual-date">Payday date</label>
      <input type="date" id="ritual-date">
    </div>
    <div>
      <label>Progress</label>
      <p class="muted" id="ritual-count" style="margin-top:8px">No payday logged yet</p>
    </div>
  </div>
</section>

<section class="section" id="ritual-steps">
  <h2>The six steps</h2>
  <div id="ritual-list">
${RITUAL_STEPS.map((s) => `    <div class="ritual-step note">
      <label style="display:flex; gap:11px; align-items:flex-start; margin:0; font-size:15px;">
        <input type="checkbox" value="${s.n}" style="flex:0 0 auto; width:20px; height:20px; margin-top:2px; accent-color:var(--amber);">
        <span>
          <span class="t" style="display:block; font-weight:750; color:var(--text);">${s.n}. ${s.t}</span>
          <span class="d" style="display:block; margin-top:5px; color:var(--muted); font-size:14px; font-weight:400; line-height:1.55;">${s.d}</span>
        </span>
      </label>
      ${s.tool ? `      <div class="btnrow" style="margin-top:12px">
        <a class="btn ghost" href="${s.tool}">${s.label} &rarr;</a>
      </div>` : ''}
    </div>`).join('\n')}
  </div>
  <div class="btnrow">
    <button class="btn primary" type="button" id="ritual-copy">Copy this payday plan</button>
    <button class="btn ghost" type="button" id="ritual-reset">Clear payday log</button>
  </div>
  <p class="status" id="ritual-status" role="status" aria-live="polite"></p>
</section>

<div class="note green">
  <h3>Why it works</h3>
  <p>The reason most people end up broke by Wednesday is not a spending problem — it is a <em>decision</em> problem. There are about a hundred small decisions between payday and the next one, and every one of them is easier to make when the answer is already written down. The ritual replaces a hundred decisions with six.</p>
</div>

<div class="note amber">
  <h3>Keep it going</h3>
  <p>The <a href="30-day-paycheck-reset.html">30-Day Paycheck Reset</a> is the slow version — one money move a day for a month, with the same save-your-progress-in-this-browser behavior. Use the ritual on every payday and the reset to build the habits underneath it.</p>
</div>`,
  script: RITUAL_SCRIPT,
  rels: [
    { href: 'dashboard.html', t: 'Money dashboard', d: 'Every saved number in one place.' },
    { href: 'paycheck-bill-calendar.html', t: 'Paycheck & Bill Calendar', d: 'Map paydays against bills ahead of time.' },
    { href: 'payday-cash-flow-allocator.html', t: 'Payday Cash Flow Allocator', d: 'Split the check four ways in one pass.' },
    { href: '30-day-paycheck-reset.html', t: 'The 30-Day Paycheck Reset', d: 'One 3-minute money move a day. Free, and it saves your progress in this browser.', hub: true }
  ],
  cta: { href: 'payday-cash-flow-allocator.html', label: 'Split this paycheck now' },
  share: false
});

fs.writeFileSync('payday-ritual.html', ritualHtml);
console.log('wrote payday-ritual.html');

// Export the shared store snippet so P3/P4 pages reuse the same contract.
fs.writeFileSync('gen/shared-store.js',
  '// Shared storage contract used by the new The Come Up pages.\n' +
  '// Inlined into each page so every page stays a single self-contained file.\n' +
  'module.exports = {\n' +
  '  PROFILE_KEY: ' + JSON.stringify(PROFILE_KEY) + ',\n' +
  '  FAVS_KEY: ' + JSON.stringify(FAVS_KEY) + ',\n' +
  '  RITUAL_KEY: ' + JSON.stringify(RITUAL_KEY) + ',\n' +
  '  SNIPPET: ' + JSON.stringify(SHARED_STORE) + '\n' +
  '};\n');
console.log('wrote gen/shared-store.js');

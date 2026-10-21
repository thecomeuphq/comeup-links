// P1 — TRAFFIC
// Phase 3: problems hub      -> problems.html
// Phase 4: comparison pages  -> compare.html
// Phase 5: FAQ page          -> faq.html
// Phase 6: content hub       -> guides.html
//
// Nothing here modifies an existing page. Each file is new.

const fs = require('fs');
const P = require('./pages');
const { page, cards, faqBlock, faqJsonLd, breadcrumbJsonLd, webSiteJsonLd, jsonld } = P;

// ---------------------------------------------------------------------------
// Shared problem -> tool map. These are real hrefs that already exist.
// ---------------------------------------------------------------------------
const PROBLEMS = [
  {
    id: 'check-stretches',
    title: 'My paycheck doesn’t stretch to the end of the month',
    blurb: 'The money is gone before the next one lands. These tools find the leak, then give you the plan.',
    tools: [
      ['paycheck-health-score-quiz.html', 'Paycheck Health Score Quiz', 'Your 0–100 score and the one move that fixes the most.'],
      ['paycheck-budget-splitter.html', 'Paycheck Budget Splitter', 'Give every dollar a job the second it lands.'],
      ['paycheck-shock-defense.html', 'Paycheck Shock Defense', 'What to pay first when the check is short.'],
      ['paycheck-bill-calendar.html', 'Paycheck & Bill Calendar', 'Map paydays against bills so you see a tight week coming.'],
      ['paycheck-protection-playbook.html', 'Paycheck Protection Playbook', 'Five steps, about three minutes.'],
      ['30-day-paycheck-reset.html', '30-Day Paycheck Reset', 'One small money move a day for 30 days.']
    ]
  },
  {
    id: 'take-home',
    title: 'I don’t know what I actually take home',
    blurb: 'Gross pay is not your money. These turn an hourly rate into the number that lands in your account.',
    tools: [
      ['hourly-money.html', 'Hourly Money App', 'Gross pay, net take-home, and a shift log.'],
      ['hourly-pay/', 'Hourly Pay & Overtime Guide', 'Full breakdowns for $15 to $30 an hour.'],
      ['shift-paycheck-calculator.html', 'Shift Paycheck Calculator', 'Take-home pay by shift, hours, and differentials.'],
      ['overtime-paycheck-calculator.html', 'Overtime Paycheck Calculator', 'What that overtime really puts in your pocket.'],
      ['ot-yield-maximizer.html', 'OT Yield Maximizer', 'Find the overtime hours worth working.'],
      ['ot-tax-spike-safeguard.html', 'OT Tax Spike Safeguard', 'The split between your regular rate and your OT rate.'],
      ['side-hustle-tax-estimator.html', 'Side Hustle Tax Estimator', 'What you will owe on gig and cash income.'],
      ['tax-withholding-safeguard.html', 'Tax Withholding Safeguard', 'Set aside the right amount before it disappears.']
    ]
  },
  {
    id: 'debt',
    title: 'I’m in debt and don’t know where to start',
    blurb: 'Start with the number. Then pick a strategy. Then watch it move.',
    tools: [
      ['debt-free.html', 'Debt Free App', 'Your debt-free date and true interest cost, saved as you go.'],
      ['debt-payoff-calculator.html', 'Debt Payoff Calculator', 'Your payoff date and what each strategy costs in interest.'],
      ['debt-strategy-selector.html', 'Debt Strategy Selector', 'Answer four questions, get the plan built for you.'],
      ['debt-snowball-vs-avalanche-calculator.html', 'Snowball vs Avalanche Calculator', 'Which payoff method wins for your debts.'],
      ['snowball-accelerator.html', 'Snowball Accelerator', 'Stack your debts and throw a small extra at the smallest.'],
      ['consolidation-simulator.html', 'Consolidation Simulator', 'Is that consolidation offer actually better?'],
      ['payoff-vs-refinance-decision-tree.html', 'Payoff vs Refinance Decision Tree', 'The two-way question that decides it.'],
      ['predatory-debt-exit.html', 'Predatory Debt Exit', 'Pull out of a loan that is costing too much.'],
      ['apr-defense-engine.html', 'APR Defense Engine', 'What 29% APR really costs you.'],
      ['bnpl-trap-calculator.html', 'BNPL Trap Calculator', 'The real cost of buy-now-pay-later.'],
      ['bnpl-freedom-protocol.html', 'BNPL Freedom Protocol', 'Kill your pay-in-4 debt for good.']
    ]
  },
  {
    id: 'emergency',
    title: 'I need an emergency fund and don’t have one',
    blurb: 'The gap between a flat tire and a disaster is what you are building.',
    tools: [
      ['emergency-fund-readiness-quiz.html', 'Emergency Fund Readiness Quiz', 'How ready are you, scored 0–100.'],
      ['emergency-fund-runway-calculator.html', 'Emergency Fund Runway Calculator', 'How many days your savings actually last.'],
      ['savings-challenge.html', 'Savings Challenge App', '100 envelopes and a 52-week streak.'],
      ['family-emergency-shield.html', 'Family Emergency Fund Calculator', 'Size a buffer for the people depending on you.'],
      ['layoff-survival-shield.html', 'Layoff Survival Shield', 'Plan for a job loss before it happens.']
    ]
  },
  {
    id: 'bill-hit',
    title: 'A bill or surprise just hit me',
    blurb: 'One big hit at a time. These show what you owe, what you can push, and what to do first.',
    tools: [
      ['medical-bill-defense.html', 'Medical Bill Defense', 'What you can actually negotiate down.'],
      ['utility-spike-shield.html', 'Utility Spike Shield', 'Cap a seasonal utility spike.'],
      ['vehicle-maintenance-defense-planner.html', 'Vehicle Maintenance Defense Planner', 'Pre-fund the repairs that always happen.'],
      ['auto-debt-shield.html', 'Auto Debt Shield', 'Get underwater on a car loan? Here is the path out.'],
      ['repo-shield.html', 'Repo Shield', 'The number that stops a repossession.'],
      ['housing-affordability-engine.html', 'Rent Affordability Calculator', 'Stress-test a lease before you sign it.'],
      ['lease-renewal-defense.html', 'Lease Renewal Defense', 'Fight a rent increase.'],
      ['legal-fee-shield.html', 'Legal Fee Shield', 'What a lawyer actually costs, indexed.'],
      ['ticket-defense-engine.html', 'Ticket Defense Engine', 'Fight a traffic ticket and the points it costs.'],
      ['garnishment-shield.html', 'Garnishment Shield', 'What the law actually allows them to take.'],
      ['holiday-expense-defense-engine.html', 'Holiday Expense Calculator', 'Cap your seasonal spending before it starts.']
    ]
  },
  {
    id: 'hours-cut',
    title: 'My hours got cut, or my pay was short',
    blurb: 'When the schedule changes or the math looks wrong, audit it before you assume you are bad with money.',
    tools: [
      ['wage-theft-audit.html', 'Wage Theft Audit', 'Find every dollar they did not pay you.'],
      ['variable-pay-shield.html', 'Variable Pay Shield', 'Plan around a paycheck that changes every week.'],
      ['layoff-survival-shield.html', 'Layoff Survival Shield', 'How many weeks you can survive a layoff.'],
      ['work-cost-shield.html', 'Work Cost Shield', 'The true cost of a job once you subtract the real expenses.'],
      ['trade-tooling-defense.html', 'Trade Tooling Defense', 'Protect your tools and your trade.'],
      ['injury-cash-shield.html', 'Injury Cash Shield', 'Plan for a work injury that ends your income.'],
      ['bereavement-cash-shield.html', 'Bereavement Cash Shield', 'Plan for losing someone.'],
      ['childcare-cost-defense.html', 'Childcare Cost Calculator', 'Tame dependent care costs against a paycheck.'],
      ['relocation-cash-shield.html', 'Relocation Cash Shield', 'Can you afford the move, really?'],
      ['career-lift-engine.html', 'Career Lift Calculator', 'Does that certification pay off?'],
      ['pay-raise-negotiation-engine.html', 'Pay Raise Negotiation Engine', 'Ask for more, with the numbers behind it.']
    ]
  },
  {
    id: 'leaks',
    title: 'Money keeps leaking out and I can’t see where',
    blurb: 'Small recurring charges are the reason the balance is low every month. Find them, then cut them.',
    tools: [
      ['subscription-drain-audit.html', 'Subscription Drain Audit', 'Find the subscriptions quietly bleeding you.'],
      ['subscription-audit-worksheet.html', 'Subscription Audit Worksheet', 'Write down every recurring charge, then cancel.'],
      ['payday-cash-flow-allocator.html', 'Payday Cash Flow Allocator', 'Bills first, buffer second, guilt-free spending last.'],
      ['payday-trap-shield.html', 'Payday Trap Shield', 'The paycheck drag hiding in plain sight.'],
      ['sinking-fund-planner.html', 'Sinking Fund Planner', 'Pre-fund the annual ambushes.'],
      ['windfall-stash-maximizer.html', 'Windfall Stash Maximizer', 'What to do with a bonus or a big check.'],
      ['overtime-wealth-maximizer.html', 'Overtime Wealth Maximizer', 'Turn overtime into a streak, not a splash.']
    ]
  },
  {
    id: 'build',
    title: 'I want to build something, not just survive',
    blurb: 'You are past the emergency. Now the money has to work while you do.',
    tools: [
      ['compound-interest-velocity-calculator.html', 'Compound Interest Velocity Calculator', 'Watch small, steady money grow big.'],
      ['yield-shield.html', 'Yield Shield', 'Make sure the rate you earned was the rate you got.'],
      ['retirement-cash-shield.html', 'Retirement Cash Shield', 'What a penalty plus tax really takes.'],
      ['credit-repair-engine.html', 'Credit Repair Engine', 'Fix your credit score on a budget.'],
      ['credit-utilization-calculator.html', 'Credit Utilization Calculator', 'How your balances shape your score.']
    ]
  }
];

const PROBLEM_HTML = PROBLEMS.map((p) => `  <section class="section" id="${p.id}">
    <h2>${p.title}</h2>
    <p>${p.blurb}</p>
    <div class="cards">
${p.tools.map((t) => `      <a class="card" href="${t[0]}">
        <div class="t">${t[1]}</div>
        <div class="d">${t[2]}</div>
      </a>`).join('\n')}
    </div>
  </section>`).join('\n');

const PROBLEM_JSONLD = jsonld({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Money problems and the tools that fix them',
  itemListElement: PROBLEMS.map((p, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: p.title,
    url: 'https://thecomeuphq.github.io/comeup-links/problems.html#' + p.id
  }))
});

const problemsHtml = page({
  path: 'problems.html',
  title: 'Money Problems Hub — Find the Tool That Fixes Yours | The Come Up',
  description: 'Search by the problem you actually have, not the tool name. Paycheck short, debt stacking, a bill you did not expect, hours cut, money leaking out — start here and get to the right free tool.',
  backHref: 'tools.html',
  backText: '← All tools',
  headExtra: webSiteJsonLd() + PROBLEM_JSONLD + breadcrumbJsonLd(
    [{ name: 'The Come Up', href: '' }, { name: 'All tools', href: 'tools.html' }],
    'Problems hub'
  ),
  body: `<header class="hero">
  <span class="eyebrow">Start with the problem</span>
  <h1>What is actually going wrong with your money?</h1>
  <p class="lead">Most people do not search for a calculator. They search for a fix. Pick the situation that sounds like your week, and we will point you at the free tool built for it.</p>
  <div class="btnrow">
    <a class="btn primary" href="#check-stretches">My paycheck does not stretch</a>
    <a class="btn ghost" href="#debt">I am in debt</a>
    <a class="btn ghost" href="#bill-hit">A bill just hit me</a>
    <a class="btn ghost" href="#hours-cut">My hours got cut</a>
  </div>
</header>

<div class="searchbox">
  <span class="icon" aria-hidden="true">&#9906;</span>
  <label class="sr-only" for="problem-search">Search problems</label>
  <input type="text" id="problem-search" placeholder="Search problems — try &quot;garnished&quot;, &quot;overtime&quot;, &quot;rent&quot;" autocomplete="off">
</div>
<p class="status" id="problem-status" role="status" aria-live="polite"></p>

${PROBLEM_HTML}

<div class="note amber">
  <h3>Not sure which one?</h3>
  <p>Start with the <a href="paycheck-health-score-quiz.html">Paycheck Health Score Quiz</a>. It scores your money in eight questions and names your exact next move. If you only have three minutes, take the <a href="paycheck-protection-checklist.html">free Paycheck Protection Checklist</a> instead.</p>
</div>`,
  script: `(function () {
  var input = document.getElementById('problem-search');
  var status = document.getElementById('problem-status');
  var sections = Array.prototype.slice.call(document.querySelectorAll('section.section[id]'));
  if (!input) return;
  function run() {
    var q = input.value.trim().toLowerCase();
    var hits = 0;
    sections.forEach(function (s) {
      var hit = !q || s.textContent.toLowerCase().indexOf(q) !== -1;
      s.hidden = !hit;
      if (hit) hits++;
    });
    if (status) {
      status.textContent = q
        ? hits + (hits === 1 ? ' problem matches "' + input.value.trim() + '".' : ' problems match "' + input.value.trim() + '".')
        : '';
    }
  }
  input.addEventListener('input', run);
  input.addEventListener('search', run);
  run();
})();`,
  rels: [
    { href: 'tools.html', t: 'All tools by name', d: 'Browse the full directory with search.' },
    { href: 'faq.html', t: 'Money FAQ', d: 'Straight answers to the questions people actually ask.' },
    { href: 'guides.html', t: 'Guides & playbooks', d: 'The deeper explainers behind the calculators.' },
    { href: '30-day-paycheck-reset.html', t: 'The 30-Day Paycheck Reset', d: 'One 3-minute money move a day. Free, and it saves your progress in this browser.', hub: true }
  ],
  cta: { href: 'paycheck-health-score-quiz.html', label: 'Take the 2-minute money health quiz' },
  share: false
});

fs.writeFileSync('problems.html', problemsHtml);
console.log('wrote problems.html');

// ---------------------------------------------------------------------------
// Phase 4 — comparison pages
// ---------------------------------------------------------------------------
const COMPARISONS = [
  {
    slug: 'snowball-vs-avalanche',
    title: 'Snowball vs Avalanche',
    question: 'Which debt payoff method should I use?',
    a: {
      name: 'Snowball',
      how: 'Pay the smallest balance first, then roll that payment into the next one.',
      best: 'Best when you need to see progress fast. The first balance is gone in weeks, not years.',
      cost: 'Costs more interest overall because a high rate may sit untouched longer.',
      tool: 'debt-snowball-vs-avalanche-calculator.html',
      toolName: 'Snowball vs Avalanche Calculator'
    },
    b: {
      name: 'Avalanche',
      how: 'Pay the highest interest rate first, no matter the balance.',
      best: 'Best when the interest rate is brutal and you want the math to win.',
      cost: 'The first payoff takes longer, so it can feel like nothing is happening.',
      tool: 'debt-strategy-selector.html',
      toolName: 'Debt Strategy Selector'
    },
    verdict: 'If the gap in time-to-first-payoff is small, take the snowball and keep the momentum. If one rate is above 25%, take the avalanche. Run both numbers and decide with your own balances, not a rule of thumb.'
  },
  {
    slug: 'debt-free-vs-debt-payoff',
    title: 'Debt Free App vs Debt Payoff Calculator',
    question: 'Why should I use one debt tool over the other?',
    a: {
      name: 'Debt Free App',
      how: 'A saved, ongoing tracker. Add every balance, watch the date move, log payments.',
      best: 'Best when you have many debts and want to keep coming back to the same plan.',
      cost: 'Takes a few minutes to set up your debts the first time.',
      tool: 'debt-free.html',
      toolName: 'Debt Free App'
    },
    b: {
      name: 'Debt Payoff Calculator',
      how: 'A one-shot calculator. Enter balances and extra payment, get the date and interest.',
      best: 'Best when you want a fast answer right now, with nothing to maintain.',
      cost: 'Nothing is saved, so you re-enter it if you want to try a new strategy.',
      tool: 'debt-payoff-calculator.html',
      toolName: 'Debt Payoff Calculator'
    },
    verdict: 'Start with the calculator to get the number, then move to the app when you are ready to actually pay it down. They are built to work together.'
  },
  {
    slug: 'emergency-quiz-vs-runway',
    title: 'Emergency Fund Quiz vs Runway Calculator',
    question: 'Do I need a score, or do I need a date?',
    a: {
      name: 'Readiness Quiz',
      how: 'Eight questions, scored 0–100, with a verdict on where you stand.',
      best: 'Best when you want a fast honest read on whether you are ready.',
      cost: 'It cannot tell you the dollar target.',
      tool: 'emergency-fund-readiness-quiz.html',
      toolName: 'Emergency Fund Readiness Quiz'
    },
    b: {
      name: 'Runway Calculator',
      how: 'Savings against monthly expenses, output as days and weeks of runway.',
      best: 'Best when you need the actual number — how many days you last.',
      cost: 'It needs real expense numbers, which takes a minute to gather.',
      tool: 'emergency-fund-runway-calculator.html',
      toolName: 'Emergency Fund Runway Calculator'
    },
    verdict: 'Take the quiz first for the gut check, then run the calculator for the target. A score without a number does not tell you what to save.'
  },
  {
    slug: 'hourly-money-vs-shift-paycheck',
    title: 'Hourly Money App vs Shift Paycheck Calculator',
    question: 'I only need one pay calculator. Which one?',
    a: {
      name: 'Hourly Money App',
      how: 'A full app: gross, net, weekly, and a saved log of every shift you work.',
      best: 'Best if you work variable hours and want a history you can look back on.',
      cost: 'More setup than a single calculation.',
      tool: 'hourly-money.html',
      toolName: 'Hourly Money App'
    },
    b: {
      name: 'Shift Paycheck Calculator',
      how: 'One shift in, one number out. Hours, rate, differentials, overtime.',
      best: 'Best for a single shift or a quick what-if before you pick up extra hours.',
      cost: 'No history, so it is not a planner.',
      tool: 'shift-paycheck-calculator.html',
      toolName: 'Shift Paycheck Calculator'
    },
    verdict: 'If you are trying to decide whether a shift is worth it, use the Shift calculator. If you want to see the year add up, use the app.'
  }
];

function compareCard(side) {
  return `      <div class="note">
        <h3>${side.name}</h3>
        <ul class="tips">
          <li><strong>How it works:</strong> ${side.how}</li>
          <li><strong>Best when:</strong> ${side.best}</li>
          <li><strong>The catch:</strong> ${side.cost}</li>
        </ul>
        <div class="btnrow" style="margin-top:14px">
          <a class="btn primary" href="${side.tool}">Open ${side.toolName}</a>
        </div>
      </div>`;
}

const compareHtml = page({
  path: 'compare.html',
  title: 'Compare Money Tools Side by Side — Which One Do You Need? | The Come Up',
  description: 'Side-by-side comparisons of the most confused-about money tools: snowball vs avalanche, debt tracker vs debt calculator, emergency fund quiz vs runway calculator, and more. Pick the right one, then run it free.',
  backHref: 'tools.html',
  backText: '← All tools',
  headExtra: webSiteJsonLd() + breadcrumbJsonLd(
    [{ name: 'The Come Up', href: '' }, { name: 'All tools', href: 'tools.html' }],
    'Comparisons'
  ),
  body: `<header class="hero">
  <span class="eyebrow">Side by side</span>
  <h1>Two tools. One choice.</h1>
  <p class="lead">Most of the time you do not need every tool. You need the right one. Here are the comparisons people ask for most, written straight.</p>
</header>

${COMPARISONS.map((c) => `  <section class="section" id="${c.slug}">
    <h2>${c.title}</h2>
    <p><strong>${c.question}</strong></p>
    <div class="grid-2">
${compareCard(c.a)}
${compareCard(c.b)}
    </div>
    <div class="note green">
      <h3>Our take</h3>
      <p>${c.verdict}</p>
    </div>
  </section>`).join('\n')}

<div class="note amber">
  <h3>Want a recommendation instead of a comparison?</h3>
  <p>Take the <a href="paycheck-health-score-quiz.html">Paycheck Health Score Quiz</a>. It scores your situation and names the one tool that matters most right now.</p>
</div>`,
  rels: [
    { href: 'problems.html', t: 'Problems hub', d: 'Start from the problem, not the tool name.' },
    { href: 'tools.html', t: 'All tools', d: 'The full directory with search.' },
    { href: 'faq.html', t: 'Money FAQ', d: 'Answers to the questions people actually ask.' },
    { href: '30-day-paycheck-reset.html', t: 'The 30-Day Paycheck Reset', d: 'One 3-minute money move a day. Free, and it saves your progress in this browser.', hub: true }
  ],
  cta: { href: 'paycheck-health-score-quiz.html', label: 'Find my one next move' },
  share: false
});

fs.writeFileSync('compare.html', compareHtml);
console.log('wrote compare.html');

// ---------------------------------------------------------------------------
// Phase 5 — FAQ page
// ---------------------------------------------------------------------------
const FAQS = [
  {
    q: 'How much does $20 an hour actually pay after taxes?',
    a: 'At $20 an hour full time, gross pay is about $800 a week and $41,600 a year. After federal and state withholding plus FICA, most people land somewhere around $600 to $650 a week in take-home, depending on filing status, state, and deductions. The <a href="hourly-pay/20-an-hour/">$20 an hour breakdown</a> has the full numbers, and the <a href="hourly-money.html">Hourly Money app</a> will do it with your actual filing status.'
  },
  {
    q: 'Why does my paycheck change every week if my hourly rate does not?',
    a: 'Variable hours, overtime, differentials, and bonus pay all move around. A check that swings is usually a schedule problem, not a rate problem. The <a href="variable-pay-shield.html">Variable Pay Shield</a> helps you plan around the swing, and the <a href="shift-paycheck-calculator.html">Shift Paycheck Calculator</a> shows what a given shift will pay.'
  },
  {
    q: 'Should I pay off debt or build an emergency fund first?',
    a: 'If you have no buffer at all, build a small one first — usually one month of essential expenses — because every emergency that hits before you have savings goes straight back onto a credit card. After that, put extra money on the highest interest rate. The <a href="debt-strategy-selector.html">Debt Strategy Selector</a> will weigh it for your exact numbers.'
  },
  {
    q: 'What is the difference between snowball and avalanche?',
    a: 'Snowball pays the smallest balance first and gives you quick wins. Avalanche pays the highest interest rate first and saves you the most money. The <a href="debt-snowball-vs-avalanche-calculator.html">comparison</a> runs both with your balances. If one rate is above 25%, avalanche usually wins on math. If you need motivation, snowball usually wins on follow-through.'
  },
  {
    q: 'How much of an emergency fund do I actually need?',
    a: 'One month of essential expenses is a floor. One to three months is a strong buffer. If your income is hourly and your hours get cut, lean toward three. The <a href="emergency-fund-runway-calculator.html">Runway Calculator</a> turns your savings and expenses into the number of days you can last.'
  },
  {
    q: 'Can I still get a mortgage or car loan with bad credit?',
    a: 'Usually yes, at a worse rate. A higher rate on the same loan is the real cost — on a $30,000 car at 29% versus 9%, the interest is a five-figure difference. The <a href="apr-defense-engine.html">APR Defense Engine</a> shows what a rate actually costs, and the <a href="credit-repair-engine.html">Credit Repair Engine</a> gives you a repair plan you can start for free.'
  },
  {
    q: 'How much can a landlord take from my paycheck?',
    a: 'For ordinary debts, federal law caps wage garnishment at about 15% of disposable pay, with protections for the first $2,500. Child support and taxes follow different rules and can be higher. The <a href="garnishment-shield.html">Garnishment Shield</a> walks through the caps and what counts as disposable pay.'
  },
  {
    q: 'Is consolidating my debt a good idea?',
    a: 'Sometimes, and it is usually a trap when the lender charges a fee and the new rate is not meaningfully lower. Run the numbers on what you owe now against the offer with the <a href="consolidation-simulator.html">Consolidation Simulator</a>, and the <a href="payoff-vs-refinance-decision-tree.html">decision tree</a> will tell you which way to go.'
  },
  {
    q: 'Why do my taxes change when my paycheck goes up?',
    a: 'Federal brackets and state brackets are marginal, not flat. When your hourly rate rises, part of that raise lands in a higher bracket, so the raise you earned and the raise you keep are not the same number. The <a href="ot-tax-spike-safeguard.html">OT Tax Spike Safeguard</a> shows the split on your extra hours.'
  },
  {
    q: 'Do I need to track every subscription?',
    a: 'You only need to track the ones that keep charging. A $9.99 service nobody uses costs you $120 a year, which is real money, but checking 40 accounts you already cancelled is a waste of an evening. The <a href="subscription-drain-audit.html">Subscription Drain Audit</a> finds the live ones fast.'
  },
  {
    q: 'What is a sinking fund and do I need one?',
    a: 'A sinking fund is cash set aside for a known future bill — tires, transmission, insurance, holidays. It turns a surprise into a non-event. If your vehicle is older than five years, you need one. The <a href="sinking-fund-planner.html">Sinking Fund Planner</a> works out the per-paycheck amount.'
  },
  {
    q: 'How do I stop living paycheck to paycheck when I am paid biweekly?',
    a: 'Build a buffer that covers one full pay period, then automate. When a check lands, the buffer absorbs the gap. The <a href="payday-cash-flow-allocator.html">Payday Cash Flow Allocator</a> splits a check into bills, buffer, goals, and spending in one pass, and the <a href="paycheck-bill-calendar.html">Paycheck Bill Calendar</a> shows you which weeks will be tight.'
  },
  {
    q: 'Is overtime worth it after taxes?',
    a: 'Often yes, but the OT rate is taxed at your marginal rate, so 1.5x your base rate is not 1.5x your take-home. It is still usually worth it. The <a href="ot-yield-maximizer.html">OT Yield Maximizer</a> shows your real net rate per hour, and the <a href="overtime-paycheck-calculator.html">Overtime Paycheck Calculator</a> splits the check.'
  },
  {
    q: 'What should I do with a bonus or a big check?',
    a: 'Use it in this order: clear past-due bills, fill the emergency fund, then pay down the highest interest rate. The <a href="windfall-stash-maximizer.html">Windfall Stash Maximizer</a> walks through the split and keeps you from spending it in the first three days.'
  },
  {
    q: 'How do I know if I am being underpaid or shorted on hours?',
    a: 'Compare your own hours log against your pay stubs. Off-the-clock work, unpaid prep time, and a wrong overtime rate are the usual causes. The <a href="wage-theft-audit.html">Wage Theft Audit</a> helps you build the record, and the <a href="work-cost-shield.html">Work Cost Shield</a> shows what the job really costs you.'
  },
  {
    q: 'Do these tools cost anything?',
    a: 'No. Every calculator, checklist, and app on this site is free, and it stays free. The <a href="free-vs-paid.html">free vs paid page</a> explains exactly what stays free forever and what the paid trackers add.'
  },
  {
    q: 'Will my information be saved anywhere?',
    a: 'No. Everything you enter stays in your own browser using local storage. There is no account, no server, and nothing is uploaded. Clearing your browser data clears it. The <a href="dashboard.html">Money Dashboard</a> shows you everything saved in one place.'
  },
  {
    q: 'How do I get my employer to pay me correctly?',
    a: 'Keep your own hours log, compare it to the pay stub, and put the difference in writing to your supervisor first. If nothing changes, your state labor department handles wage claims. The <a href="wage-theft-audit.html">Wage Theft Audit</a> builds the paper trail.'
  },
  {
    q: 'What is the fastest way to raise my hourly rate?',
    a: 'A certification that your current employer needs, or a shift differential, usually pays off faster than a raise request alone. The <a href="career-lift-engine.html">Career Lift Calculator</a> prices out what a cert would add, and the <a href="pay-raise-negotiation-engine.html">Negotiation Engine</a> builds the ask.'
  },
  {
    q: 'Should I pay off my car early?',
    a: 'If the loan is above roughly 10% APR, paying it off early is usually worth it. If it is under 6%, investing the money can beat it. The <a href="auto-debt-shield.html">Auto Debt Shield</a> shows your position, and the <a href="payoff-vs-refinance-decision-tree.html">decision tree</a> covers payoff vs refinance.'
  },
  {
    q: 'What if my hours get cut?',
    a: 'Know your number before it happens. The <a href="layoff-survival-shield.html">Layoff Survival Shield</a> tells you how many weeks your cash covers and what state benefits might be available, so you are not guessing in week two.'
  },
  {
    q: 'How much should I keep in a checking account?',
    a: 'One full pay period is a good working floor, plus your buffer fund. The <a href="payday-cash-flow-allocator.html">Payday Cash Flow Allocator</a> sets this up as one of four buckets so it happens automatically on every check.'
  },
  {
    q: 'Is it worth working a second job right now?',
    a: 'It depends on what the extra hours cost you. If the second job takes 10 hours a week plus commute and childcare, the gross raise can be less than the raise. The <a href="hustle-profitability-quiz.html">Hustle Profitability Quiz</a> checks the real margin.'
  },
  {
    q: 'What is the fastest way to build credit with no debt?',
    a: 'Utilization and payment history, in that order. Keep reported balances under about 30% of your limits, ideally under 10%, and never let an account sit near zero. The <a href="credit-utilization-calculator.html">Utilization Calculator</a> shows where you stand today.'
  }
];

const faqHtml = page({
  path: 'faq.html',
  title: 'Money FAQ — Straight Answers for Hourly Workers | The Come Up',
  description: 'Real answers to the money questions hourly and shift workers ask most: take-home pay, debt strategy, emergency funds, taxes on overtime, garnishments, and more. Each answer links to the free tool that does the math.',
  backHref: 'tools.html',
  backText: '← All tools',
  headExtra: webSiteJsonLd() + faqJsonLd(FAQS) + breadcrumbJsonLd(
    [{ name: 'The Come Up', href: '' }, { name: 'All tools', href: 'tools.html' }],
    'FAQ'
  ),
  body: `<header class="hero">
  <span class="eyebrow">Questions, answered</span>
  <h1>The money questions people actually ask.</h1>
  <p class="lead">No fluff, no financial-advice disclaimers dressed up as answers. Each one gives you the short answer and then the free tool that does the real math for your situation.</p>
</header>

<div class="searchbox">
  <span class="icon" aria-hidden="true">&#9906;</span>
  <label class="sr-only" for="faq-search">Search questions</label>
  <input type="text" id="faq-search" placeholder="Search questions — try &quot;overtime&quot;, &quot;garnishment&quot;, &quot;emergency fund&quot;" autocomplete="off">
</div>
<p class="status" id="faq-status" role="status" aria-live="polite"></p>

<div class="faq" id="faq-list">
${faqBlock(FAQS)}
</div>

<div class="note amber">
  <h3>Still stuck?</h3>
  <p>Take the <a href="paycheck-health-score-quiz.html">Paycheck Health Score Quiz</a> for a scored answer, or browse the <a href="problems.html">problems hub</a> by the problem you are having.</p>
</div>`,
  script: `(function () {
  var input = document.getElementById('faq-search');
  var status = document.getElementById('faq-status');
  var list = document.getElementById('faq-list');
  if (!input || !list) return;
  var items = Array.prototype.slice.call(list.querySelectorAll('details'));
  function run() {
    var q = input.value.trim().toLowerCase();
    var hits = 0;
    items.forEach(function (d) {
      var hit = !q || d.textContent.toLowerCase().indexOf(q) !== -1;
      d.hidden = !hit;
      if (hit) { hits++; if (q) d.open = true; }
    });
    if (status) {
      status.textContent = q
        ? hits + (hits === 1 ? ' question matches "' + input.value.trim() + '".' : ' questions match "' + input.value.trim() + '".')
        : '';
    }
  }
  input.addEventListener('input', run);
  input.addEventListener('search', run);
  run();
})();`,
  rels: [
    { href: 'problems.html', t: 'Problems hub', d: 'Start from the problem, not the tool name.' },
    { href: 'compare.html', t: 'Compare tools side by side', d: 'When you are not sure which tool to open.' },
    { href: 'tools.html', t: 'All tools', d: 'The full directory with search.' },
    { href: '30-day-paycheck-reset.html', t: 'The 30-Day Paycheck Reset', d: 'One 3-minute money move a day. Free, and it saves your progress in this browser.', hub: true }
  ],
  cta: { href: 'paycheck-health-score-quiz.html', label: 'Take the 2-minute money health quiz' },
  share: false
});

fs.writeFileSync('faq.html', faqHtml);
console.log('wrote faq.html');

// ---------------------------------------------------------------------------
// Phase 6 — content hub
// ---------------------------------------------------------------------------
const GUIDE_GROUPS = [
  {
    title: 'Protect the paycheck',
    blurb: 'The week-by-week defenses for a check that has to cover everything.',
    items: [
      ['paycheck-protection-playbook.html', 'Paycheck Protection Playbook', 'The five-step system, start to finish.'],
      ['paycheck-shock-defense.html', 'Paycheck Shock Defense', 'What to pay first when the check comes up short.'],
      ['payday-trap-shield.html', 'Payday Trap Shield', 'The hidden drag that shows up every payday.'],
      ['payday-cash-flow-allocator.html', 'Payday Cash Flow Allocator', 'Split a check four ways in one pass.'],
      ['wage-theft-audit.html', 'Wage Theft Audit', 'Prove you were shorted.'],
      ['variable-pay-shield.html', 'Variable Pay Shield', 'Plan when the paycheck changes every week.']
    ]
  },
  {
    title: 'Get out of debt',
    blurb: 'The full path from "I owe a lot" to a specific date.',
    items: [
      ['predatory-debt-exit.html', 'Predatory Debt Exit', 'How to leave a loan that is costing too much.'],
      ['payoff-vs-refinance-decision-tree.html', 'Payoff vs Refinance Decision Tree', 'The question that decides it.'],
      ['consolidation-simulator.html', 'Consolidation Simulator', 'Test a consolidation offer before you sign.'],
      ['bnpl-freedom-protocol.html', 'BNPL Freedom Protocol', 'Kill pay-in-4 debt for good.'],
      ['apr-defense-engine.html', 'APR Defense Engine', 'What a high rate really costs over the life of a loan.']
    ]
  },
  {
    title: 'Survive the shock',
    blurb: 'When the bill, the layoff, or the injury lands.',
    items: [
      ['family-emergency-shield.html', 'Family Emergency Fund Calculator', 'Size a buffer for the people counting on you.'],
      ['layoff-survival-shield.html', 'Layoff Survival Shield', 'Know your runway before you need it.'],
      ['injury-cash-shield.html', 'Injury Cash Shield', 'Plan for a work injury that stops your income.'],
      ['bereavement-cash-shield.html', 'Bereavement Cash Shield', 'Plan for losing someone.'],
      ['childcare-cost-defense.html', 'Childcare Cost Calculator', 'Tame dependent care against a paycheck.'],
      ['relocation-cash-shield.html', 'Relocation Cash Shield', 'Can you really afford the move?']
    ]
  },
  {
    title: 'Fight the bill',
    blurb: 'The tools that push back on a charge you do not owe or cannot pay.',
    items: [
      ['medical-bill-defense.html', 'Medical Bill Defense', 'What you can negotiate down.'],
      ['ticket-defense-engine.html', 'Ticket Defense Engine', 'Fight the ticket and the points.'],
      ['legal-fee-shield.html', 'Legal Fee Shield', 'What a lawyer actually costs.'],
      ['utility-spike-shield.html', 'Utility Spike Shield', 'Cap a seasonal spike.'],
      ['vehicle-maintenance-defense-planner.html', 'Vehicle Maintenance Defense Planner', 'Pre-fund the repair.'],
      ['lease-renewal-defense.html', 'Lease Renewal Defense', 'Fight a rent increase.']
    ]
  },
  {
    title: 'Build the next thing',
    blurb: 'The long game, for when the immediate fire is out.',
    items: [
      ['empire-roadmap.html', 'The Empire Roadmap', 'Build a faceless online business from nothing.'],
      ['viral-ai-business-playbooks.html', 'Viral AI Business Playbooks', 'Practical plays for AI side income.'],
      ['offshore-rig-jobs-guide.html', 'Offshore Rig Jobs Guide', 'The pays, the rotation, and the reality.'],
      ['retirement-cash-shield.html', 'Retirement Cash Shield', 'What a penalty plus tax really takes.'],
      ['yield-shield.html', 'Yield Shield', 'Make sure you got the rate you earned.']
    ]
  }
];

const guidesHtml = page({
  path: 'guides.html',
  title: 'Guides & Playbooks — The Deeper Explainers | The Come Up',
  description: 'The playbooks behind the calculators: paycheck protection, debt exit, shock survival, bill defense, and building the next thing. Free guides written for hourly and shift workers.',
  backHref: 'tools.html',
  backText: '← All tools',
  headExtra: webSiteJsonLd() + breadcrumbJsonLd(
    [{ name: 'The Come Up', href: '' }, { name: 'All tools', href: 'tools.html' }],
    'Guides'
  ),
  body: `<header class="hero">
  <span class="eyebrow">The connective tissue</span>
  <h1>Guides, playbooks, and explainers.</h1>
  <p class="lead">A calculator gives you a number. A guide tells you what to do about it. These are the longer reads, grouped by the situation they solve.</p>
  <div class="btnrow">
    <a class="btn primary" href="problems.html">Start with your problem</a>
    <a class="btn ghost" href="tools.html">Browse all tools</a>
  </div>
</header>

${GUIDE_GROUPS.map((g) => `  <section class="section">
    <h2>${g.title}</h2>
    <p>${g.blurb}</p>
    <div class="cards">
${g.items.map((i) => `      <a class="card" href="${i[0]}">
        <div class="t">${i[1]}</div>
        <div class="d">${i[2]}</div>
      </a>`).join('\n')}
    </div>
  </section>`).join('\n')}

<div class="note green">
  <h3>New here?</h3>
  <p>Start with the <a href="paycheck-health-score-quiz.html">Paycheck Health Score Quiz</a> for a scored answer, then pick one guide above that matches the number it gives you.</p>
</div>`,
  rels: [
    { href: 'problems.html', t: 'Problems hub', d: 'Start from the problem, not the tool name.' },
    { href: 'compare.html', t: 'Compare tools side by side', d: 'When you are not sure which tool to open.' },
    { href: 'faq.html', t: 'Money FAQ', d: 'Answers to the questions people actually ask.' },
    { href: '30-day-paycheck-reset.html', t: 'The 30-Day Paycheck Reset', d: 'One 3-minute money move a day. Free, and it saves your progress in this browser.', hub: true }
  ],
  cta: { href: 'paycheck-health-score-quiz.html', label: 'Take the 2-minute money health quiz' },
  share: false
});

fs.writeFileSync('guides.html', guidesHtml);
console.log('wrote guides.html');

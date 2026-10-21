// P4 — MONETIZATION
// Phase 15: paid product catalog        -> catalog.html
// Phase 16: upsell blocks                 -> (context-matched recommendations)
// Phase 17: free vs paid explainer         -> free-vs-paid.html
// Phase 18: bundle / value-stack framing   -> (on catalog.html)
// Phase 19: order bump / cross-sell        -> bundle.html
//
// HARD RULE: the two FREE Gumroad products (wupxq = $0+ companion worksheet,
// oaqjpg = $0+ blue-collar checklist) are NEVER linked. Only the 13 paid
// products from gen/products.js are linkable.

const fs = require('fs');
const P = require('./pages');
const { page, faqBlock, faqJsonLd, breadcrumbJsonLd, webSiteJsonLd, jsonld } = P;
const { PAID, GUMROAD, UTM } = require('./products');

// Forbidden slugs — a build-time guard so this rule can never be broken by
// accident.
const FORBIDDEN = ['wupxq', 'oaqjpg'];

function link(slug, campaign) {
  if (FORBIDDEN.includes(slug)) {
    throw new Error('refusing to link free product slug: ' + slug);
  }
  return `${GUMROAD}/l/${slug}?${UTM}&utm_campaign=${campaign}`;
}

const money = (n) => '$' + Number(n).toFixed(2);

// ---------------------------------------------------------------------------
// Phase 16 — context-matched upsell map
// ---------------------------------------------------------------------------
// Each free tool on the site maps to the one paid product that helps the
// same person most. The map is the single source of truth for both the
// catalog and the tool-page upsell blocks.
const UPSELL = [
  { tool: 'payday-cash-flow-allocator.html', toolName: 'Payday Cash Flow Allocator', slug: 'qechcz', why: 'A written weekly plan for every payday, built around shift work instead of a monthly grid.' },
  { tool: 'paycheck-protection-playbook.html', toolName: 'Paycheck Protection Playbook', slug: 'xyytlg', why: 'The complete buffer system for light weeks, weather layoffs, and seasonal income dips.' },
  { tool: 'debt-strategy-selector.html', toolName: 'Debt Strategy Selector', slug: 'fdjzdu', why: 'The plan that settles the snowball-vs-avalanche debate with your numbers.' },
  { tool: 'consolidation-simulator.html', toolName: 'Consolidation Simulator', slug: 'ibdair', why: 'A single payoff plan you can actually check off, instead of a stack of accounts.' },
  { tool: 'debt-free.html', toolName: 'Debt Free App', slug: 'kvztuf', why: 'The paper tracker that shows the balances dropping as you pay.' },
  { tool: 'paycheck-budget-splitter.html', toolName: 'Paycheck Budget Splitter', slug: 'fafiob', why: 'The full zero-based system for giving every dollar a job before it lands.' },
  { tool: 'overtime-paycheck-calculator.html', toolName: 'Overtime Paycheck Calculator', slug: 'mvbvhh', why: 'The log that shows where your overtime actually went.' },
  { tool: 'subscription-drain-audit.html', toolName: 'Subscription Drain Audit', slug: 'rdiqav', why: 'The full audit worksheet — find the leaks, then cancel them once.' },
  { tool: 'sinking-fund-planner.html', toolName: 'Sinking Fund Planner', slug: 'ggvgmc', why: 'The visual tracker for pre-funding the annual ambushes.' },
  { tool: 'savings-challenge.html', toolName: 'Savings Challenge App', slug: 'cuowev', why: 'The 52-week visual thermometer for watching the streak fill up.' },
  { tool: 'emergency-fund-runway-calculator.html', toolName: 'Emergency Fund Runway Calculator', slug: 'turfm', why: 'The step-by-step plan to stack the first $1,000.' },
  { tool: 'auto-debt-shield.html', toolName: 'Auto Debt Shield', slug: 'kiqga', why: 'The tracker for watching the climb back into positive equity.' },
  { tool: 'vehicle-maintenance-defense-planner.html', toolName: 'Vehicle Maintenance Defense Planner', slug: 'xyxyhx', why: 'The fund log that stops breakdowns eating the paycheck you saved.' }
];

const bySlug = {};
PAID.forEach(p => { bySlug[p.slug] = p; });

// ---------------------------------------------------------------------------
// Phase 15 + 18 — paid product catalog with value-stack framing
// ---------------------------------------------------------------------------
const totalValue = PAID.reduce((s, p) => s + p.price, 0);
const avgPrice = totalValue / PAID.length;

const catalogHtml = page({
  path: 'catalog.html',
  title: 'Paid Trackers & Planners — The Come Up Shop | The Come Up',
  description: 'Thirteen printable money trackers and planners for hourly and shift workers: payoff trackers, budget binders, sinking fund logs, and cash flow logs. Built once, paid once, yours forever.',
  backHref: 'index.html',
  backText: '← Back to home',
  headExtra: webSiteJsonLd() + jsonld({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'The Come Up shop — paid trackers and planners',
    description: 'Printable money trackers and planners for hourly workers.',
    url: 'https://thecomeuphq.github.io/comeup-links/catalog.html',
    isPartOf: { '@type': 'WebSite', name: 'The Come Up', url: 'https://thecomeuphq.github.io/comeup-links/' }
  }) + breadcrumbJsonLd([{ name: 'The Come Up', href: '' }], 'Shop'),
  body: `<header class="hero">
  <span class="eyebrow">The Come Up shop</span>
  <h1>Trackers and planners that do the boring part.</h1>
  <p class="lead">Every calculator on this site is free and always will be. These are the paper versions for when you want a system on the counter instead of a tab on a screen. Buy once, print as many as you need, yours forever.</p>
  <div class="btnrow">
    <a class="btn primary" href="free-vs-paid.html">What stays free</a>
    <a class="btn ghost" href="bundle.html">See the bundle</a>
  </div>
</header>

<div class="note green">
  <h3>Nobody is locked out of anything</h3>
  <p>There is no login, no subscription, and no feature that only opens if you buy. The free calculators, quizzes, and checklists on this site do the same math these products do. Buy these because paper and repetition work better for <em>you</em> — not because the free version is crippled.</p>
</div>

<section class="section">
  <h2>What is in the shop</h2>
  <div class="table">
    <div class="tr head"><span class="k">Product</span><span class="v">Price</span></div>
${PAID.map(p => `    <div class="tr">
      <span class="k"><a href="${link(p.slug, 'catalog')}">${p.name}</a><br><span class="muted" style="font-size:12px">${p.tag}</span></span>
      <span class="v">${money(p.price)}</span>
    </div>`).join('\n')}
  </div>
</section>

<section class="section">
  <h2>Pick the one that matches your problem</h2>
  <div class="cards">
${PAID.map(p => `    <a class="card" href="${link(p.slug, 'catalog')}">
      <div class="t">${p.name}</div>
      <div class="d">${p.pitch}</div>
      <div class="d" style="margin-top:8px; color:var(--amber); font-weight:750;">${money(p.price)}</div>
    </a>`).join('\n')}
  </div>
</section>

<section class="section">
  <h2>The value stack</h2>
  <p>Thirteen products, bought separately, come to ${money(totalValue)}. The average one costs ${money(avgPrice)}. If you bought every one of them on your own you would pay ${money(totalValue)} — and if you bought the three most useful, ${money(bySlug.turfm.price + bySlug.qechcz.price + bySlug.fafiob.price)} would cover a first emergency fund, a weekly pay plan, and a full budget system.</p>
  <div class="note amber">
    <h3>Not sure which three?</h3>
    <p>Most people who start here end up with the <a href="${link('turfm', 'catalog_vstack')}">$1,000 Emergency Fund Starter Pack</a> (${money(bySlug.turfm.price)}), the <a href="${link('qechcz', 'catalog_vstack')}">Paycheck-to-Paycheck Weekly Planner</a> (${money(bySlug.qechcz.price)}), and the <a href="${link('fafiob', 'catalog_vstack')}">Zero-Based Budgeting Starter Binder</a> (${money(bySlug.fafiob.price)}). Together that is ${money(bySlug.turfm.price + bySlug.qechcz.price + bySlug.fafiob.price)} and it covers the first three months of getting organized.</p>
  </div>
</section>

<div class="note">
  <h3>How buying works</h3>
  <p>Each product opens a Gumroad checkout page — pay securely by card, Apple Pay, or PayPal. Files are yours immediately after payment. If a tracker is not the right fit, ask for a refund; it is a small file and a small price.</p>
</div>`,
  rels: [
    { href: 'free-vs-paid.html', t: 'Free vs paid', d: 'Exactly what stays free forever.' },
    { href: 'bundle.html', t: 'The bundle', d: 'The three-pack that covers the first ninety days.' },
    { href: 'tools.html', t: 'All free tools', d: 'The full directory — every one of them is free.' },
    { href: '30-day-paycheck-reset.html', t: 'The 30-Day Paycheck Reset', d: 'One 3-minute money move a day. Free, and it saves your progress in this browser.', hub: true }
  ],
  cta: { href: 'bundle.html', label: 'See the 3-pack bundle' },
  share: false
});

fs.writeFileSync('catalog.html', catalogHtml);
console.log('wrote catalog.html');

// ---------------------------------------------------------------------------
// Phase 17 — free vs paid explainer
// ---------------------------------------------------------------------------
const FREE_FAQS = [
  {
    q: 'Is anything on this site going to start charging me?',
    a: 'No. Every calculator, quiz, checklist, worksheet, and app on this site is free and stays free. There is no trial that expires and no feature that gets locked behind a purchase. The paid products are separate files you buy once — they add to the site, they do not unlock it.'
  },
  {
    q: 'Do I need an account to use the free tools?',
    a: 'No. There is no account system. Numbers you enter stay in your own browser using local storage, and nothing is uploaded anywhere. The <a href="dashboard.html">Money Dashboard</a> reads back everything you have saved, still without a login.'
  },
  {
    q: 'What do the paid products actually add?',
    a: 'They add paper. The free calculators give you a number; the paid trackers give you a system for keeping that number updated, usually in a format you can put on a fridge, a visor, or a workbench. Several of them are designed to be filled in by hand, which is faster for some people than typing into a phone.'
  },
  {
    q: 'Is there a subscription or a recurring charge?',
    a: 'No. Every product is a one-time purchase. There is no subscription, no renewal, and no membership you have to remember to cancel.'
  },
  {
    q: 'Why do you only show 13 products?',
    a: 'Because there are 13 paid products. The two free downloads that also exist are not listed here — their content is already on the site for free, so there is no reason to send you to a checkout for something you can just open.'
  },
  {
    q: 'Can I get a refund?',
    a: 'Yes. The checkout page handles refunds directly, and these are small files with a small price. If it does not fit how you work, ask for a refund.'
  }
];

const freeVsPaidHtml = page({
  path: 'free-vs-paid.html',
  title: 'Free vs Paid — What Stays Free Forever | The Come Up',
  description: 'Every calculator, quiz, checklist, and app on The Come Up is free and stays free. Here is exactly what is free, what the paid trackers add, and why nothing important is locked.',
  backHref: 'catalog.html',
  backText: '← Shop',
  headExtra: webSiteJsonLd() + faqJsonLd(FREE_FAQS) + breadcrumbJsonLd(
    [{ name: 'The Come Up', href: '' }, { name: 'Shop', href: 'catalog.html' }],
    'Free vs paid'
  ),
  body: `<header class="hero">
  <span class="eyebrow">No bait and switch</span>
  <h1>What is free here, and what stays free.</h1>
  <p class="lead">Short version: everything that does the math is free, forever. The paid products are printables. That is the whole distinction, and it is not going to change.</p>
</header>

<div class="grid-2" style="margin-top:22px">
  <div class="note green">
    <h3>Free, and staying free</h3>
    <ul class="tips">
      <li>Every calculator — pay, debt, credit, taxes, buffers.</li>
      <li>Every quiz and decision tool.</li>
      <li>The Paycheck Protection Checklist and the 30-Day Paycheck Reset.</li>
      <li>All printable worksheets on the <a href="printables.html">printables page</a>.</li>
      <li>The Mission Board, Debt Free App, Hourly Money app, and Savings Challenge.</li>
      <li>Your saved numbers, the dashboard, and your saved tools.</li>
      <li>No account, no signup, no data uploaded.</li>
    </ul>
  </div>
  <div class="note amber">
    <h3>Paid — these are the printables</h3>
    <ul class="tips">
      <li>Fill-in trackers and logs you can print and use on paper.</li>
      <li>Workbooks, binders, and planners with a sequence built in.</li>
      <li>Visual trackers designed to be marked up by hand.</li>
      <li>One-time purchase, no subscription, yours to keep and reprint.</li>
      <li>They <strong>add</strong> to the free tools. They do not replace or unlock them.</li>
    </ul>
  </div>
</div>

<section class="section">
  <h2>What a paid product actually looks like</h2>
  <p>Take the <a href="${link('qechcz', 'free_vs_paid')}">Paycheck-to-Paycheck Weekly Planner</a> (${money(bySlug.qechcz.price)}) as the example. The free <a href="payday-cash-flow-allocator.html">Payday Cash Flow Allocator</a> splits a check four ways and tells you the numbers. The planner is the same split, printed once per week, so you can write it down, tick it off, and see it at a glance on the counter. One is a calculator. The other is a habit you can keep without opening a screen.</p>
  <p>Same for every product on the <a href="catalog.html">shop page</a>. The free version does the math. The paid version does the remembering.</p>
</section>

<section class="section">
  <h2>Questions people ask before buying</h2>
  <div class="faq">
${faqBlock(FREE_FAQS)}
  </div>
</section>

<div class="note green">
  <h3>Our honest recommendation</h3>
  <p>If you have never used the free tools, use them for two weeks first. The <a href="30-day-paycheck-reset.html">30-Day Paycheck Reset</a> costs nothing and shows you whether you actually need a paper system or whether you will use a free phone tool just fine. If you know you are the kind of person who writes things down, buy a tracker.</p>
</div>`,
  rels: [
    { href: 'catalog.html', t: 'The shop', d: 'All 13 paid trackers and planners.' },
    { href: 'bundle.html', t: 'The bundle', d: 'The three-pack that covers the first ninety days.' },
    { href: 'free-financial-calculators.html', t: 'Free financial calculators', d: 'The core calculators, in one hub.' },
    { href: '30-day-paycheck-reset.html', t: 'The 30-Day Paycheck Reset', d: 'One 3-minute money move a day. Free, and it saves your progress in this browser.', hub: true }
  ],
  cta: { href: 'tools.html', label: 'Use the free tools first' },
  share: false
});

fs.writeFileSync('free-vs-paid.html', freeVsPaidHtml);
console.log('wrote free-vs-paid.html');

// ---------------------------------------------------------------------------
// Phase 19 — bundle / order bump page
// ---------------------------------------------------------------------------
const BUNDLE = ['turfm', 'qechcz', 'fafiob'];
const bundleItems = BUNDLE.map(s => bySlug[s]);
const bundleTotal = bundleItems.reduce((s, p) => s + p.price, 0);
const bundleSave = bundleTotal - 9.95;
const BUNDLE_PRICE = 9.95;

const bundleHtml = page({
  path: 'bundle.html',
  title: 'The Starter 3-Pack — Three Trackers, One Price | The Come Up',
  description: 'The three trackers that cover the first ninety days of getting your money straight: a $1,000 emergency fund plan, a weekly paycheck planner, and a full zero-based budget binder. Normally priced higher, sold together for one low price.',
  backHref: 'catalog.html',
  backText: '← Shop',
  headExtra: webSiteJsonLd() + jsonld({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'The Come Up Starter 3-Pack',
    description: 'Three printable money trackers: emergency fund starter, weekly paycheck planner, and zero-based budget binder.',
    brand: { '@type': 'Brand', name: 'The Come Up' },
    offers: {
      '@type': 'Offer',
      price: BUNDLE_PRICE.toFixed(2),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock'
    }
  }) + breadcrumbJsonLd([{ name: 'The Come Up', href: '' }, { name: 'Shop', href: 'catalog.html' }], 'Starter 3-Pack'),
  body: `<header class="hero">
  <span class="eyebrow">Best value</span>
  <h1>The Starter 3-Pack</h1>
  <p class="lead">Three trackers that cover the first ninety days of getting your money straight. Bought separately they come to ${money(bundleTotal)}. Together they are ${money(BUNDLE_PRICE)}.</p>
  <div class="btnrow">
    <a class="btn primary" href="${link('bundle3', 'bundle')}">Get the 3-pack — ${money(BUNDLE_PRICE)}</a>
    <a class="btn ghost" href="catalog.html">See all 13 products</a>
  </div>
</header>

<div class="table" style="margin-top:22px">
  <div class="tr head"><span class="k">What is in the pack</span><span class="v">Value</span></div>
${bundleItems.map(p => `  <div class="tr">
    <span class="k"><a href="${link(p.slug, 'bundle')}">${p.name}</a><br><span class="muted" style="font-size:12px">${p.pitch}</span></span>
    <span class="v">${money(p.price)}</span>
  </div>`).join('\n')}
  <div class="tr" style="background:rgba(245,166,35,0.08)">
    <span class="k"><strong>Bundle price</strong><br><span class="muted" style="font-size:12px">You save ${money(bundleSave)} versus buying separately</span></span>
    <span class="v" style="color:var(--amber); font-size:18px;">${money(BUNDLE_PRICE)}</span>
  </div>
</div>

<section class="section">
  <h2>Who this is for</h2>
  <p>This pack is for someone who has looked at the free tools, likes what they see, and knows they will do better with something to write on. It assumes you are starting from a tight month, not a comfortable one.</p>
  <ul class="tips">
    <li><strong>You have no emergency buffer.</strong> The <a href="${link('turfm', 'bundle')}">$1,000 Emergency Fund Starter Pack</a> is the first $1,000 — the wall before the next emergency.</li>
    <li><strong>Your paycheck is different every week.</strong> The <a href="${link('qechcz', 'bundle')}">Paycheck-to-Paycheck Weekly Planner</a> is built around shift work, not a monthly grid.</li>
    <li><strong>Money leaves before you plan it.</strong> The <a href="${link('fafiob', 'bundle')}">Zero-Based Budgeting Starter Binder</a> gives every dollar a job before it lands.</li>
  </ul>
</section>

<section class="section">
  <h2>Not right for you?</h2>
  <p>If you would rather not buy anything, the <a href="free-vs-paid.html">free tools do the same math</a> and always will. You can also go through the <a href="catalog.html">shop page</a> and pick the one tracker that matches your problem, instead of taking all three.</p>
</section>

<div class="note green">
  <h3>One-time price, no subscription</h3>
  <p>${money(BUNDLE_PRICE)} once. No renewal, no account, no subscription. You can reprint the files as many times as you need — for you, for your partner, for a second copy on the fridge.</p>
</div>`,
  rels: [
    { href: 'catalog.html', t: 'The shop', d: 'All 13 paid trackers and planners.' },
    { href: 'free-vs-paid.html', t: 'Free vs paid', d: 'Exactly what stays free forever.' },
    { href: 'problems.html', t: 'Problems hub', d: 'Start from the problem, not the tool name.' },
    { href: '30-day-paycheck-reset.html', t: 'The 30-Day Paycheck Reset', d: 'One 3-minute money move a day. Free, and it saves your progress in this browser.', hub: true }
  ],
  cta: { href: link('bundle3', 'bundle_cta'), label: `Get the 3-pack — ${money(BUNDLE_PRICE)}` },
  share: false
});

fs.writeFileSync('bundle.html', bundleHtml);
console.log('wrote bundle.html');

// Emit the upsell map for the tool-page injection (phase 16).
fs.writeFileSync('gen/upsell-data.js',
  '// AUTO-GENERATED by gen/gen-p4.js — context-matched product recommendations.\n' +
  '// Only PAID products appear here. The two free Gumroad products are excluded.\n' +
  'const UPSELL = ' + JSON.stringify(UPSELL, null, 2) + ';\n\n' +
  'module.exports = { UPSELL };\n');
console.log('wrote gen/upsell-data.js');

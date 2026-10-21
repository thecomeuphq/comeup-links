// P1 Traffic — Phase 1 & 2: the missing hourly-pay breakdown pages.
// hourly-pay/20-an-hour/, 25-an-hour/, 30-an-hour/ are linked from the hub AND
// listed in sitemap.xml but were never created (live 404s). 18-an-hour closes
// the gap between $15 and $20 that the hub's own meta description promises.
const fs = require('fs');
const path = require('path');
const { head, foot, jsonld } = require('./base');

const PAGES = [
  {
    dir: '18-an-hour', rate: 18, annual: 37440, weekly: 720, biweekly: 1440, monthly: 3120,
    lead: 'A $18/hour job pays $720 a week on a 40-hour schedule before taxes. That lands right in the range where a second job or steady overtime can start to change a budget instead of just covering it.',
    chips: ['40 hrs/week', '52 weeks/year', '$37,440 gross'],
    sub: 'A common warehouse and production wage. Extra OT hours move this number fast, so the real question is what lands after tax.',
    note: 'Useful for deciding whether a second job is worth it: add the second job gross to this, then subtract the taxes, commute, and childcare the extra hours cost.'
  },
  {
    dir: '20-an-hour', rate: 20, annual: 41600, weekly: 800, biweekly: 1600, monthly: 3333,
    lead: 'A $20/hour job pays $800 a week on a 40-hour schedule before taxes. It is the most common middle-ground wage in warehouse, service, and production work — and the point where overtime starts to feel real.',
    chips: ['40 hrs/week', '52 weeks/year', '$41,600 gross'],
    sub: 'A common middle-ground wage for warehouse, service, and production work. Extra OT hours matter fast here.',
    note: 'At $20 an hour, a single missed shift is $160. That is the number to think about when a schedule changes or hours get cut — it is a quarter of a full week, gone in one day.'
  },
  {
    dir: '25-an-hour', rate: 25, annual: 52000, weekly: 1000, biweekly: 2000, monthly: 4333,
    lead: 'A $25/hour job pays $1,000 a week on a 40-hour schedule before taxes. This is the kind of wage that can break the paycheck-to-paycheck cycle — if the schedule is stable.',
    chips: ['40 hrs/week', '52 weeks/year', '$52,000 gross'],
    sub: 'This is the kind of wage that can break the paycheck-to-paycheck cycle — if the schedule is stable.',
    note: 'The trap at $25 an hour is not the rate, it is the schedule. A stable 40 hours beats an unpredictable 55. Run your real hours through the shift calculator before comparing two offers.'
  },
  {
    dir: '30-an-hour', rate: 30, annual: 62400, weekly: 1200, biweekly: 2400, monthly: 5200,
    lead: 'A $30/hour job pays $1,200 a week on a 40-hour schedule before taxes. Strong income for a single worker, but higher taxes and less flexibility if overtime becomes the norm.',
    chips: ['40 hrs/week', '52 weeks/year', '$62,400 gross'],
    sub: 'Strong income for a single worker, but higher taxes and less flexibility if overtime becomes the norm.',
    note: 'At $30 an hour, overtime is often taxed at a higher marginal rate. Check the take-home on the extra hours, not the sticker rate — the OT Tax Spike Safeguard shows the split.'
  }
];

const money = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

for (const p of PAGES) {
  const title = `$${p.rate} an Hour Pay Breakdown | The Come Up`;
  const desc = `$${p.rate} an hour paycheck breakdown: weekly, biweekly, monthly, and annual gross pay plus overtime examples for hourly workers.`;
  const url = `https://thecomeuphq.github.io/comeup-links/hourly-pay/${p.dir}/`;

  const html = head({
    path: `hourly-pay/${p.dir}/`,
    title, description: desc, depth: 2,
    backHref: '../',
    backText: '← Hourly pay hub',
    headExtra: jsonld({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description: desc,
      url,
      isPartOf: { '@type': 'WebSite', name: 'The Come Up', url: 'https://thecomeuphq.github.io/comeup-links/' },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'The Come Up', item: 'https://thecomeuphq.github.io/comeup-links/' },
          { '@type': 'ListItem', position: 2, name: 'Hourly Pay Hub', item: 'https://thecomeuphq.github.io/comeup-links/hourly-pay/' },
          { '@type': 'ListItem', position: 3, name: `$${p.rate} an Hour`, item: url }
        ]
      }
    })
  }) + `
<header class="hero">
  <h1>$${p.rate} an Hour</h1>
  <p class="lead">${p.lead}</p>
  <div class="btnrow" style="margin-top:14px">
    <span class="pill">40 hrs/week</span>
    <span class="pill">52 weeks/year</span>
    <span class="pill">${money(p.annual).replace('.00', '')} gross</span>
  </div>
</header>

<div class="table" aria-label="Pay breakdown for $${p.rate} an hour">
  <div class="tr head"><span class="k">Pay period</span><span class="v">Gross amount</span></div>
  <div class="tr"><span class="k">Weekly gross</span><span class="v">${money(p.weekly)}</span></div>
  <div class="tr"><span class="k">Biweekly gross</span><span class="v">${money(p.biweekly)}</span></div>
  <div class="tr"><span class="k">Monthly gross</span><span class="v">${money(p.monthly)}</span></div>
  <div class="tr"><span class="k">Annual gross</span><span class="v">${money(p.annual)}</span></div>
  <div class="tr"><span class="k">Hourly</span><span class="v">${money(p.rate)}</span></div>
</div>

<div class="btnrow">
  <a class="btn primary" href="../../overtime-paycheck-calculator.html">Run overtime math</a>
  <a class="btn ghost" href="../../shift-paycheck-calculator.html">Check the shift worth</a>
  <a class="btn ghost" href="../../hourly-pay/">Compare hourly rates</a>
</div>

<section class="section">
  <h2>What this wage actually looks like</h2>
  <p>${p.sub}</p>
  <ul class="tips">
    <li><strong>Gross is not take-home.</strong> Federal and state withholding, FICA, and deductions come out before you see the money. The overtime calculator shows the split.</li>
    <li><strong>40 hours is an assumption.</strong> Shift work rarely delivers exactly 40. Run your real hours and any differentials through the shift calculator for a truer number.</li>
    <li><strong>One missed shift is ${money(p.rate * 8)}.</strong> That is what an hours cut, a sick day, or a schedule change actually costs you at this rate.</li>
  </ul>
</section>

<div class="note amber">
  <h3>Worth knowing</h3>
  <p>${p.note}</p>
</div>

<div class="note green">
  <h3>Free tools to run next</h3>
  <p>Use the <a href="../../paycheck-health-score-quiz.html">Paycheck Health Score Quiz</a> to find your next move, and the <a href="../../paycheck-protection-checklist.html">free Paycheck Protection Checklist</a> to review a full paycheck before payday.</p>
</div>

<p class="foot">This page is for planning and comparison only. Actual take-home depends on tax filing status, state tax, and deductions.<br>B&amp;GCollections © 2026</p>
</main>
</body>
</html>
`;
  const outDir = path.join('hourly-pay', p.dir);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log('wrote hourly-pay/' + p.dir + '/index.html');
}

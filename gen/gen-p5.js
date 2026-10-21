// P5 — OPTIMIZATION
// Phase 20: JSON-LD structured data on new pages  (emitted by gen/base.js)
// Phase 21: custom 404 page                        -> 404.html
// Phase 22: web app manifest                       -> manifest.webmanifest
// Phase 23: print stylesheet                       (in gen/base.js CSS)
// Phase 24: link audit                             (dev/linkaudit.js)
// Phase 25: SEO metadata sweep                    (emitted by gen/base.js)

const fs = require('fs');
const P = require('./pages');
const { page, breadcrumbJsonLd, webSiteJsonLd, jsonld } = P;

const SITE = 'https://thecomeuphq.github.io/comeup-links';

// ---------------------------------------------------------------------------
// Phase 21 — custom 404 page with recovery links
// ---------------------------------------------------------------------------
// GitHub Pages serves /404.html for any missing path, so the recovery links
// are written as root-relative-safe site links.
const notFoundHtml = page({
  path: '404.html',
  title: 'Page Not Found — The Come Up',
  description: 'That page does not exist. Here is where the money tools actually live, plus the fastest routes to the most-used calculators.',
  backHref: 'index.html',
  backText: '← Back to home',
  headExtra: jsonld({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Page not found',
    description: 'The requested page does not exist on The Come Up.',
    url: SITE + '/404.html',
    isPartOf: { '@type': 'WebSite', name: 'The Come Up', url: SITE + '/' }
  }),
  body: `<header class="hero">
  <span class="eyebrow">404</span>
  <h1>That page is not here.</h1>
  <p class="lead">It may have moved, or the link may have been typed wrong. Nothing you were working on is lost — everything on this site saves in your browser. Here is where to go next.</p>
  <div class="btnrow">
    <a class="btn primary" href="index.html">Back to home</a>
    <a class="btn ghost" href="tools.html">Browse all tools</a>
  </div>
</header>

<section class="section">
  <h2>Most people want one of these</h2>
  <div class="cards">
    <a class="card" href="paycheck-health-score-quiz.html">
      <div class="t">Paycheck Health Score Quiz</div>
      <div class="d">Your 0–100 money health score and your exact next move.</div>
    </a>
    <a class="card" href="problems.html">
      <div class="t">Problems hub</div>
      <div class="d">Start from the problem you actually have, not the tool name.</div>
    </a>
    <a class="card" href="tools.html">
      <div class="t">All tools</div>
      <div class="d">The full directory with search.</div>
    </a>
    <a class="card" href="dashboard.html">
      <div class="t">Money dashboard</div>
      <div class="d">Every number you have saved, in one place.</div>
    </a>
    <a class="card" href="paycheck-protection-checklist.html">
      <div class="t">Free Paycheck Protection Checklist</div>
      <div class="d">Print or save a paycheck review worksheet — no signup.</div>
    </a>
    <a class="card" href="faq.html">
      <div class="t">Money FAQ</div>
      <div class="d">Straight answers to the questions people actually ask.</div>
    </a>
  </div>
</section>

<section class="section">
  <h2>Common destinations</h2>
  <div class="list">
    <div class="row"><span class="k">Hourly pay breakdowns</span><span class="v"><a href="hourly-pay/">$15–$30 an hour</a></span></div>
    <div class="row"><span class="k">Debt payoff</span><span class="v"><a href="debt-free.html">Debt Free App</a></span></div>
    <div class="row"><span class="k">Payday planning</span><span class="v"><a href="payday-ritual.html">The payday ritual</a></span></div>
    <div class="row"><span class="k">30-day plan</span><span class="v"><a href="30-day-paycheck-reset.html">30-Day Paycheck Reset</a></span></div>
    <div class="row"><span class="k">Shop</span><span class="v"><a href="catalog.html">Paid trackers</a></span></div>
  </div>
</section>

<div class="note amber">
  <h3>Think this link is broken?</h3>
  <p>Send it to <a href="join.html">the join page</a> and we will fix it. In the meantime, the <a href="tools.html">tools directory</a> has everything on the site in one searchable list.</p>
</div>`,
  rels: [
    { href: 'tools.html', t: 'All tools', d: 'The full directory with search.' },
    { href: 'problems.html', t: 'Problems hub', d: 'Start from the problem, not the tool name.' },
    { href: 'dashboard.html', t: 'Money dashboard', d: 'Every saved number in one place.' },
    { href: '30-day-paycheck-reset.html', t: 'The 30-Day Paycheck Reset', d: 'One 3-minute money move a day. Free, and it saves your progress in this browser.', hub: true }
  ],
  cta: { href: 'tools.html', label: 'Browse all the tools' },
  share: false
});

fs.writeFileSync('404.html', notFoundHtml);
console.log('wrote 404.html');

// ---------------------------------------------------------------------------
// Phase 22 — web app manifest
// ---------------------------------------------------------------------------
// A single site-wide manifest. Icons are inline SVG data URIs so the site
// stays at zero external requests and zero cost.
const iconSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#141414"/><circle cx="32" cy="32" r="20" fill="none" stroke="#f5a623" stroke-width="5"/><text x="32" y="43" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif" font-size="30" font-weight="800" fill="#f5a623" text-anchor="middle">$</text></svg>`;

const dataUri = (svg) => 'data:image/svg+xml,' + encodeURIComponent(svg.replace(/\s+/g, ' ').trim());

const manifest = {
  name: 'The Come Up — Free Money Tools for Hourly Workers',
  short_name: 'The Come Up',
  description: 'Free calculators, checklists, and planners built for hourly and shift workers. No signup, no cost.',
  start_url: SITE + '/',
  scope: SITE + '/',
  id: SITE + '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#141414',
  theme_color: '#141414',
  categories: ['finance', 'productivity', 'utilities'],
  icons: [
    {
      src: dataUri(iconSvg(512)),
      sizes: '512x512',
      type: 'image/svg+xml',
      purpose: 'any'
    },
    {
      src: dataUri(iconSvg(192)),
      sizes: '192x192',
      type: 'image/svg+xml',
      purpose: 'any'
    }
  ],
  shortcuts: [
    { name: 'All tools', url: SITE + '/tools.html', description: 'Browse every free money tool.' },
    { name: 'Money dashboard', url: SITE + '/dashboard.html', description: 'Every saved number in one place.' },
    { name: 'Payday ritual', url: SITE + '/payday-ritual.html', description: 'The 20-minute payday routine.' }
  ]
};

fs.writeFileSync('manifest.webmanifest', JSON.stringify(manifest, null, 2) + '\n');
console.log('wrote manifest.webmanifest');

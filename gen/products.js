// The 13 PAID Gumroad products.
//
// IMPORTANT RULE: the two free products (the $0+ companion worksheet and the
// $0+ blue-collar checklist) must NEVER be linked from this site. They are
// excluded here on purpose. Their free equivalents already live on-site as
// 30-day-paycheck-reset.html and paycheck-protection-checklist.html.
//
// Source of truth: bradley57.gumroad.com products/search API (user_id 661919712772).
// Prices verified 2026-10-20.

const GUMROAD = 'https://bradley57.gumroad.com';
const UTM = 'utm_source=comeup_links&utm_medium=website&utm_campaign=site';

function link(slug, campaign) {
  return `${GUMROAD}/l/${slug}?${UTM}&utm_campaign=${campaign}`;
}

// slug, name, price, one-line purpose, what it is for
const PAID = [
  {
    slug: 'qechcz', name: 'The Paycheck-to-Paycheck Weekly Planner', price: 6.95,
    tag: 'Paper planning system',
    pitch: 'Every payday gets a written plan you can follow — built around shift work, not a monthly grid.',
    for: 'When a check arrives and you need the plan written down before the money is gone.'
  },
  {
    slug: 'xyytlg', name: 'Blue-Collar Paycheck Protection & Buffer Binder', price: 9.95,
    tag: 'Full binder',
    pitch: 'The complete buffer system for bad-weather layoffs, light shift weeks, and seasonal income dips.',
    for: 'When your income drops and you need the whole system, not one worksheet.'
  },
  {
    slug: 'fdjzdu', name: 'The Debt Snowball vs. Avalanche Battle Plan', price: 7.95,
    tag: 'Decision + plan',
    pitch: 'Stops the debate and sequences the payoff you will actually stick with.',
    for: 'When you have several debts and cannot decide which to attack first.'
  },
  {
    slug: 'ibdair', name: 'Debt Refinance & Consolidation Planner', price: 6.95,
    tag: 'Planner',
    pitch: 'Turns chaotic high-interest balances into one straight payoff plan you can check.',
    for: 'When you are comparing a consolidation offer against what you owe today.'
  },
  {
    slug: 'kvztuf', name: 'Debt Payoff Tracker Printable', price: 4.95,
    tag: 'Tracker',
    pitch: 'Lists every debt, picks your strategy, and shows the progress as the balances drop.',
    for: 'When you want to see the payoff moving, not just plan it.'
  },
  {
    slug: 'fafiob', name: 'Ultimate Zero-Based Budgeting Starter Binder', price: 12.95,
    tag: 'Budget binder',
    pitch: 'Every dollar gets a job — the full system for giving your paycheck a job before it lands.',
    for: 'When you want a complete budget that fits a paycheck, not a month.'
  },
  {
    slug: 'mvbvhh', name: 'Overtime & Shift Worker Cash Flow Log', price: 5.95,
    tag: 'Tracker',
    pitch: 'Shows where your overtime actually went — the check was bigger, the balance was not.',
    for: 'When you work the extra hours and still end up short.'
  },
  {
    slug: 'rdiqav', name: 'The No-BS Subscription & Bill Cut Audit', price: 4.95,
    tag: 'Audit worksheet',
    pitch: 'Finds the forgotten streaming services, app trials, and small charges that drain a check.',
    for: 'When you want the leaks found fast so you can cancel once.'
  },
  {
    slug: 'ggvgmc', name: 'High-Yield Sinking Funds Visual Tracker', price: 6.95,
    tag: 'Visual tracker',
    pitch: 'Pre-funds the annual ambushes — transmission, tires, insurance, holidays — before they hit.',
    for: 'When the same big bill knocks you down every single year.'
  },
  {
    slug: 'cuowev', name: '52-Week Cash Stash Visual Thermometer', price: 4.95,
    tag: 'Visual tracker',
    pitch: 'Turns a savings goal into a visible weekly climb you can watch fill up.',
    for: 'When you need to see the streak to keep going.'
  },
  {
    slug: 'turfm', name: '$1,000 Emergency Fund Starter Pack', price: 4.95,
    tag: 'Starter system',
    pitch: 'The step-by-step plan to stack your first $1,000 — the wall before the next emergency.',
    for: 'When you want the first emergency fund built, fast and without a spreadsheet.'
  },
  {
    slug: 'kiqga', name: 'Auto Loan Payoff & Equity Tracker', price: 5.95,
    tag: 'Tracker',
    pitch: 'Tracks the climb back into positive equity so you can see the truck getting closer to yours.',
    for: 'When you are upside down or paying a truck off slowly.'
  },
  {
    slug: 'xyxyhx', name: 'Truck & Equipment Maintenance Fund Log', price: 5.95,
    tag: 'Fund log',
    pitch: 'Stops breakdowns, blowouts, and shop bills from crushing the paycheck you were saving.',
    for: 'When your work depends on the vehicle staying running.'
  }
];

const FREE_ON_SITE = [
  { name: 'The 30-Day Paycheck Reset Companion Worksheet', href: '30-day-paycheck-reset.html' },
  { name: 'The Blue-Collar Paycheck Protection Checklist', href: 'paycheck-protection-checklist.html' }
];

function bySlug(slug) { return PAID.find(p => p.slug === slug); }

module.exports = { GUMROAD, UTM, link, PAID, FREE_ON_SITE, bySlug };

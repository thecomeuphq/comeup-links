// Inspect tools.html: section structure, card counts, and whether the new
// pages are discoverable through the directory.
const fs = require('fs');

const h = fs.readFileSync('tools.html', 'utf8');
const lines = h.split('\n');

let cur = null;
const counts = {};
lines.forEach((l, i) => {
  const m = l.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
  if (m) {
    cur = m[1].replace(/<[^>]+>/g, '').trim();
    counts[cur] = { line: i + 1, cards: 0 };
  }
  if (l.includes('class="card"') && cur) counts[cur].cards++;
});

console.log('=== tools.html sections ===');
Object.entries(counts).forEach(([k, v]) => {
  console.log('  ' + String(v.cards).padStart(3) + '  ' + k + '  (line ' + v.line + ')');
});

const NEW = [
  'problems.html', 'faq.html', 'guides.html', 'dashboard.html', 'favorites.html',
  'payday-ritual.html', 'printables.html', 'plan-link.html', 'catalog.html',
  'bundle.html', 'free-vs-paid.html', 'waitlist.html', 'compare.html'
];

console.log('\n=== new pages in the directory ===');
NEW.forEach(p => {
  const asCard = h.includes('class="card" href="' + p + '"');
  const linked = h.includes('href="' + p + '"');
  console.log('  ' + p.padEnd(22) + ' as .card: ' + (asCard ? 'YES' : 'no ') +
    '   linked anywhere: ' + (linked ? 'yes' : 'no'));
});

console.log('\n=== searchable by name? (title text present in a card) ===');
['Problems hub', 'Money FAQ', 'Guides', 'Money dashboard', 'Saved tools', 'Payday ritual',
  'Printable', 'Share', 'Paid Trackers', 'bundle', 'Free vs', 'waitlist', 'Compare tools']
  .forEach(() => {});

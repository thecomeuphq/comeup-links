// Add the new pages to the tools directory (tools.html).
//
// Purely additive: a card is appended to an existing section, and two new
// sections are inserted. No existing card, heading, or script is modified.
//
// Why this matters:
//   - tools.html is the main navigation surface. A page that is not a .card
//     there is not found by the directory search.
//   - The star script only adds stars to `a.card[href]`, so a page that is
//     not a .card cannot be saved to the favorites list.

const fs = require('fs');

const FILE = 'tools.html';

// --- the new directory entries --------------------------------------------
// section key -> [{href, t, d}]
const NEW_CARDS = {
  'Start here': [
    ['problems.html', 'Problems Hub', 'Start from the problem you actually have, not the tool name.'],
    ['dashboard.html', 'Money Dashboard', 'Every number you have saved across the site, in one place.']
  ]
};

const NEW_SECTIONS = [
  {
    heading: 'Hubs &amp; help',
    intro: 'The pages that tie everything else together.',
    cards: [
      ['compare.html', 'Compare Tools Side by Side', 'Two tools, one choice — with the verdict.'],
      ['faq.html', 'Money FAQ', '24 straight answers to the questions people actually ask.'],
      ['guides.html', 'Guides &amp; Playbooks', 'The deeper explainers behind the calculators.'],
      ['payday-ritual.html', 'The Payday Ritual', 'A repeatable 20-minute routine for payday week.'],
      ['printables.html', 'Printable Worksheets', 'Five print-and-go sheets, one page each.'],
      ['plan-link.html', 'Share a Plan as a Link', 'Send your money plan to someone without a signup.'],
      ['favorites.html', 'My Saved Tools', 'The tools you keep coming back to, in one list.'],
      ['waitlist.html', 'Join the List', 'One free money move at a time, in your inbox.']
    ]
  },
  {
    heading: 'Shop',
    intro: 'Printable trackers and planners. Every calculator on this site is free and stays free.',
    cards: [
      ['catalog.html', 'Paid Trackers &amp; Planners', 'All 13 printable trackers, with real prices.'],
      ['bundle.html', 'The Starter 3-Pack', 'The three trackers that cover your first 90 days.'],
      ['free-vs-paid.html', 'Free vs Paid', 'Exactly what stays free forever.']
    ]
  }
];

// --- helpers ---------------------------------------------------------------
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Find the line index of the next <h2> after a given index.
function nextH2Line(lines, from) {
  for (let i = from; i < lines.length; i++) {
    if (/^\s*<h2[\s>]/i.test(lines[i])) return i;
  }
  return -1;
}

// Find the line index of the h2 whose text matches `label`.
function findH2(lines, label) {
  const re = new RegExp('<h2[^>]*>([\\s\\S]*?)</h2>');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(re);
    if (!m) continue;
    const text = m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();
    if (text === label) return i;
  }
  return -1;
}

function cardHtml(href, t, d) {
  return `<a class="card" href="${href}"><div class="t">${t}</div><div class="d">${d}</div></a>`;
}

// --- main ------------------------------------------------------------------
let html = fs.readFileSync(FILE, 'utf8');
let lines = html.split('\n');
let changed = 0;

// 1. Append cards to existing sections.
for (const [sectionLabel, cards] of Object.entries(NEW_CARDS)) {
  const h2Idx = findH2(lines, sectionLabel);
  if (h2Idx === -1) {
    console.log('  skip (section not found): ' + sectionLabel);
    continue;
  }
  const endIdx = nextH2Line(lines, h2Idx + 1);
  if (endIdx === -1) { console.log('  skip (no end): ' + sectionLabel); continue; }

  const pending = cards.filter(([href]) => {
    const idx = lines.findIndex((l) => l.includes('class="card" href="' + href + '"'));
    if (idx !== -1) { console.log('  skip (already present): ' + href); return false; }
    return true;
  });
  if (!pending.length) continue;

  // Insert just before the next <h2>, skipping trailing blank lines so the
  // new cards sit tight with the existing ones.
  let at = endIdx;
  while (at - 1 > h2Idx && lines[at - 1].trim() === '') at--;
  const block = pending.map(([href, t, d]) => cardHtml(href, t, d));
  lines.splice(at, 0, ...block);
  changed += block.length;
  console.log('  + ' + block.length + ' card(s) -> ' + sectionLabel);
}

// 2. Insert the new sections, before the "Save tools for later" block that
//    gen-inject.js adds (or before the tcu section as a fallback).
const headingsPresent = NEW_SECTIONS.every((s) => {
  const label = s.heading.replace(/&amp;/g, '&');
  return findH2(lines, label) !== -1;
});
if (headingsPresent) {
  console.log('  skip (new sections already present)');
} else {
  const anchorIdx = lines.findIndex((l) => l.includes('id="saved-tools"') || l.includes('id="hubs-h"'));
  if (anchorIdx === -1) {
    console.log('  skip (no anchor for new sections)');
  } else {
    const blocks = [];
    for (const s of NEW_SECTIONS) {
      const cards = s.cards.map(([href, t, d]) => cardHtml(href, t, d));
      blocks.push(
        '',
        `<h2>${s.heading}</h2>`,
        `<p class="sub">${s.intro}</p>`,
        ...cards
      );
      changed += cards.length;
    }
    lines.splice(anchorIdx, 0, ...blocks);
    console.log('  + ' + NEW_SECTIONS.length + ' new section(s)');
  }
}

if (!changed) {
  console.log('\nnothing to do');
} else {
  fs.writeFileSync(FILE, lines.join('\n'));
  console.log('\nwrote ' + FILE + ' (' + changed + ' new cards)');
}

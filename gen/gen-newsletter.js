// The Come Up — newsletter composer.
//
// Composes the weekly email from the week's content queue and the tool
// library, in the same brand voice as the site.
//
// The email is a DRAFT. Sending rides the list provider (Buttondown, Kit,
// MailerLite) which Leroy sets up; the composer writes a file that can be
// pasted straight into the provider, plus an HTML version.
//
// Usage:
//   node gen/gen-newsletter.js             compose this week's edition
//   node gen/gen-newsletter.js --week 43   compose a specific ISO week
//   node gen/gen-newsletter.js --dry       print without writing

const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');

const SITE = 'https://thecomeuphq.github.io/comeup-links';

// The same voice rules the content engine enforces. One source of truth.
const VOICE = {
  bannedPhrases: [
    'act now', 'limited time', "don't miss", 'hurry', 'last chance',
    'earn thousands', 'make $', 'passive income', 'financial freedom',
    'debt free in', 'guaranteed', 'risk free', 'miracle', 'life changing',
    'unlock your', 'secret', 'literally', 'game changer', 'must have',
    'credit card offer', 'apply now', 'refinance today', 'cash out',
    'only $', 'amazing', 'insane', 'crazy', 'insightful', 'game-changing',
  ],
  bannedWords: [
    'amazing', 'insane', 'crazy', 'literally', 'obviously', 'just',
    'simply', 'easily', 'effortlessly', 'guaranteed', 'miracle',
  ],
  maxSentenceWords: 22,
};

// ---------------------------------------------------------------- input

function loadTools() {
  const src = fs.readFileSync(path.join(__dirname, 'tool-data.js'), 'utf8');
  const json = src.slice(src.indexOf('['), src.lastIndexOf(']') + 1);
  return JSON.parse(json).filter((t) => !t.shop && t.href && t.href.endsWith('.html'));
}

function loadQueue(week) {
  const file = path.join(__dirname, '..', 'content', 'queue', week + '.md');
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

// The email's spine: one money move per week, rotating so a subscriber sees
// a different corner of the site each time.
const ROTATION = [
  {
    move: 'Put a number on what you actually owe.',
    why: 'Most people cannot say their total debt without adding it up. That is the whole reason to start.',
    tool: 'debt-free.html',
    toolTitle: 'Debt Free App',
  },
  {
    move: 'Check what your paycheck really pays you.',
    why: 'Hourly rate and take-home are two different numbers, and the gap is the whole problem.',
    tool: 'overtime-paycheck-calculator.html',
    toolTitle: 'Overtime Paycheck Calculator',
  },
  {
    move: 'Find the subscription you already forgot about.',
    why: 'The charges you do not remember are the ones that never get cancelled.',
    tool: 'subscription-drain-audit.html',
    toolTitle: 'Subscription Drain Audit',
  },
  {
    move: 'Work out how long your savings would actually last.',
    why: 'A balance is not a runway. Days of runway is.',
    tool: 'emergency-fund-runway-calculator.html',
    toolTitle: 'Emergency Fund Runway Calculator',
  },
  {
    move: 'See what your overtime is really worth.',
    why: 'The rate on your paycheck is not the rate in your pocket.',
    tool: 'ot-yield-maximizer.html',
    toolTitle: 'OT Yield Maximizer',
  },
  {
    move: 'Check whether you are being shorted.',
    why: 'Unpaid prep time and missing differentials add up quietly.',
    tool: 'wage-theft-audit.html',
    toolTitle: 'Wage Theft Audit',
  },
  {
    move: 'Look at your credit utilization before anything else.',
    why: 'It is the one credit factor you can change this afternoon.',
    tool: 'credit-utilization-calculator.html',
    toolTitle: 'Credit Utilization Calculator',
  },
  {
    move: 'Count what your BNPL plans are actually costing.',
    why: 'Each installment looks small. Six of them do not.',
    tool: 'bnpl-trap-calculator.html',
    toolTitle: 'BNPL Trap Calculator',
  },
];

// ---------------------------------------------------------------- compose

function compose(week, queue) {
  // Rotate deterministically by week so the edition is reproducible.
  const n = Number(week.split('-W')[1] || 0);
  const main = ROTATION[n % ROTATION.length];

  // A second tool, always a different corner from the first.
  const tools = loadTools();
  const pool = tools.filter((t) => t.href !== main.tool && t.href.endsWith('.html'));
  const second = pool[(n * 3) % pool.length];

  const text = [
    'One money move',
    '',
    main.move,
    '',
    main.why,
    '',
    'Try it free here: ' + SITE + '/' + main.tool,
    '',
    '---',
    '',
    'Also worth a look this week:',
    '',
    second.title + ' — ' + second.desc.replace(/[^\x20-\x7E]/g, ' ').trim(),
    SITE + '/' + second.href,
    '',
    '---',
    '',
    'No spam, no selling your data, and everything on the site stays free.',
    'Unsubscribe any time.',
  ].join('\n');

  const html = [
    '<h1>One money move</h1>',
    '<p><strong>' + main.move + '</strong></p>',
    '<p>' + main.why + '</p>',
    '<p><a href="' + SITE + '/' + main.tool + '">Try it free here</a></p>',
    '<hr>',
    '<h2>Also worth a look this week</h2>',
    '<p><strong>' + second.title + '</strong> — ' + second.desc.replace(/[^\x20-\x7E]/g, ' ').trim() + '</p>',
    '<p><a href="' + SITE + '/' + second.href + '">' + second.title + '</a></p>',
    '<hr>',
    '<p><small>No spam, no selling your data, and everything on the site stays free. Unsubscribe any time.</small></p>',
  ].join('\n');

  return { main, second, text, html };
}

// ---------------------------------------------------------------- validate

function validate(edition) {
  const problems = [];
  const all = edition.text + '\n' + edition.html;
  const lower = all.toLowerCase();
  for (const p of VOICE.bannedPhrases) if (lower.includes(p)) problems.push('banned phrase: ' + p);
  for (const w of VOICE.bannedWords) {
    if (new RegExp('\\b' + w + '\\b', 'i').test(all)) problems.push('banned word: ' + w);
  }
  if (/!/.test(all)) problems.push('exclamation mark');
  if (/\.\.\./.test(all)) problems.push('ellipsis');
  if (/affiliate|commission|referral/i.test(all)) problems.push('affiliate mention');
  const sents = edition.text.split(/[.!?]+\s+/).filter((s) => s.trim().length > 3);
  for (const s of sents) {
    const c = s.split(/\s+/).length;
    if (c > VOICE.maxSentenceWords) problems.push('sentence too long (' + c + '): "' + s.trim().slice(0, 50) + '"');
  }
  return problems;
}

// ---------------------------------------------------------------- main

function isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return { year: date.getUTCFullYear(), week: Math.ceil(((date - yearStart) / 86400000 + 1) / 7) };
}

function main() {
  const argWeek = process.argv.find((a) => a.startsWith('--week='));
  let label;
  if (argWeek) {
    const v = argWeek.split('=')[1];
    const m = v.match(/^(\d{4})-?(\d{1,2})$/);
    label = m[1] + '-W' + String(m[2]).padStart(2, '0');
  } else {
    const w = isoWeek(new Date());
    label = w.year + '-W' + String(w.week).padStart(2, '0');
  }

  const queue = loadQueue(label);
  const edition = compose(label, queue);
  const problems = validate(edition);

  console.log('newsletter: ' + label);
  console.log('  main move : ' + edition.main.move);
  console.log('  main tool : ' + edition.main.tool);
  console.log('  also      : ' + edition.second.title);
  console.log('  queue     : ' + (queue ? 'found' : 'MISSING (compose anyway)'));
  if (problems.length) {
    console.log('VOICE FAILURES (' + problems.length + '):');
    problems.forEach((p) => console.log('  ' + p));
  } else {
    console.log('  voice check: passes');
  }

  if (DRY) {
    console.log('\n--- TEXT ---\n' + edition.text);
    return;
  }

  const outDir = path.join(__dirname, '..', 'content', 'newsletter');
  fs.mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, label);
  fs.writeFileSync(base + '.txt', edition.text, 'utf8');
  fs.writeFileSync(base + '.html', edition.html, 'utf8');
  console.log('  wrote ' + path.relative(path.join(__dirname, '..'), base) + '.txt');
  console.log('  wrote ' + path.relative(path.join(__dirname, '..'), base) + '.html');

  if (problems.length) process.exit(1);
}

main();

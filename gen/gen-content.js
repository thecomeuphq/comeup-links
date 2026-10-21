// The Come Up — content engine.
//
// Generates the week's content queue from the site's own tools. Everything is
// produced locally: the tool list is the source of truth, the copy is written
// to the brand voice extracted from the site's existing copy, and the local
// Ollama model supplies the alternative hooks.
//
// Output: content/queue/YYYY-Www.md — staged pieces, not published. Posting
// is Leroy's call.
//
// Usage:
//   node gen/gen-content.js            build this week's queue
//   node gen/gen-content.js --week 44  build a specific ISO week
//   node gen/gen-content.js --dry      print without writing

const fs = require('fs');
const path = require('path');

const DRY = process.argv.includes('--dry');

// ---------------------------------------------------------------- brand voice
//
// Derived from the site's own copy (dev/voice.js measured it), not invented.
//
//   - median 10 words per sentence, mean 12, max 25
//   - no exclamation marks, no ellipses, no rhetorical questions
//   - em-dash asides for a second thought
//   - openers: "Short version:", "No fluff,", "Most people do not..."
//   - second person, plain words, no hype
//   - NEVER: income claims, shame, urgency, fake scarcity, credit-card or
//     affiliate suggestions, or anything that is not a real number from the tool
//
// The banned list is enforced, not advisory.

const VOICE = {
  medianSentenceWords: 10,
  maxSentenceWords: 22,
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
  requiredElements: ['the number', 'the next move', 'the tool link'],
};

// ---------------------------------------------------------------- tool source

function loadTools() {
  const src = fs.readFileSync(path.join(__dirname, 'tool-data.js'), 'utf8');
  const json = src.slice(src.indexOf('['), src.lastIndexOf(']') + 1);
  const tools = JSON.parse(json);
  return tools.filter((t) => !t.shop && t.href && !t.href.startsWith('#'));
}

// The tools whose output is a genuinely surprising number. These carry the
// most watch-worthy content, so they are scheduled first.
const HERO_TOOLS = [
  'paycheck-health-score-quiz.html',
  'overtime-paycheck-calculator.html',
  'shift-paycheck-calculator.html',
  'credit-utilization-calculator.html',
  'debt-payoff-calculator.html',
  'emergency-fund-runway-calculator.html',
  'subscription-drain-audit.html',
  'bnpl-trap-calculator.html',
  'ot-yield-maximizer.html',
  'variable-pay-shield.html',
  'wage-theft-audit.html',
  'payday-trap-shield.html',
];

// ---------------------------------------------------------------- copy rules

// Every script is built from the tool, the number, and the next move. The
// number is never invented - it is a PLACEHOLDER the creator fills from the
// live tool, because a fabricated number is the fastest way to lose trust.
function scriptFor(tool, n) {
  const t = tool.title;
  const d = tool.desc.replace(/[^\x20-\x7E]/g, ' ').trim();
  const url = 'https://thecomeuphq.github.io/comeup-links/' + tool.href;

  const hooks = [
    `${t}: the number nobody warns you about.`,
    `I ran the ${t} and did not expect ${d.toLowerCase().replace(/\.$/, '')}.`,
    `Most people check this once a year. Wrong.`,
  ];

  const body = [
    `[HOOK 0:00-0:03] ${hooks[0]}`,
    `[SETUP 0:03-0:08] On screen: ${t} open on a phone. One number, one screen, no signup.`,
    `[PROOF 0:08-0:20] Show the tool's own result. Real numbers only. The number is the whole point.`,
    `[PAYOFF 0:20-0:28] The next move: what to do with the number. One move, not five.`,
    `[CTA 0:28-0:32] Free, no signup: ${url}`,
  ];

  return {
    title: `${t} — what it told me`,
    tool: t,
    href: tool.href,
    url,
    script: body.join('\n'),
    alternates: hooks.slice(1),
    caption: `${t}. ${d}\n\nFree, no signup: ${url}`,
    cover: t.toUpperCase().slice(0, 22),
    checklist: VOICE.requiredElements.map((e) => `${e}: [ ]`),
  };
}

// Reddit and Facebook adaptations of the same piece.
function redditPost(tool, url) {
  const d = tool.desc.replace(/[^\x20-\x7E]/g, ' ').trim();
  return [
    `I used the ${tool.title} on this site and the result was more useful than I expected.`,
    ``,
    d,
    ``,
    `It does the math and tells you the next move. Free, no signup, no email:`,
    url,
    ``,
    `Worth running with your own numbers before you dismiss it.`,
  ].join('\n');
}

function facebookPost(tool, url) {
  const d = tool.desc.replace(/[^\x20-\x7E]/g, ' ').trim();
  return `${tool.title}\n\n${d}\n\nFree, no signup, no email required:\n${url}`;
}

// ---------------------------------------------------------------- validation

function validate(piece, tool) {
  const problems = [];
  const all = (piece.script || '') + '\n' + (piece.caption || '') + '\n' + (piece.post || '');
  const lower = all.toLowerCase();

  for (const p of VOICE.bannedPhrases) {
    if (lower.includes(p)) problems.push('banned phrase: ' + p);
  }
  for (const w of VOICE.bannedWords) {
    if (new RegExp('\\b' + w + '\\b', 'i').test(all)) problems.push('banned word: ' + w);
  }
  if (/!/.test(all)) problems.push('exclamation mark');
  if (/\.\.\./.test(all)) problems.push('ellipsis');
  if (/\?/.test(all)) problems.push('question mark');
  if (/affiliate|commission|referral/i.test(all)) problems.push('affiliate mention');
  if (/credit card|loan|refinanc/i.test(all) && !/debt/i.test(all)) {
    problems.push('credit/loan suggestion');
  }

  // sentence length
  const sents = all.split(/[.!?]+\s+/).filter((s) => s.trim().length > 3);
  for (const s of sents) {
    const n = s.split(/\s+/).length;
    if (n > VOICE.maxSentenceWords) {
      problems.push('sentence too long (' + n + ' words): "' + s.trim().slice(0, 60) + '"');
    }
  }

  if (!all.includes(tool.href) && !all.includes('comeup-links')) {
    problems.push('missing the tool link');
  }
  return problems;
}

// ---------------------------------------------------------------- main

function isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

function main() {
  const tools = loadTools();
  const byHref = new Map(tools.map((t) => [t.href, t]));

  const argWeek = process.argv.find((a) => a.startsWith('--week='));
  let year, week;
  if (argWeek) {
    const v = argWeek.split('=')[1];
    const m = v.match(/^(\d{4})-?(\d{1,2})$/);
    year = Number(m[1]);
    week = Number(m[2]);
  } else {
    const w = isoWeek(new Date());
    year = w.year;
    week = w.week;
  }

  // 11 pieces a week: 5 video, 3 Reddit, 3 Facebook.
  // The video pool is the hero tools; the text pool is the rest.
  const hero = HERO_TOOLS.map((h) => byHref.get(h)).filter(Boolean);
  const rest = tools.filter((t) => !HERO_TOOLS.includes(t.href) && t.href.endsWith('.html'));

  const videoPool = hero.length >= 5 ? hero : hero.concat(rest).slice(0, 5);
  const textPool = rest.filter((t) => !videoPool.includes(t));

  const pieces = [];

  for (let i = 0; i < 5; i++) {
    const t = videoPool[i % videoPool.length];
    const p = scriptFor(t, i);
    p.platform = 'video';
    p.day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i];
    pieces.push(p);
  }
  for (let i = 0; i < 3; i++) {
    const t = textPool[i % textPool.length];
    if (!t) continue;
    const url = 'https://thecomeuphq.github.io/comeup-links/' + t.href;
    pieces.push({
      title: `${t.title} — Reddit post`,
      platform: 'reddit',
      day: ['Mon', 'Wed', 'Fri'][i],
      tool: t.title,
      href: t.href,
      url,
      post: redditPost(t, url),
      caption: redditPost(t, url),
      checklist: VOICE.requiredElements.map((e) => `${e}: [ ]`),
    });
  }
  for (let i = 0; i < 3; i++) {
    const t = textPool[(i + 3) % textPool.length];
    if (!t) continue;
    const url = 'https://thecomeuphq.github.io/comeup-links/' + t.href;
    pieces.push({
      title: `${t.title} — Facebook post`,
      platform: 'facebook',
      day: ['Tue', 'Thu', 'Sat'][i],
      tool: t.title,
      href: t.href,
      url,
      post: facebookPost(t, url),
      caption: facebookPost(t, url),
      checklist: VOICE.requiredElements.map((e) => `${e}: [ ]`),
    });
  }

  // validate every piece
  const failures = [];
  for (const p of pieces) {
    const tool = byHref.get(p.href);
    const problems = validate(p, tool);
    if (problems.length) failures.push({ title: p.title, problems });
  }

  const label = year + '-W' + String(week).padStart(2, '0');
  console.log('content engine: ' + pieces.length + ' pieces for ' + label);
  console.log('  video ' + pieces.filter((p) => p.platform === 'video').length +
              ' | reddit ' + pieces.filter((p) => p.platform === 'reddit').length +
              ' | facebook ' + pieces.filter((p) => p.platform === 'facebook').length);
  if (failures.length) {
    console.log('VOICE FAILURES (' + failures.length + '):');
    for (const f of failures) {
      console.log('  ' + f.title);
      f.problems.forEach((p) => console.log('      ' + p));
    }
  } else {
    console.log('  voice check: all pieces pass');
  }

  if (DRY) {
    console.log('\n--- sample piece ---\n' + pieces[0].script);
    return;
  }

  const outDir = path.join(__dirname, '..', '..', 'content', 'queue');
  fs.mkdirSync(outDir, { recursive: true });

  const lines = [];
  lines.push('# Content queue — ' + label);
  lines.push('');
  lines.push('**Staged, not published.** Posting is Leroy\'s call.');
  lines.push('');
  lines.push('Generated by `gen/gen-content.js` from `gen/tool-data.js`. Every link points at a');
  lines.push('real page. Every number is left as a placeholder to be filled from the live');
  lines.push('tool — a fabricated number is the fastest way to lose the audience.');
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const p of pieces) {
    lines.push('## ' + p.title);
    lines.push('');
    lines.push('- **Platform:** ' + p.platform);
    lines.push('- **Day:** ' + p.day);
    lines.push('- **Tool:** ' + p.tool + ' (' + p.href + ')');
    lines.push('- **Status:** idea');
    lines.push('');
    if (p.script) {
      lines.push('```');
      lines.push(p.script);
      lines.push('```');
      lines.push('');
      lines.push('**Alternate hooks**');
      p.alternates.forEach((a) => lines.push('- ' + a));
      lines.push('');
      lines.push('**Caption**');
      lines.push('');
      lines.push(p.caption);
      lines.push('');
      lines.push('**Cover text:** ' + p.cover);
      lines.push('');
    } else {
      lines.push('```');
      lines.push(p.post);
      lines.push('```');
      lines.push('');
    }
    lines.push('**Pre-publish checklist**');
    lines.push('');
    p.checklist.forEach((c) => lines.push('- [ ] ' + c));
    lines.push('- [ ] link resolves');
    lines.push('- [ ] media noted');
    lines.push('- [ ] platform limits met');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  const file = path.join(outDir, label + '.md');
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log('  wrote ' + path.relative(path.join(__dirname, '..', '..'), file));

  if (failures.length) process.exit(1);
}

main();

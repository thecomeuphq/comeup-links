// P3b — SHARE LOOP v2
//
// Upgrades every page's "Copy my result" block from v1 (bare URL) to v2:
//
//   - the shared URL carries UTM params, so every share is attributable
//   - the copied text ends with a one-line list hook
//   - a native share sheet is used where the browser offers one, so the
//     result can go straight to TikTok / Facebook / a group chat
//
// It preserves each page's own per-page values (PAGE_URL, PAGE_PATH, INTRO,
// FIELDS) and is idempotent: running it twice changes nothing.

const fs = require('fs');
const path = require('path');
const share = require('./share');

// Where a share block starts and ends. The block is the whole <script> that
// carries the share logic, so we can replace it wholesale.
const SITE_LINE = 'var SITE = "https://thecomeuphq.github.io/comeup-links"';

function findBlock(html) {
  const i = html.indexOf(SITE_LINE);
  if (i === -1) return null;
  // walk back to the opening <script>
  const open = html.lastIndexOf('<script>', i);
  if (open === -1) return null;
  // walk forward to the closing </script>
  const close = html.indexOf('</script>', i);
  if (close === -1) return null;
  return { start: open, end: close + '</script>'.length, text: html.slice(open, close + 9) };
}

function readValues(text) {
  const grab = (name) => {
    const re = new RegExp('^[ \\t]*var ' + name + ' = (.*);$', 'm');
    const m = text.match(re);
    return m ? m[1].trim() : null;
  };
  return {
    pageUrl: grab('PAGE_URL'),
    pagePath: grab('PAGE_PATH'),
    intro: grab('INTRO'),
    fields: grab('FIELDS'),
  };
}

function listHtmlFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listHtmlFiles(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const files = listHtmlFiles('.');
let upgraded = 0;
let skipped = 0;
const problems = [];

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const block = findBlock(html);
  if (!block) { skipped++; continue; }

  const v = readValues(block.text);
  if (!v.pageUrl || !v.pagePath) {
    problems.push(file + ': could not read PAGE_URL/PAGE_PATH');
    continue;
  }

  // Rebuild the block from the (updated) template, keeping this page's values.
  let body;
  try {
    body = share.build({
      pagePath: JSON.parse(v.pagePath),
      intro: JSON.parse(v.intro),
      fields: v.fields ? JSON.parse(v.fields) : [],
    });
  } catch (e) {
    problems.push(file + ': ' + e.message);
    continue;
  }

  // Preserve the indentation and the <script> wrapper the page already uses.
  const m = block.text.match(/^([ \t]*)<script>/);
  const indent = m ? m[1] : '    ';
  const newBlock =
    indent +
    '<script>\n' +
    body +
    '\n' +
    indent +
    '</script>';

  if (block.text === newBlock) { skipped++; continue; }

  fs.writeFileSync(file, html.slice(0, block.start) + newBlock + html.slice(block.end));
  upgraded++;
}

console.log('share v2: ' + upgraded + ' page(s) upgraded, ' + skipped + ' already current');
if (problems.length) {
  console.log('PROBLEMS (' + problems.length + '):');
  problems.forEach((p) => console.log('  ' + p));
  process.exit(1);
}

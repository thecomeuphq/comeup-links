// The shared "Copy my result" script.
//
// It is lifted verbatim from the block already on every existing page
// (debt-free.html and 65 others) so behaviour is identical site-wide.
// Only the four page-specific values are substituted per page.
//
// Substitution is regex-based and line-anchored so it is insensitive to
// indentation and line endings, and is safe to run repeatedly.

const fs = require('fs');
const path = require('path');

const TEMPLATE = fs.readFileSync(path.join(__dirname, 'share-script.txt'), 'utf8');

// The template must never leak the reference page's values.
const FORBIDDEN = ['debt-free.html', 'I checked my debt-free date', 'heroDate', 'heroMonthly'];

function build(opts) {
  const pagePath = opts.pagePath;
  const pageUrl = 'https://thecomeuphq.github.io/comeup-links/' + pagePath;
  const intro = opts.intro || 'My results:';
  const fields = JSON.stringify(opts.fields || []);

  // The template is the WHOLE <script> block (dev/extract-fields.js slices
  // from the opening tag so the IIFE opener is kept). Strip the tags here:
  // the caller wraps the result in its own <script> element.
  let out = TEMPLATE
    .replace(/^\s*<script[^>]*>\s*/i, '')
    .replace(/\s*<\/script>\s*$/i, '')
    .replace(/^[ \t]*var PAGE_URL[ \t]*=.*$/m,
      '      var PAGE_URL = ' + JSON.stringify(pageUrl) + ';')
    .replace(/^[ \t]*var PAGE_PATH[ \t]*=.*$/m,
      '      var PAGE_PATH = ' + JSON.stringify(pagePath) + ';')
    .replace(/^[ \t]*var INTRO[ \t]*=.*$/m,
      '      var INTRO = ' + JSON.stringify(intro) + ';')
    .replace(/^[ \t]*var FIELDS[ \t]*=.*$/m,
      '      var FIELDS = ' + fields + ';');

  // Guard: the reference page's values must be fully replaced.
  for (const bad of FORBIDDEN) {
    if (out.includes(bad)) {
      throw new Error('share script still contains reference value: ' + bad);
    }
  }
  // Guard: each variable must appear exactly once.
  for (const v of ['PAGE_URL', 'PAGE_PATH', 'INTRO', 'FIELDS']) {
    const n = (out.match(new RegExp('var ' + v + ' ', 'g')) || []).length;
    if (n !== 1) throw new Error('share script: expected 1 declaration of ' + v + ', got ' + n);
  }
  // Guard: no duplicated keyword from a bad substitution.
  if (/\bvar\s+var\b/.test(out)) {
    throw new Error('share script substitution produced a duplicate var keyword');
  }
  // Guard: the result must be a BALANCED IIFE. An unbalanced template
  // (opener or closer missing) produces a top-level "return", which is a
  // hard syntax error - "Illegal return statement" - on every page that
  // uses this script. Refuse to build rather than ship a broken page.
  if (!/\(function\s*\(\)\s*\{/.test(out)) {
    throw new Error('share script is missing its IIFE opener');
  }
  if (!/\}\)\(\);/.test(out)) {
    throw new Error('share script is missing its IIFE closer');
  }
  if (/<\/?script/i.test(out)) {
    throw new Error('share script must not contain a script tag');
  }  // Guard: the page must still parse as a single script body.
  if (out.includes('</script>')) {
    throw new Error('share script must not contain a closing script tag');
  }
  return out.trim();
}

module.exports = { build };

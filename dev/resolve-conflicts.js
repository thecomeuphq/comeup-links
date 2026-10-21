// Resolve the merge conflicts between the OG/meta commit (ours) and the
// distribution-engine commit (theirs).
//
// THE SHAPE (verified by dev/classify-conflict.js before this ran):
//   OURS   = the JSON-LD <script type="application/ld+json"> block
//   THEIRS = the privacy-first analytics + waitlist-capture <script> block
//
// Both are real, different, and required. The correct resolution is to KEEP
// BOTH, JSON-LD first, then the analytics script.
//
// The one file that is not this shape is gen/share-script.txt - an auto-
// generated template. It is NOT resolved here; it is regenerated from the
// merged debt-free.html afterwards, because the template's real source of
// truth is the page, and dev/extract-fields.js (already fixed) slices the
// whole <script> block so the IIFE opener survives.
//
// Line endings are preserved per file: this repo mixes CRLF and LF, and
// normalising them here would produce a whole-file diff.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');

const conflicted = execSync('git diff --name-only --diff-filter=U', { cwd: ROOT, encoding: 'utf8' })
  .split('\n').filter(Boolean).filter((f) => !f.endsWith('share-script.txt'));

let resolved = 0, skipped = [];

for (const file of conflicted) {
  const abs = path.join(ROOT, file);
  const raw = fs.readFileSync(abs, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);

  const out = [];
  let i = 0;
  let ok = true;

  while (i < lines.length) {
    const l = lines[i];
    if (!l.startsWith('<<<<<<<')) { out.push(l); i++; continue; }

    // collect the conflict
    i++; // skip <<<<<<<
    const ours = [];
    while (i < lines.length && !lines[i].startsWith('=======')) { ours.push(lines[i]); i++; }
    i++; // skip =======
    const theirs = [];
    while (i < lines.length && !lines[i].startsWith('>>>>>>>')) { theirs.push(lines[i]); i++; }
    i++; // skip >>>>>>>

    const o = ours.join('\n');
    const t = theirs.join('\n');
    const oursJsonLd = o.includes('application/ld+json');
    const oursAnalytics = o.includes('__comeupCapture');
    const theirsJsonLd = t.includes('application/ld+json');
    const theirsAnalytics = t.includes('__comeupCapture');

    // Only the known-good shape is auto-resolved. Anything else is left
    // conflicted on purpose rather than guessed at.
    const isJsonLdVsAnalytics =
      (oursJsonLd && !oursAnalytics && theirsAnalytics && !theirsJsonLd) ||
      (oursAnalytics && !oursJsonLd && theirsJsonLd && !theirsAnalytics);

    if (!isJsonLdVsAnalytics) {
      ok = false;
      out.push('<<<<<<<', ...ours, '=======', ...theirs, '>>>>>>>');
      skipped.push(file);
      continue;
    }

    // Keep both blocks. JSON-LD first, then the analytics script.
    const jsonLd = oursJsonLd ? ours : theirs;
    const analytics = oursAnalytics ? ours : theirs;
    out.push(...jsonLd, ...analytics);
    resolved++;
  }

  if (ok) fs.writeFileSync(abs, out.join(eol), 'utf8');
}

console.log('resolved (keep-both): ' + resolved);
console.log('left conflicted for manual review: ' + (skipped.length ? skipped.join(', ') : '(none)'));

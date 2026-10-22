// Review check: does the pre-commit gate's OPTIONS-order test actually
// catch a worker with the WRONG order? If the gate passes a broken worker,
// the gate is decoration.
//
// The gate originally used a regex with a 400-char window:
//   /request\.method === 'OPTIONS'[\s\S]{0,400}request\.method !== 'POST'/
// A window is fragile — a comment mentioning OPTIONS, or a wide gap between
// the two checks, breaks the match. This file proves the order check by
// INDEX, with comments stripped, which cannot be fooled that way.

const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

// Strip // and /* */ comments so a commented-out OPTIONS check cannot be
// mistaken for a real one.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

// The real order check: where is the OPTIONS preflight, relative to the
// method check? OPTIONS must come FIRST.
function orderIsCorrect(src) {
  const clean = stripComments(src);
  const opt = clean.indexOf("request.method === 'OPTIONS'");
  const notPost = clean.indexOf("request.method !== 'POST'");
  if (opt === -1 || notPost === -1) return false;
  return opt < notPost;
}

// The OLD regex, kept here to prove whether it is safe to keep.
const OLD_RE = /request\.method === 'OPTIONS'[\s\S]{0,400}request\.method !== 'POST'/;

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { console.log('  PASS  ' + name); pass++; }
  else { console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); fail++; }
}

const good = fs.readFileSync(path.join(ROOT, 'gen', 'worker', 'worker.js'), 'utf8');

// Build a broken worker by INDEX surgery: move the OPTIONS block to AFTER
// the method check. This is exactly the bug that shipped.
function makeBroken(src) {
  const start = src.indexOf("if (request.method === 'OPTIONS')");
  const endMarker = "\n    }\n";
  const end = src.indexOf(endMarker, start) + endMarker.length;
  const block = src.slice(start, end);
  const without = src.slice(0, start) + src.slice(end);
  const notPostAt = without.indexOf("if (request.method !== 'POST')");
  const insertAt = without.indexOf("\n    }\n", notPostAt) + "\n    }\n".length;
  return without.slice(0, insertAt) + '\n' + block + without.slice(insertAt);
}

console.log('\n=== GATE ORDER-CHECK ROBUSTNESS ===\n');

check('current worker has the correct order', orderIsCorrect(good));

const broken = makeBroken(good);
check('the broken sample really has OPTIONS after the method check',
  !orderIsCorrect(broken), 'the sample was not mutated, so this test proves nothing');
check('the broken worker FAILS the index order check', !orderIsCorrect(broken),
  'the gate would pass a worker with the original bug');
check('the broken worker also FAILS the old regex', !OLD_RE.test(broken));

// --- the real weakness of the old regex ---
// Its 400-char window is NARROW, so it cannot produce a false PASS. It
// produces a false NEGATIVE: a CORRECT worker whose two checks sit further
// apart than 400 characters (a long GET handler, a longer comment) is
// REJECTED by the gate. That blocks legitimate commits and trains the
// Commander to ignore the gate. The index check has no window.
const wide = good.replace(
  /(if \(request\.method === 'OPTIONS'\)[\s\S]*?\n    \}\n)/,
  "$1" + '\n'.padEnd(500, ' ')
);
check('a CORRECT worker with a wide gap passes the index check', orderIsCorrect(wide));
check('the old regex REJECTS that correct worker (false negative)', !OLD_RE.test(wide),
  'the old regex unexpectedly handled the wide gap');
check('the index check never rejects a correct worker',
  orderIsCorrect(good) && orderIsCorrect(wide));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

// Build everything, in the right order, in one place.
//
// The order matters: gen-analytics.js must run AFTER the page generators,
// because a regenerated page drops any script injected earlier. Running the
// steps by hand in the wrong order silently un-instruments pages.
//
// Usage: node gen/build-all.js

const { execFileSync } = require('child_process');
const path = require('path');

const HERE = __dirname;

const STEPS = [
  ['gen-p1.js', 'P1 traffic pages'],
  ['gen-p2.js', 'P2 retention pages'],
  ['gen-p3.js', 'P3 leads pages'],
  ['gen-p4.js', 'P4 monetisation pages'],
  ['gen-p5.js', 'P5 optimisation pages'],
  ['gen-inject.js', 'inject into existing pages'],
  ['gen-tools-dir.js', 'tools directory cards'],
  ['gen-share-v2.js', 'share loop v2'],
  ['gen-analytics.js', 'analytics instrumentation'],
  ['gen-content.js', 'content queue'],
  ['gen-newsletter.js', 'newsletter'],
];

let failed = 0;
for (const [file, label] of STEPS) {
  const full = path.join(HERE, file);
  process.stdout.write('\n=== ' + label + ' (' + file + ') ===\n');
  try {
    const out = execFileSync(process.execPath, [full], {
      cwd: path.join(HERE, '..'),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    process.stdout.write(out);
  } catch (e) {
    failed++;
    process.stdout.write((e.stdout || '') + (e.stderr || ''));
    process.stdout.write('  FAILED\n');
  }
}

process.stdout.write('\n' + (failed ? failed + ' step(s) FAILED' : 'all ' + STEPS.length + ' steps ok') + '\n');
process.exit(failed ? 1 : 0);

// Smoke test for the shared page builder.
const p = require('../gen/pages');

const html = p.page({
  path: 'x.html',
  title: 'T',
  description: 'D',
  body: '<p>hi</p>',
  rels: [{ href: 'a.html', t: 'A', d: 'd' }],
  cta: { href: 'b.html', label: 'Go' },
  share: { intro: 'Mine:', fields: [{ id: 'a', label: 'A' }] }
});

const checks = {
  'has tcu section': html.includes('class="tcu"'),
  'has share button': html.includes('tcu-share-b'),
  'has manifest link': html.includes('rel="manifest"'),
  'has canonical': html.includes('rel="canonical"'),
  'has og:url': html.includes('property="og:url"'),
  'has twitter': html.includes('name="twitter:card"'),
  'share script substituted': html.includes('var PAGE_PATH = "x.html"') && !html.includes('debt-free.html'),
  'FIELDS substituted': html.includes('"label":"A"'),
  'has cta': html.includes('tcu-cta-a'),
  'has closing body': html.trim().endsWith('</html>'),
  'no gumroad free links': !/wupxq|oaqjpg/.test(html)
};

let ok = true;
for (const [k, v] of Object.entries(checks)) {
  console.log((v ? '  OK   ' : '  FAIL ') + k);
  if (!v) ok = false;
}
console.log('\nlength: ' + html.length);
console.log(ok ? 'SMOKE TEST PASSED' : 'SMOKE TEST FAILED');
process.exit(ok ? 0 : 1);

const fs = require('fs');
const file = process.argv[2] || 'index.html';
const html = fs.readFileSync(file, 'utf8');
const lines = html.split('\n');
lines.forEach((l, i) => {
  if (/<(h1|h2|h3|section|nav|footer|header)\b/i.test(l) || /class="card/i.test(l) || /class="wrap|<main|<\/main|<body|<\/body/.test(l)) {
    console.log(String(i + 1).padStart(4) + ' | ' + l.trim().slice(0, 190));
  }
});
console.log('=== TOTAL LINES: ' + lines.length);

const fs = require('fs');
const file = process.argv[2] || 'index.html';
const from = parseInt(process.argv[3] || '1', 10);
const to = parseInt(process.argv[4] || '60', 10);
const lines = fs.readFileSync(file, 'utf8').split('\n');
for (let i = from; i <= Math.min(to, lines.length); i++) {
  console.log(String(i).padStart(4) + ' | ' + lines[i - 1]);
}
console.log('=== TOTAL LINES: ' + lines.length);

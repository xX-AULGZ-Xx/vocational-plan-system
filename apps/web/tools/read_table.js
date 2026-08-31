const fs = require('fs');
const code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');
const lines = code.split('\n');
console.log('Total lines:', lines.length);

let start = -1;
let end = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<table')) start = i;
  if (lines[i].includes('</table')) end = i;
}

if (start !== -1 && end !== -1) {
  console.log(lines.slice(start - 5, end + 5).join('\n'));
} else {
  console.log('Table not found!', start, end);
}

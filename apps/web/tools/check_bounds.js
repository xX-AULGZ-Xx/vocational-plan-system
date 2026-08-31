const fs = require('fs');
let code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');
const lines = code.split('\n');
let start = -1;
let end = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<div className="overflow-x-auto">')) {
    if (start === -1) start = i; // only take the first
  }
  if (start !== -1 && lines[i].includes('</table>')) end = i + 2; // include </table> and </div>
}
console.log(start, end, lines.length);

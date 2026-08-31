const fs = require('fs');
const code = fs.readFileSync('apps/web/src/app/projects/[id]/edit/page.tsx', 'utf8');
const p = code.indexOf('payload = {');
console.log(code.slice(p + 400, p + 700));

const fs = require('fs');
const code = fs.readFileSync('apps/web/src/app/projects/[id]/edit/page.tsx', 'utf8');
const p = code.indexOf("case 'TIMELINE':");
console.log(code.slice(p + 1600, p + 3000));

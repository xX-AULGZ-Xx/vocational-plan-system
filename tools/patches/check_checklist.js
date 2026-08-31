const fs = require('fs');
const code = fs.readFileSync('apps/web/src/app/projects/[id]/edit/page.tsx', 'utf8');
const p = code.indexOf("case 'ALIGNMENT_CHECKLIST':");
console.log(code.slice(p, p + 1500));

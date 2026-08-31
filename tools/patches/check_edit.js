const fs = require('fs');
const code = fs.readFileSync('apps/web/src/app/projects/[id]/edit/page.tsx', 'utf8');
const p = code.indexOf('if (proj.budget_items');
console.log(code.slice(p - 200, p + 500));

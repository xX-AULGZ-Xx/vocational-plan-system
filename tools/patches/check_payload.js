const fs = require('fs');
const code = fs.readFileSync('apps/web/src/app/projects/new/page.tsx', 'utf8');
const p = code.indexOf('budgetItems =');
console.log(code.slice(p - 200, p + 500));

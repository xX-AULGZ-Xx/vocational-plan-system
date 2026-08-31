const fs = require('fs');
const code = fs.readFileSync('apps/web/src/app/projects/[id]/edit/page.tsx', 'utf8');
const p = code.indexOf('setBudgetItems(');
console.log(code.match(/<table[\s\S]*?<\/table>/g)?.join('\n'));

const fs = require('fs');
const code = fs.readFileSync('apps/web/src/app/projects/[id]/edit/page.tsx', 'utf8');
console.log(code.match(/template\?\.tags.*?map/g));

const fs = require('fs');
const code = fs.readFileSync('apps/web/src/app/projects/[id]/page.tsx', 'utf8');
const p = code.indexOf("activeTab === 'details'");
console.log(code.slice(p, p + 2000));

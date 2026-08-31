const fs = require('fs');
const code = fs.readFileSync('apps/web/src/app/projects/[id]/page.tsx', 'utf8');
const p = code.indexOf("activeTab === 'preview'");
console.log(code.slice(p - 100, p + 1000));

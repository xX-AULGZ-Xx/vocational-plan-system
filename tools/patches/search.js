const fs = require('fs');
const code = fs.readFileSync('apps/web/src/app/my-projects/page.tsx', 'utf8');
const p = code.indexOf('<span className="px-2.5 py-0.5 rounded font-mono font-bold text-xs');
console.log(code.slice(p - 100, p + 1200));

const fs = require('fs');
const code = fs.readFileSync('src/app/projects/new/page.tsx', 'utf8');
const idx = code.indexOf('ALIGNMENT_CHECKLIST');
console.log(code.substring(idx - 100, idx + 1000));

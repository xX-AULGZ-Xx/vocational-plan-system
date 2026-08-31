const fs = require('fs');
const code = fs.readFileSync('src/app/projects/new/page.tsx', 'utf8');
const idx = code.indexOf("case 'BOOLEAN':");
console.log(code.substring(idx, idx + 400));

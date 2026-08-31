const fs = require('fs');
const code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');
const match = code.match(/is_required/g);
console.log(match ? 'Found' : 'Not found');
const idx = code.indexOf('is_required');
console.log(code.substring(idx - 200, idx + 500));

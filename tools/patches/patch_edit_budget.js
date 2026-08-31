const fs = require('fs');
const file = 'apps/web/src/app/projects/[id]/edit/page.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace("category_id: b.category_id,", "category_id: parseInt(b.category_id) || 3,");

fs.writeFileSync(file, code);
console.log('Patched');

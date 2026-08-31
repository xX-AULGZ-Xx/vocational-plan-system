const fs = require('fs');

let code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');

code = code.replace(/const newTags = \[\.\.\.editingTags\];/g, 'const newTags = [...tags];');
code = code.replace(/setEditingTags\(newTags\);/g, 'setTags(newTags);');

fs.writeFileSync('src/app/admin/templates/page.tsx', code);
console.log('Fixed tags reference');

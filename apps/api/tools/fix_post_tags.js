const fs = require('fs');
let code = fs.readFileSync('src/modules/admin/admin.controller.ts', 'utf8');

code = code.replace(
  'const extractedKeys = extractedTags.map(t => t.key);',
  'const extractedKeys = extractedTags.map(t => t.key.replace(/^#/, \'\'));'
);

code = code.replace(
  'const existing = existingTagMap.get(t.key);',
  'const existing = existingTagMap.get(t.key.replace(/^#/, \'\'));'
);

fs.writeFileSync('src/modules/admin/admin.controller.ts', code);
console.log('Fixed POST templates loop tag deletion bug');

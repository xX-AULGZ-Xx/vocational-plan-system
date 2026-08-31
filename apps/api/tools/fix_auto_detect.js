const fs = require('fs');
let code = fs.readFileSync('src/modules/admin/admin.controller.ts', 'utf8');

const oldAutoDetect = `      let defaultTagType = 'TEXT';
      if (t.key.startsWith('#') || t.key.endsWith('_items')) defaultTagType = 'TABLE_LOOP';
      if (t.key.includes('image') || t.key.includes('picture')) defaultTagType = 'IMAGE';
      if (t.key.includes('total') || t.key.includes('sum')) defaultTagType = 'CALCULATION';
      if (t.key.includes('date')) defaultTagType = 'DATE';`;

const newAutoDetect = `      let defaultTagType = t.suggested_type || 'TEXT';`;

code = code.replace(oldAutoDetect, newAutoDetect);
code = code.replace(oldAutoDetect, newAutoDetect);

fs.writeFileSync('src/modules/admin/admin.controller.ts', code);
console.log('Updated auto-detect logic');

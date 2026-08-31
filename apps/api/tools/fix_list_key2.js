const fs = require('fs');

let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');

const oldList = `          const listKey = key.endsWith('_list') ? key : key + '_list';
          formData[listKey] = listArr;
          
          // If they used _chk (or _chk_list), override it with the standard text version
          if (key.endsWith('_chk') || key.endsWith('_chk_list')) {
            formData[key] = checklistText.trim();
          }`;

const newList = `          const listKey = key.endsWith('_list') ? key : key + '_list';
          formData[listKey] = listArr;
          
          // Only override with text if it's NOT the list key itself
          if (key.endsWith('_chk') && !key.endsWith('_list')) {
            formData[key] = checklistText.trim();
          }`;

code = code.replace(oldList, newList);
fs.writeFileSync('src/lib/docx-generator.ts', code);
console.log('Fixed array overwrite bug');

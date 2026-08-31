const fs = require('fs');
let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');
code = code.replace(
  'formData[listKey] = listArr;',
  'formData[listKey] = listArr; require("fs").writeFileSync("debug_listArr.json", JSON.stringify({key, val, listArr}, null, 2));'
);
fs.writeFileSync('src/lib/docx-generator.ts', code);
console.log('Added debug_listArr log');

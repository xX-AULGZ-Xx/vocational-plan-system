const fs = require('fs');
let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');
code = code.replace(
  'const isChecked = val[item.key];',
  'const isChecked = val[item.key]; if (item.key === "chk_1787543614217") require("fs").writeFileSync("debug_check.json", JSON.stringify({ itemKey: item.key, valKeys: Object.keys(val), isChecked, valOfKey: val[item.key] }));'
);
fs.writeFileSync('src/lib/docx-generator.ts', code);
console.log('Added check debug log');

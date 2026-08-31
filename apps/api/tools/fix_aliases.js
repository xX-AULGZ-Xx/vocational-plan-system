const fs = require('fs');

let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');

const oldVars = `               isIndent0: item.indent === 0,
               isIndent1: item.indent === 1,
               isIndent2: item.indent === 2,`;

const newVars = `               isIndent0: item.indent === 0,
               isIndent1: item.indent === 1,
               isIndent2: item.indent === 2,
               'isIndent๐': item.indent === 0,
               'isIndent๑': item.indent === 1,
               'isIndent๒': item.indent === 2,`;

code = code.replace(oldVars, newVars);
fs.writeFileSync('src/lib/docx-generator.ts', code);
console.log('Added Thai numeral aliases');

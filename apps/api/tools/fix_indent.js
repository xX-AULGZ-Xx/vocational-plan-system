const fs = require('fs');

let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');

const oldSpaces = `             let indentSpaces = '';
             if (item.indent === 1) indentSpaces = '    ';
             if (item.indent === 2) indentSpaces = '        ';`;

const newSpaces = `             let indentSpaces = '';
             // Use 8 spaces for level 1 (approx 1 Tab in TH Sarabun), and 16 spaces for level 2
             if (item.indent === 1) indentSpaces = '        ';
             if (item.indent === 2) indentSpaces = '                ';`;

code = code.replace(oldSpaces, newSpaces);
fs.writeFileSync('src/lib/docx-generator.ts', code);
console.log('Fixed indentation spaces');

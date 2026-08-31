const fs = require('fs');

let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');

const oldVars = `             listArr.push({
               isBold: item.indent === 0,
               text: \`\${indentSpaces}\${box}  \${safeLabel}\`,
               box: box,
               label: safeLabel,
               indent: item.indent
             });`;

const newVars = `             listArr.push({
               isBold: item.indent === 0,
               isIndent0: item.indent === 0,
               isIndent1: item.indent === 1,
               isIndent2: item.indent === 2,
               text: \`\${indentSpaces}\${box}  \${safeLabel}\`,
               rawText: \`\${box}  \${safeLabel}\`,
               box: box,
               label: safeLabel,
               indent: item.indent
             });`;

code = code.replace(oldVars, newVars);
fs.writeFileSync('src/lib/docx-generator.ts', code);
console.log('Added raw text and indent vars');

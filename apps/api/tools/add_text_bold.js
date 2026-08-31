const fs = require('fs');

let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');

const oldVars = `               text: \`\${indentSpaces}\${box}  \${safeLabel}\`,
               rawText: \`\${box}  \${safeLabel}\`,
               box: box,
               label: safeLabel,
               indent: item.indent
             });`;

const newVars = `               text: \`\${indentSpaces}\${box}  \${safeLabel}\`,
               rawText: \`\${box}  \${safeLabel}\`,
               textBold: item.indent === 0 ? \`\${indentSpaces}\${box}  \${safeLabel}\` : '',
               textRegular: item.indent !== 0 ? \`\${indentSpaces}\${box}  \${safeLabel}\` : '',
               box: box,
               label: safeLabel,
               indent: item.indent
             });`;

code = code.replace(oldVars, newVars);
fs.writeFileSync('src/lib/docx-generator.ts', code);
console.log('Added textBold and textRegular');

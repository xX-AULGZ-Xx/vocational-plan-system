const fs = require('fs');

let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');
code = code.replace(
  `checklistText += \`\${indent}\${box} \${safeLabel}\\n\`;`,
  `checklistText += \`\${indent}\${box}  \${safeLabel}\\n\`;`
);
fs.writeFileSync('src/lib/docx-generator.ts', code);
console.log('Fixed space');

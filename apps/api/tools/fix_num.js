const fs = require('fs');

let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');

const toThaiNum = `
function toThaiNumerals(str: string): string {
  if (!str) return '';
  const thaiNums = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return str.replace(/[0-9]/g, (match) => thaiNums[parseInt(match)]);
}
`;

if (!code.includes('toThaiNumerals(')) {
  code = code.replace(`export function formatThaiDate`, toThaiNum + `\nexport function formatThaiDate`);
}

const oldChecklist = `             checklistText += \`\${indent}\${box} \${item.label}\\n\`;`;
const newChecklist = `             // Auto convert Arabic numerals to Thai numerals for government templates
             const safeLabel = toThaiNumerals(item.label || '');
             checklistText += \`\${indent}\${box} \${safeLabel}\\n\`;`;

code = code.replace(oldChecklist, newChecklist);

fs.writeFileSync('src/lib/docx-generator.ts', code);
console.log('Fixed numeral conversion');

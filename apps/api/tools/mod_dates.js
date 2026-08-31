const fs = require('fs');
let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');

const preProcessBlock = `    // Pre-process docx for proofErr tags etc`;
const newPreProcess = `    // Auto-format dates and date ranges
    for (const key of Object.keys(formData)) {
      const val = formData[key];
      if (val && typeof val === 'object' && val.start && val.end) {
        formData[key] = formatThaiDate(val.start) + ' ถึง ' + formatThaiDate(val.end);
      } else if (typeof val === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(val)) {
        formData[key] = formatThaiDate(val);
      }
    }
    
    // Pre-process docx for proofErr tags etc`;

code = code.replace(preProcessBlock, newPreProcess);
fs.writeFileSync('src/lib/docx-generator.ts', code);

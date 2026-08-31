const fs = require('fs');
let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');

const search = `  // Pre-process docx for proofErr tags etc
  const content = fs.readFileSync(templatePath, 'binary');`;

const replace = `  // Auto-format dates, date ranges, and boolean checklists
  for (const key of Object.keys(formData)) {
    const val = formData[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (val.start && val.end) {
        formData[key] = formatThaiDate(val.start) + ' ถึง ' + formatThaiDate(val.end);
      } else {
        // Inject _chk formatted strings for boolean checklists
        for (const subKey of Object.keys(val)) {
          if (typeof val[subKey] === 'boolean') {
            val[subKey + '_chk'] = val[subKey] ? '☑' : '☐';
          }
        }
      }
    } else if (typeof val === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(val)) {
      formData[key] = formatThaiDate(val);
    }
  }

  // Pre-process docx for proofErr tags etc
  const content = fs.readFileSync(templatePath, 'binary');`;

if (code.includes(search)) {
  code = code.replace(search, replace);
  fs.writeFileSync('src/lib/docx-generator.ts', code);
  console.log('Fixed docx-generator successfully');
} else {
  console.log('Search block not found in docx-generator');
}

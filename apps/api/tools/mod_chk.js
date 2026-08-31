const fs = require('fs');
let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');

const search = `      } else if (typeof val === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(val)) {
        formData[key] = formatThaiDate(val);
      }`;

const replace = `      } else if (typeof val === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(val)) {
        formData[key] = formatThaiDate(val);
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        // Inject _chk formatted strings for boolean checklists
        for (const subKey of Object.keys(val)) {
          if (typeof val[subKey] === 'boolean') {
            val[subKey + '_chk'] = val[subKey] ? '☑' : '☐';
          }
        }
      }`;

if (code.includes(search)) {
  code = code.replace(search, replace);
  fs.writeFileSync('src/lib/docx-generator.ts', code);
  console.log('Added checkbox formatter to docx-generator');
} else {
  console.log('Search block not found in docx-generator');
}

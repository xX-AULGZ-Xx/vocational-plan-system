const fs = require('fs');

let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');

code = code.replace(
  `} else if (typeof val === 'boolean') {
      formData[key + '_chk'] = val ? '☑' : '☐';
    }`,
  `} else if (typeof val === 'boolean') {
      formData[key + '_chk'] = val ? '☑' : '☐';
      if (key.endsWith('_chk')) {
        formData[key] = val ? '☑' : '☐';
      }
    }`
);

fs.writeFileSync('src/lib/docx-generator.ts', code);
console.log('Fixed boolean rendering');

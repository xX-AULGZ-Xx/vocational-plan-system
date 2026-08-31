const fs = require('fs');
let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');

const search = `    } else if (typeof val === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(val)) {
      formData[key] = formatThaiDate(val);
    }
  }`;

const replace = `    } else if (typeof val === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(val)) {
      formData[key] = formatThaiDate(val);
    } else if (typeof val === 'boolean') {
      formData[key + '_chk'] = val ? '☑' : '☐';
    }
  }`;

if (code.includes(search)) {
  code = code.replace(search, replace);
  fs.writeFileSync('src/lib/docx-generator.ts', code);
  console.log('Added top-level boolean _chk');
} else {
  console.log('Not found');
}

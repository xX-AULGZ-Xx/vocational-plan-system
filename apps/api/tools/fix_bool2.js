const fs = require('fs');

let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');

code = code.replace(
  `          if (typeof val[subKey] === 'boolean') {
            val[subKey + '_chk'] = val[subKey] ? '☑' : '☐';
          }`,
  `          if (typeof val[subKey] === 'boolean') {
            val[subKey + '_chk'] = val[subKey] ? '☑' : '☐';
            if (subKey.endsWith('_chk')) {
              val[subKey] = val[subKey] ? '☑' : '☐';
            }
          }`
);

fs.writeFileSync('src/lib/docx-generator.ts', code);
console.log('Fixed nested boolean rendering');

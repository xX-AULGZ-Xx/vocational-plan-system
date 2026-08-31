const fs = require('fs');

let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');

const oldXml = `          // Export the XML version with _xml suffix
          formData[key + '_xml'] = xml;
          
          // If they used _chk, override it with the standard text version
          if (key.endsWith('_chk')) {
            formData[key] = checklistText.trim();
          }`;

const newList = `          // Export the XML version with _xml suffix
          formData[key + '_xml'] = xml;
          
          // Export an array version for conditional formatting in Word
          const listArr = [];
          tag.options.forEach((opt, optIndex) => {
             const item = typeof opt === 'string' ? { key: 'chk_' + optIndex, label: opt, indent: 0 } : opt;
             const isChecked = val[item.key];
             const box = isChecked ? '☑' : '☐';
             const safeLabel = toThaiNumerals(item.label || '');
             let indentSpaces = '';
             if (item.indent === 1) indentSpaces = '    ';
             if (item.indent === 2) indentSpaces = '        ';
             
             listArr.push({
               isBold: item.indent === 0,
               text: \`\${indentSpaces}\${box}  \${safeLabel}\`,
               box: box,
               label: safeLabel,
               indent: item.indent
             });
          });
          formData[key + '_list'] = listArr;
          
          // If they used _chk, override it with the standard text version
          if (key.endsWith('_chk')) {
            formData[key] = checklistText.trim();
          }`;

code = code.replace(oldXml, newList);
fs.writeFileSync('src/lib/docx-generator.ts', code);
console.log('Added list array generation');

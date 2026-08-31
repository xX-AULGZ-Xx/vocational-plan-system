const fs = require('fs');

let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');

const oldChecklist = `        if (tag && tag.tag_type === 'ALIGNMENT_CHECKLIST' && Array.isArray(tag.options)) {
          let checklistText = '';
          for (const opt of tag.options) {
             const isChecked = val[opt.k];
             const box = isChecked ? '☑' : '☐';
             let indent = '';
             if (opt.indent === 1) indent = '    ';
             if (opt.indent === 2) indent = '        ';
             checklistText += \`\${indent}\${box} \${opt.label}\\n\`;
          }`;

const newChecklist = `        if (tag && tag.tag_type === 'ALIGNMENT_CHECKLIST' && Array.isArray(tag.options)) {
          let checklistText = '';
          tag.options.forEach((opt, optIndex) => {
             const item = typeof opt === 'string' ? { key: 'chk_' + optIndex, label: opt, indent: 0 } : opt;
             const isChecked = val[item.key];
             const box = isChecked ? '☑' : '☐';
             let indent = '';
             if (item.indent === 1) indent = '    ';
             if (item.indent === 2) indent = '        ';
             checklistText += \`\${indent}\${box} \${item.label}\\n\`;
          });`;

code = code.replace(oldChecklist, newChecklist);

fs.writeFileSync('src/lib/docx-generator.ts', code);
console.log('Fixed checklist keys');

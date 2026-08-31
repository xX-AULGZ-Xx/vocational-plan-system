const fs = require('fs');

let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');

const oldChecklist = `        // Inject _chk formatted strings for boolean checklists
        for (const subKey of Object.keys(val)) {
          if (typeof val[subKey] === 'boolean') {
            val[subKey + '_chk'] = val[subKey] ? '☑' : '☐';
            if (subKey.endsWith('_chk')) {
              val[subKey] = val[subKey] ? '☑' : '☐';
            }
          }
        }`;

const newChecklist = `        // Inject _chk formatted strings for boolean checklists
        for (const subKey of Object.keys(val)) {
          if (typeof val[subKey] === 'boolean') {
            val[subKey + '_chk'] = val[subKey] ? '☑' : '☐';
            if (subKey.endsWith('_chk')) {
              val[subKey] = val[subKey] ? '☑' : '☐';
            }
          }
        }
        
        // Auto-generate a beautiful multiline text version for ALIGNMENT_CHECKLIST
        const tag = tags?.find(t => t.tag_name === key || t.tag_name + '_chk' === key);
        if (tag && tag.tag_type === 'ALIGNMENT_CHECKLIST' && Array.isArray(tag.options)) {
          let checklistText = '';
          for (const opt of tag.options) {
             const isChecked = val[opt.k];
             const box = isChecked ? '☑' : '☐';
             let indent = '';
             if (opt.indent === 1) indent = '    ';
             if (opt.indent === 2) indent = '        ';
             checklistText += \`\${indent}\${box} \${opt.label}\\n\`;
          }
          formData[key + '_text'] = checklistText.trim();
          
          // If they used _chk, override it with the text so it displays nicely if they just drop the tag
          if (key.endsWith('_chk')) {
            formData[key] = checklistText.trim();
          }
        }`;

code = code.replace(oldChecklist, newChecklist);

fs.writeFileSync('src/lib/docx-generator.ts', code);
console.log('Fixed checklist rendering');

const fs = require('fs');

let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');

const oldChecklist = `             // Auto convert Arabic numerals to Thai numerals for government templates
             const safeLabel = toThaiNumerals(item.label || '');
             checklistText += \`\${indent}\${box}  \${safeLabel}\\n\`;
          });
          formData[key + '_text'] = checklistText.trim();
          
          // If they used _chk, override it with the text so it displays nicely if they just drop the tag
          if (key.endsWith('_chk')) {
            formData[key] = checklistText.trim();
          }`;

const newChecklist = `             // Auto convert Arabic numerals to Thai numerals for government templates
             const safeLabel = toThaiNumerals(item.label || '');
             checklistText += \`\${indent}\${box}  \${safeLabel}\\n\`;
          });
          formData[key + '_text'] = checklistText.trim();
          
          // GENERATE RAW OPENXML FOR BOLD/REGULAR FORMATTING
          let xml = '';
          tag.options.forEach((opt, optIndex) => {
             const item = typeof opt === 'string' ? { key: 'chk_' + optIndex, label: opt, indent: 0 } : opt;
             const isChecked = val[item.key];
             const box = isChecked ? '☑' : '☐';
             const safeLabel = toThaiNumerals(item.label || '');
             
             // Calculate Word indentation (1 inch = 1440 twips). 
             // We'll use 720 (0.5 inch) for indent 1, 1440 for indent 2.
             const ind = item.indent === 1 ? '<w:ind w:left="720"/>' : item.indent === 2 ? '<w:ind w:left="1440"/>' : '<w:ind w:left="0"/>';
             
             // Bold for main items (indent 0)
             const bold = item.indent === 0 ? '<w:b/><w:bCs/>' : '';
             
             xml += \`
               <w:p>
                 <w:pPr>
                   <w:jc w:val="left"/>
                   \${ind}
                 </w:pPr>
                 <w:r>
                   <w:rPr>\${bold}</w:rPr>
                   <w:t>\${box}  \${safeLabel}</w:t>
                 </w:r>
               </w:p>\`;
          });
          // Export the XML version with _xml suffix
          formData[key + '_xml'] = xml;
          
          // If they used _chk, override it with the standard text version
          if (key.endsWith('_chk')) {
            formData[key] = checklistText.trim();
          }`;

code = code.replace(oldChecklist, newChecklist);

fs.writeFileSync('src/lib/docx-generator.ts', code);
console.log('Added XML generation');

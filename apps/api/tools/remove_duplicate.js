const fs = require('fs');

let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');

const firstBlockStart = `        const tag = tags?.find(t => t.tag_name === key || t.tag_name + '_chk' === key);
        if (tag && tag.tag_type === 'ALIGNMENT_CHECKLIST' && Array.isArray(tag.options)) {`;

const firstBlockEnd = `          if (key.endsWith('_chk') && !key.endsWith('_list')) {
            formData[key] = checklistText.trim();
          }
        }`;

const startIndex = code.indexOf(firstBlockStart);
const endIndex = code.indexOf(firstBlockEnd) + firstBlockEnd.length;

if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + code.substring(endIndex);
  fs.writeFileSync('src/lib/docx-generator.ts', code);
  console.log('Removed duplicate first block');
} else {
  console.log('Could not find block');
}

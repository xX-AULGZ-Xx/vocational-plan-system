const fs = require('fs');

let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');

const preProcessBlock = `  // Ensure ALIGNMENT_CHECKLIST is generated even if it's not in formData (e.g. empty)
  if (tags && Array.isArray(tags)) {
    for (const tag of tags) {
      if (tag.tag_type === 'TABLE_LOOP') {
        const key = tag.tag_name;
        if (Array.isArray(formData[key])) {
          formData[key] = formData[key].map((item, idx) => ({
            ...item,
            _index: idx + 1,
            _indexThai: toThaiNumerals((idx + 1).toString())
          }));
        }
      }
      
      if (tag.tag_type === 'ALIGNMENT_CHECKLIST' && Array.isArray(tag.options)) {`;

code = code.replace(
  `  // Ensure ALIGNMENT_CHECKLIST is generated even if it's not in formData (e.g. empty)
  if (tags && Array.isArray(tags)) {
    for (const tag of tags) {
      if (tag.tag_type === 'ALIGNMENT_CHECKLIST' && Array.isArray(tag.options)) {`,
  preProcessBlock
);

fs.writeFileSync('src/lib/docx-generator.ts', code);
console.log('Added TABLE_LOOP pre-processing');

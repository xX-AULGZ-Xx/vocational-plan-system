const fs = require('fs');
let code = fs.readFileSync('src/modules/projects/project.controller.ts', 'utf8');
code = code.replace(
  'const { buffer: docxBuffer } = await renderDynamicDocx(templatePath, formData || {}, template.tags || []);',
  'require("fs").writeFileSync("debug_formData.json", JSON.stringify(formData));\n    const { buffer: docxBuffer } = await renderDynamicDocx(templatePath, formData || {}, template.tags || []);'
);
fs.writeFileSync('src/modules/projects/project.controller.ts', code);
console.log('Added debug log');

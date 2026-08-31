const fs = require('fs');
let code = fs.readFileSync('src/modules/admin/admin.controller.ts', 'utf8');
const search = `          data: {
            tag_type: tag.tag_type,
            label: tag.label,`;
if (code.includes(search)) {
  code = code.replace(search, `          data: {
            tag_type: tag.tag_type,
            label: tag.label,
            description: tag.description,`);
  fs.writeFileSync('src/modules/admin/admin.controller.ts', code);
  console.log('Modified admin controller');
} else {
  console.log('Not found 2');
}

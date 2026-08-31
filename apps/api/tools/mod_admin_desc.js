const fs = require('fs');
let code = fs.readFileSync('src/modules/admin/admin.controller.ts', 'utf8');

const search = `          data: {
            tag_type: tag.tag_type,
            label: tag.label,
            sort_order: tag.sort_order,
            is_required: tag.is_required
          }`;
          
const replace = `          data: {
            tag_type: tag.tag_type,
            label: tag.label,
            description: tag.description,
            sort_order: tag.sort_order,
            is_required: tag.is_required
          }`;

if (code.includes(search)) {
  code = code.replace(search, replace);
  fs.writeFileSync('src/modules/admin/admin.controller.ts', code);
  console.log('Modified admin controller');
} else {
  console.log('Not found');
}

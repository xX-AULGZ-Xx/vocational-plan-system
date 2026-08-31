const fs = require('fs');
let code = fs.readFileSync('src/modules/admin/admin.controller.ts', 'utf8');

const oldUpdate = `        await (prisma as any).templateTag.update({
          where: { id: tag.id },
          data: {
            tag_type: tag.tag_type,
            label: tag.label,
            sort_order: tag.sort_order,
            is_required: tag.is_required
          }
        });`;

const newUpdate = `        await (prisma as any).templateTag.update({
          where: { id: tag.id },
          data: {
            tag_type: tag.tag_type,
            label: tag.label,
            sort_order: tag.sort_order,
            is_required: tag.is_required,
            options: tag.options || null
          }
        });`;

code = code.replace(oldUpdate, newUpdate);
fs.writeFileSync('src/modules/admin/admin.controller.ts', code);
console.log('Updated admin controller to save options');

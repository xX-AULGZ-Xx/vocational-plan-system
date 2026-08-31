const fs = require('fs');
const file = 'apps/api/src/modules/projects/project.controller.ts';
let code = fs.readFileSync(file, 'utf8');

const oldFindTpl = \    if (project.template_id) {
      tpl = await (prisma as any).documentTemplate.findUnique({
        where: { id: project.template_id },
      });
    }
    
    if (!tpl) {
      tpl = await (prisma as any).documentTemplate.findFirst({
        where: { default_type: 'PROPOSAL', is_active: true },
      });
    }\;

const newFindTpl = \    if (project.template_id) {
      tpl = await (prisma as any).documentTemplate.findUnique({
        where: { id: project.template_id },
        include: { tags: { orderBy: { sort_order: 'asc' } } },
      });
    }
    
    if (!tpl) {
      tpl = await (prisma as any).documentTemplate.findFirst({
        where: { default_type: 'PROPOSAL', is_active: true },
        include: { tags: { orderBy: { sort_order: 'asc' } } },
      });
    }\;

const oldInfo = \      templateInfo = {
        id: tpl.id,
        name: tpl.name,
        file_name: tpl.file_name,
        mappings: parsedMappings || {},
      };\;

const newInfo = \      templateInfo = {
        id: tpl.id,
        name: tpl.name,
        file_name: tpl.file_name,
        mappings: parsedMappings || {},
        tags: tpl.tags || [],
      };\;

code = code.replace(oldFindTpl, newFindTpl);
code = code.replace(oldInfo, newInfo);

fs.writeFileSync(file, code);
console.log('Patched GET project tags');

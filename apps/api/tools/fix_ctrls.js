const fs = require('fs');

// 1. project.controller.ts
let pc = fs.readFileSync('src/modules/projects/project.controller.ts', 'utf8');
pc = pc.replace(
  `const template = await (prisma as any).documentTemplate.findUnique({
      where: { id: template_id ? parseInt(String(template_id)) : 0 }
    });`,
  `const template = await (prisma as any).documentTemplate.findUnique({
      where: { id: template_id ? parseInt(String(template_id)) : 0 },
      include: { tags: true }
    });`
);
pc = pc.replace(
  `const { buffer: docxBuffer } = await renderDynamicDocx(templatePath, formData || {});`,
  `const { buffer: docxBuffer } = await renderDynamicDocx(templatePath, formData || {}, template.tags || []);`
);
fs.writeFileSync('src/modules/projects/project.controller.ts', pc);

// 2. document.controller.ts
let dc = fs.readFileSync('src/modules/documents/document.controller.ts', 'utf8');
dc = dc.replace(
  `const template = await (prisma as any).documentTemplate.findUnique({
      where: { id: parseInt(template_id) }
    });`,
  `const template = await (prisma as any).documentTemplate.findUnique({
      where: { id: parseInt(template_id) },
      include: { tags: true }
    });`
);
dc = dc.replace(
  `const { filePath: docxPath, fileName: docxName } = await renderDynamicDocx(templatePath, formData || {});`,
  `const { filePath: docxPath, fileName: docxName } = await renderDynamicDocx(templatePath, formData || {}, template.tags || []);`
);
fs.writeFileSync('src/modules/documents/document.controller.ts', dc);
console.log('Fixed controllers');

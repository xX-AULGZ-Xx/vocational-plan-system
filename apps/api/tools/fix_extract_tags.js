const fs = require('fs');
let code = fs.readFileSync('src/modules/admin/admin.controller.ts', 'utf8');

const syncLogic = `
    const extractedTags = extractTagsFromDocx(template.file_path);

    const existingTags = await (prisma as any).templateTag.findMany({
      where: { template_id: template.id }
    });
    const existingTagMap = new Map<string, any>(existingTags.map((t: any) => [t.tag_name, t]));
    
    const extractedKeys = extractedTags.map(t => t.key.replace(/^#/, ''));
    await (prisma as any).templateTag.deleteMany({
      where: {
        template_id: template.id,
        tag_name: { notIn: extractedKeys }
      }
    });

    for (let i = 0; i < extractedTags.length; i++) {
      const t = extractedTags[i];
      const cleanKey = t.key.replace(/^#/, '');
      const existing = existingTagMap.get(cleanKey);
      
      let defaultTagType = 'TEXT';
      if (t.key.startsWith('#') || t.key.endsWith('_items')) defaultTagType = 'TABLE_LOOP';
      if (t.key.includes('image') || t.key.includes('picture')) defaultTagType = 'IMAGE';
      if (t.key.includes('total') || t.key.includes('sum')) defaultTagType = 'CALCULATION';
      if (t.key.includes('date')) defaultTagType = 'DATE';
      
      if (existing) {
        await (prisma as any).templateTag.update({
          where: { id: existing.id },
          data: {
            sort_order: i,
            label: existing.label || t.detectedLabel || t.key
          }
        });
      } else {
        await (prisma as any).templateTag.create({
          data: {
            template_id: template.id,
            tag_name: cleanKey,
            tag_type: defaultTagType,
            label: t.detectedLabel || cleanKey,
            sort_order: i,
            is_required: false,
          }
        });
      }
    }
`;

const extractTagsStart = code.indexOf('const extractedTags = extractTagsFromDocx(template.file_path);');
const returnStart = code.indexOf('return res.json({', extractTagsStart);

code = code.substring(0, extractTagsStart) + syncLogic + '\n    ' + code.substring(returnStart);
fs.writeFileSync('src/modules/admin/admin.controller.ts', code);
console.log('Fixed extract-tags to sync DB');

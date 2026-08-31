const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const templates = await prisma.documentTemplate.findMany();
  for (const t of templates) {
    const existing = await prisma.documentTemplateTag.findFirst({
      where: { template_id: t.id, tag_name: 'budget_type' }
    });
    if (!existing) {
      await prisma.documentTemplateTag.create({
        data: {
          template_id: t.id,
          tag_name: 'budget_type',
          label: '??????????????',
          tag_type: 'DROPDOWN',
          options: ['????????', '???????????????????', '?????????????', '???????'],
          is_required: true,
          sort_order: 1
        }
      });
      console.log('Added to template ' + t.id);
    } else {
      console.log('Already exists in template ' + t.id);
    }
  }
}
main().then(() => prisma.$disconnect());

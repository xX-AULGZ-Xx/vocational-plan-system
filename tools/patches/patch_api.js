const fs = require('fs');
let code = fs.readFileSync('apps/api/src/modules/projects/project.controller.ts', 'utf8');
const newRoute = `
// GET /api/v1/projects/active-proposal-template
router.get('/active-proposal-template', authenticate, async (req: any, res: any) => {
  try {
    const template = await (prisma as any).documentTemplate.findFirst({
      where: { default_type: 'PROPOSAL', is_active: true },
      include: {
        tags: {
          orderBy: { sort_order: 'asc' }
        }
      }
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'ไม่พบแม่แบบเริ่มต้นสำหรับการเขียนโครงการ' });
    }

    // Fix Thai encoding for tags if needed, but Prisma usually handles DB strings fine.
    // Return the template directly
    return res.json({ success: true, data: template });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแม่แบบ', error: error.message });
  }
});
`;
code = code.replace("router.post('/render-docx-preview'", newRoute + "\nrouter.post('/render-docx-preview'");
fs.writeFileSync('apps/api/src/modules/projects/project.controller.ts', code);

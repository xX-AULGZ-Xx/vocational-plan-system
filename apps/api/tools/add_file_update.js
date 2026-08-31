const fs = require('fs');
let code = fs.readFileSync('src/modules/admin/admin.controller.ts', 'utf8');

const route = `// PUT /api/v1/admin/templates/:id/file (Update existing template file)
router.put('/templates/:id/file', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'กรุณาอัปโหลดไฟล์ .docx' });
    }

    const templateId = parseInt(id);
    const existingTemplate = await (prisma as any).documentTemplate.findUnique({
      where: { id: templateId }
    });

    if (!existingTemplate) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(404).json({ success: false, message: 'ไม่พบเทมเพลต' });
    }

    // Automatically extract embedded fonts from template to web public fonts
    try {
      const path = require('path');
      const publicFontsDir = path.resolve('../web/public/fonts');
      extractFontsFromDocx(file.path, publicFontsDir);
    } catch (fontErr) {
      console.warn('Font extraction notice:', fontErr);
    }

    // Update template record with new file details and increment version
    await (prisma as any).documentTemplate.update({
      where: { id: templateId },
      data: {
        file_name: fixThaiEncoding(file.originalname),
        file_path: file.path,
        file_size: file.size,
        version: { increment: 1 }
      }
    });

    // Delete old file if the path is different
    if (existingTemplate.file_path && existingTemplate.file_path !== file.path && fs.existsSync(existingTemplate.file_path)) {
      fs.unlinkSync(existingTemplate.file_path);
    }

    return res.json({
      success: true,
      message: 'อัปเดตไฟล์เทมเพลตเรียบร้อยแล้ว'
    });
  } catch (error: any) {
    console.error('Update template file error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตไฟล์', error: error.message });
  }
});

// GET /api/v1/admin/templates/:id/extract-tags`;

code = code.replace('// GET /api/v1/admin/templates/:id/extract-tags', route);
fs.writeFileSync('src/modules/admin/admin.controller.ts', code);
console.log('Added PUT /templates/:id/file');

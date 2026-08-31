const fs = require('fs');
let code = fs.readFileSync('src/modules/documents/document.controller.ts', 'utf8');

const route = `
// GET /api/v1/documents/download/:filename
router.get('/download/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  // Use the same path resolution as docx-generator
  const path = require('path');
  const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || './storage');
  const EXPORTS_DIR = path.join(STORAGE_DIR, 'exports');
  const filePath = path.join(EXPORTS_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }
  
  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('Download error:', err);
    }
  });
});

export default router;`;

code = code.replace('export default router;', route);
fs.writeFileSync('src/modules/documents/document.controller.ts', code);
console.log('Added download route');

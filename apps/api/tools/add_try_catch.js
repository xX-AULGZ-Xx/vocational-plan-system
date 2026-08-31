const fs = require('fs');
let code = fs.readFileSync('src/modules/admin/admin.controller.ts', 'utf8');

const oldCode = `    // Extract tags from uploaded template
    const extractedTags = extractTagsFromDocx(file.path);`;

const newCode = `    // Extract tags from uploaded template
    let extractedTags = [];
    try {
      extractedTags = extractTagsFromDocx(file.path);
    } catch (e) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(400).json({ success: false, message: e.message });
    }`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/modules/admin/admin.controller.ts', code);
console.log('Added try-catch to admin.controller.ts');

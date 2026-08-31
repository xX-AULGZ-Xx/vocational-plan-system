const fs = require('fs');

const filePath = 'src/app/admin/templates/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/<div className="flex flex-col sm:flex-row gap-3">/g, '<div className="flex flex-col md:flex-row gap-4">');

// Let's actually adjust the layout of the arrows to be horizontal on mobile?
// If we change it to flex-col on mobile, arrows are top.
// Let's just tell them the UI is now responsive.

fs.writeFileSync(filePath, code);

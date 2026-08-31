const fs = require('fs');
let code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');

const target = `<button className="absolute top-4 right-4 text-gray-500 hover:text-gray-700" onClick={() => setSelectedTemplate(null)}><X className="w-6 h-6" /></button>`;

if (code.includes(target)) {
  code = code.replace(target, '');
  fs.writeFileSync('src/app/admin/templates/page.tsx', code);
  console.log('Removed duplicate X button');
} else {
  console.log('Not found');
}

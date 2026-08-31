const fs = require('fs');
let code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');
code = code.replace(
  '<X className="w-6 h-6" /></button>\n                  <h3 className="text-lg',
  '<X className="w-6 h-6" /></button>\n            <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">\n                <div>\n                  <h3 className="text-lg'
);
fs.writeFileSync('src/app/admin/templates/page.tsx', code);
console.log('Fixed opening divs');

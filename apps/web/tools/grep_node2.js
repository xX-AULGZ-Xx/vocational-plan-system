const fs = require('fs');
const code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');
const match = code.match(/<label className="flex items-center text-xs font-medium text-gray-700">[\s\S]*?<\/label>/g);
console.log(match);

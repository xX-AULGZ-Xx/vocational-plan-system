const fs = require('fs');

const code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');

const match = code.match(/<div className="flex flex-col sm:flex-row gap-3">[\s\S]*?<div className="flex-1">/);
if (match) {
  console.log(match[0]);
} else {
  console.log('Not found');
}

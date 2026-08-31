const fs = require('fs');
const code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');
const regex = /<input[^>]*is_required[^>]*>/;
const match = code.match(regex);
console.log(match);
const idx = code.indexOf('checked={tag.is_required}');
if(idx > -1) {
    console.log(code.substring(idx - 200, idx + 500));
}

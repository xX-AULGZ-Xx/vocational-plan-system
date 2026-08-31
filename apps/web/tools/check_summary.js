const fs = require('fs');
let code = fs.readFileSync('src/app/projects/[id]/summary/page.tsx', 'utf8');
if (code.includes('department_id')) {
  console.log('Found department_id in summary page');
} else {
  console.log('No department_id found in summary page');
}

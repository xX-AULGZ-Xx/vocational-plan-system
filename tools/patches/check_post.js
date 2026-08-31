const fs = require('fs');
const code = fs.readFileSync('apps/api/src/modules/projects/project.controller.ts', 'utf8');
const p = code.indexOf("router.post('/',");
console.log(code.slice(p, p + 2500));

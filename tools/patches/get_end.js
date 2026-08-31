const fs = require('fs');
const code = fs.readFileSync('apps/api/src/modules/projects/project.controller.ts', 'utf8');
const p = code.indexOf("('/:id', authenticate,");
console.log(code.slice(p + 1500, p + 2500));

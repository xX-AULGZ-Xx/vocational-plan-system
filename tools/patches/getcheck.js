const fs = require('fs');
const code = fs.readFileSync('apps/api/src/modules/projects/project.controller.ts', 'utf8');
const p = code.indexOf("('/:id'");
console.log(code.slice(p - 100, p + 1000));

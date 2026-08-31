const fs = require('fs');
const file = 'apps/api/src/modules/projects/project.controller.ts';
let code = fs.readFileSync(file, 'utf8');

const startPut = code.indexOf("router.put('/:id',");
const endPut = code.indexOf("// POST /api/v1/projects/:id/submit");

const newPut = fs.readFileSync('new_put.txt', 'utf8');
code = code.slice(0, startPut) + newPut + code.slice(endPut);
fs.writeFileSync(file, code);
console.log('Fixed PUT block');

const fs = require('fs');
const file = 'apps/api/src/modules/projects/project.controller.ts';
let code = fs.readFileSync(file, 'utf8');

const startGet = code.indexOf("router.get('/:id',");
const endGet = code.indexOf("// POST /api/v1/projects (Create project)");

const newGet = fs.readFileSync('new_get.txt', 'utf8');
code = code.slice(0, startGet) + newGet + "\n" + code.slice(endGet);
fs.writeFileSync(file, code);
console.log('Fixed GET block');

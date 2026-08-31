const fs = require('fs');
let code = fs.readFileSync('src/modules/projects/project.controller.ts', 'utf8');

code = code.replace(
  `dynamic_data: dynamic_data ? JSON.stringify(dynamic_data) : undefined,`,
  `dynamic_data: dynamic_data !== undefined ? dynamic_data : undefined,`
);

code = code.replace(
  `dynamic_data: dynamic_data ? JSON.stringify(dynamic_data) : undefined,`,
  `dynamic_data: dynamic_data !== undefined ? dynamic_data : undefined,`
);

fs.writeFileSync('src/modules/projects/project.controller.ts', code);
console.log('Fixed dynamic_data encoding');

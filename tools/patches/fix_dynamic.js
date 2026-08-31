const fs = require('fs');

// Fix backend controller
let controller = fs.readFileSync('apps/api/src/modules/projects/project.controller.ts', 'utf8');
controller = controller.replace(
  'dynamic_data: dynamic_data !== undefined ? dynamic_data : undefined,', 
  'dynamic_data: dynamic_data !== undefined ? (typeof dynamic_data === \\'string\\' ? dynamic_data : JSON.stringify(dynamic_data)) : undefined,'
);
controller = controller.replace(
  'dynamic_data: dynamic_data ? JSON.stringify(dynamic_data) : existingProject.dynamic_data,',
  'dynamic_data: dynamic_data ? (typeof dynamic_data === \\'string\\' ? dynamic_data : JSON.stringify(dynamic_data)) : existingProject.dynamic_data,'
);
fs.writeFileSync('apps/api/src/modules/projects/project.controller.ts', controller);

// Fix frontend edit page to parse recursively if needed
let editPage = fs.readFileSync('apps/web/src/app/projects/[id]/edit/page.tsx', 'utf8');
const oldParse = \        let parsedDynamic = {};
        try {
          if (typeof proj.dynamic_data === 'string') {
            parsedDynamic = JSON.parse(proj.dynamic_data);
          } else if (proj.dynamic_data) {
            parsedDynamic = proj.dynamic_data;
          }
        } catch(e){}\;

const newParse = \        let parsedDynamic = {};
        try {
          let temp = proj.dynamic_data;
          while (typeof temp === 'string') {
            temp = JSON.parse(temp);
          }
          if (temp && typeof temp === 'object') {
            parsedDynamic = temp;
          }
        } catch(e){}\;

editPage = editPage.replace(oldParse, newParse);
fs.writeFileSync('apps/web/src/app/projects/[id]/edit/page.tsx', editPage);

console.log('Fixed dynamic data parsing');

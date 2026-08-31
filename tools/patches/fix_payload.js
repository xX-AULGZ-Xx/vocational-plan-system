const fs = require('fs');

function patchFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace("dynamic_data: dynamicData,", "dynamic_data: JSON.stringify(dynamicData),");
  fs.writeFileSync(file, code);
}

patchFile('apps/web/src/app/projects/new/page.tsx');
patchFile('apps/web/src/app/projects/[id]/edit/page.tsx');
console.log('Patched');

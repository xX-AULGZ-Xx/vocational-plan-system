const fs = require('fs');

function patchFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  // Change the main form grid to flex-col
  code = code.replace(/className="grid grid-cols-1 lg:grid-cols-2 gap-6"/g, 'className="flex flex-col gap-6"');
  
  fs.writeFileSync(filePath, code);
  console.log('Patched', filePath);
}

patchFile('src/app/projects/new/page.tsx');
if (fs.existsSync('src/app/projects/[id]/summary/page.tsx')) {
  patchFile('src/app/projects/[id]/summary/page.tsx');
}

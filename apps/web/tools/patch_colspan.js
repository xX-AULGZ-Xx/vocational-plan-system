const fs = require('fs');

function patchFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  // Find the col-span declaration
  if (code.includes('md:col-span-2')) {
    code = code.replace(/md:col-span-2/g, 'lg:col-span-2');
    fs.writeFileSync(filePath, code);
    console.log('Patched', filePath);
  } else {
    console.log('Could not find md:col-span-2 in', filePath);
  }
}

patchFile('src/app/projects/new/page.tsx');
patchFile('src/app/projects/[id]/summary/page.tsx');

const fs = require('fs');

function patchFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  // Find the grid declaration
  if (code.includes('md:grid-cols-2')) {
    code = code.replace(/md:grid-cols-2/g, 'lg:grid-cols-2');
    fs.writeFileSync(filePath, code);
    console.log('Patched', filePath);
  } else {
    console.log('Could not find md:grid-cols-2 in', filePath);
  }
}

patchFile('src/app/projects/new/page.tsx');
patchFile('src/app/projects/[id]/summary/page.tsx');

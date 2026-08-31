const fs = require('fs');

function patchFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  // Find col-span-2 and replace it. Need to be careful not to replace md:col-span-2 if we already changed it to lg:col-span-2
  code = code.replace(/ className="col-span-2"/g, ' className="col-span-1 lg:col-span-2"');
  // Also check if any existing lg:col-span-2 is missing col-span-1
  code = code.replace(/ className="lg:col-span-2"/g, ' className="col-span-1 lg:col-span-2"');
  code = code.replace(/ className="col-span-1 lg:col-span-2"/g, ' className="col-span-1 lg:col-span-2"'); // dedupe just in case
  
  fs.writeFileSync(filePath, code);
  console.log('Patched', filePath);
}

patchFile('src/app/projects/new/page.tsx');
patchFile('src/app/projects/[id]/summary/page.tsx');

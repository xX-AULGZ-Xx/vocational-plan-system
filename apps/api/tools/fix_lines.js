const fs = require('fs');

function fix(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');
  let lines = code.split('\n');
  let newLines = [];
  let inLoop = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('for (let i = 0; i < 5; i++) {') && lines[i+1] && lines[i+1].includes('replace(/\\{([^{}<>]')) {
      inLoop = true;
      i += 2; // skip the loop and the replace line and the closing brace
      continue;
    }
    newLines.push(lines[i]);
  }
  
  fs.writeFileSync(filePath, newLines.join('\n'));
  console.log('Fixed', filePath);
}

fix('src/lib/docx-generator.ts');

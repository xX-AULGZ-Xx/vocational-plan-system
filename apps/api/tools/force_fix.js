const fs = require('fs');

function forceFix() {
  let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');
  let lines = code.split('\n');
  let newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('for (let i = 0; i < 5; i++) {')) {
      // skip 4 lines
      i += 5;
      continue;
    }
    newLines.push(lines[i]);
  }
  
  fs.writeFileSync('src/lib/docx-generator.ts', newLines.join('\n'));
  console.log('Force fixed docx-generator.ts');
}

forceFix();

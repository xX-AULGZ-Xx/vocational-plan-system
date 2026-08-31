const fs = require('fs');

function fixGenerator() {
  let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');
  const brokenRegex = `      for (let i = 0; i < 5; i++) {
        docXml = docXml.replace(
          /\\{([^{}<>]*?)<\\/w:t><\\/w:r>[\\s\\S]*?<w:r[^>]*>(?:<w:rPr>[\\s\\S]*?<\\/w:rPr>)?<w:t[^>]*>([^{}<>]*?)\\}/g,
          '{$1$2}'
        );
      }`;
  
  if (code.includes(brokenRegex)) {
    code = code.replace(brokenRegex, '');
    fs.writeFileSync('src/lib/docx-generator.ts', code);
    console.log('Fixed docx-generator.ts');
  } else {
    console.log('Broken regex not found in docx-generator.ts');
  }
}

function fixExtractor() {
  let code = fs.readFileSync('src/lib/docx-extractor.ts', 'utf8');
  const brokenRegex = `  for (let i = 0; i < 5; i++) {
    combinedText = combinedText.replace(
      /\\{([^{}<>]*?)<\\/w:t><\\/w:r>[\\s\\S]*?<w:r[^>]*>(?:<w:rPr>[\\s\\S]*?<\\/w:rPr>)?<w:t[^>]*>([^{}<>]*?)\\}/g,
      '{$1$2}'
    );
  }`;

  if (code.includes(brokenRegex)) {
    code = code.replace(brokenRegex, '');
    fs.writeFileSync('src/lib/docx-extractor.ts', code);
    console.log('Fixed docx-extractor.ts');
  } else {
    console.log('Broken regex not found in docx-extractor.ts');
  }
}

fixGenerator();
fixExtractor();

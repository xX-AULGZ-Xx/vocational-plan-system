const fs = require('fs');

function patchFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  const oldRender = `{template?.tags?.map((tag: any) => renderTagInput(tag))}`;
  const newRender = `{template?.tags?.filter((t: any) => !(t.options && typeof t.options === 'object' && !Array.isArray(t.options) && t.options.is_hidden)).map((tag: any) => renderTagInput(tag))}`;

  if (code.includes(oldRender)) {
    code = code.replace(oldRender, newRender);
    fs.writeFileSync(filePath, code);
    console.log('Patched tags render in', filePath);
  } else {
    console.log('Could not find tags render in', filePath);
  }
}

patchFile('src/app/projects/[id]/summary/page.tsx');

const fs = require('fs');

function patchFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  // Find TABLE_LOOP case
  const oldBtn = `              <button
                type="button"
                onClick={() => {
                  const arr = Array.isArray(value) ? [...value] : [];
                  arr.push({});
                  handleDynamicChange(key, arr);
                }}`;
                
  const newBtn = `              <button
                type="button"
                onClick={() => {
                  const arr = Array.isArray(value) ? [...value] : [];
                  const maxItems = (tag.options && !Array.isArray(tag.options) && typeof tag.options === 'object') ? tag.options.maxItems : null;
                  if (maxItems && arr.length >= maxItems) {
                    alert(\`เพิ่มได้สูงสุด \${maxItems} รายการเท่านั้นครับ\`);
                    return;
                  }
                  arr.push({});
                  handleDynamicChange(key, arr);
                }}`;

  if (code.includes(oldBtn)) {
    code = code.replace(oldBtn, newBtn);
    fs.writeFileSync(filePath, code);
    console.log('Patched', filePath);
  } else {
    console.log('Could not find btn in', filePath);
  }
}

patchFile('src/app/projects/[id]/summary/page.tsx');

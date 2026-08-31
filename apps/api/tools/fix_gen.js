const fs = require('fs');

let code = fs.readFileSync('src/lib/docx-generator.ts', 'utf8');

// Update renderDynamicDocx signature
code = code.replace(
  `export async function renderDynamicDocx(templatePath: string, formData: Record<string, any>): Promise<{ filePath: string; fileName: string; buffer: Buffer }> {`,
  `export async function renderDynamicDocx(templatePath: string, formData: Record<string, any>, tags?: any[]): Promise<{ filePath: string; fileName: string; buffer: Buffer }> {`
);

// Update boolean logic
const oldBool = `    } else if (typeof val === 'boolean') {
      formData[key + '_chk'] = val ? '☑' : '☐';
      if (key.endsWith('_chk')) {
        formData[key] = val ? '☑' : '☐';
      }
    }`;

const newBool = `    } else if (typeof val === 'boolean') {
      const tag = tags?.find(t => t.tag_name === key || t.tag_name + '_chk' === key);
      const labelText = tag ? \` \${tag.label}\` : '';
      const box = val ? '☑' : '☐';
      formData[key + '_chk'] = box + labelText;
      if (key.endsWith('_chk')) {
        formData[key] = box + labelText;
      }
    }`;
code = code.replace(oldBool, newBool);

fs.writeFileSync('src/lib/docx-generator.ts', code);
console.log('Fixed signature and bool in generator');

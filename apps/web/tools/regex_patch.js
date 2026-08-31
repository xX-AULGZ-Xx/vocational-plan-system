const fs = require('fs');
const filePath = 'src/app/projects/[id]/summary/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const regex = /template\?\.tags\?\.\s*map\s*\(\s*\(tag:\s*any\)\s*=>\s*renderTagInput\(tag\)\s*\)/;
if (regex.test(code)) {
    code = code.replace(
        regex,
        `template?.tags?.filter((t: any) => !(t.options && typeof t.options === 'object' && !Array.isArray(t.options) && t.options.is_hidden)).map((tag: any) => renderTagInput(tag))`
    );
    fs.writeFileSync(filePath, code);
    console.log('Patched with Regex in summary');
} else {
    console.log('Not found with Regex');
}

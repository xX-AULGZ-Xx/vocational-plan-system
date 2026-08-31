const fs = require('fs');
let code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');

const target = `  return (
    <div className="space-y-6">`;

const replace = `  return (
    <div className="space-y-6">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUpdateFileChange} 
        accept=".docx" 
        className="hidden" 
      />`;

if (code.includes(target)) {
  code = code.replace(target, replace);
  fs.writeFileSync('src/app/admin/templates/page.tsx', code);
  console.log('Injected file input');
} else {
  console.log('Not found');
}

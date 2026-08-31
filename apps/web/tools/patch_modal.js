const fs = require('fs');

const filePath = 'src/app/admin/templates/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const targetOuter = `<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">`;
const replacementOuter = `<div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm">`;

const targetInner = `<div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden relative">`;
const replacementInner = `<div className="bg-white sm:rounded-2xl shadow-xl w-full h-full sm:max-w-5xl sm:h-[90vh] flex flex-col overflow-hidden relative">`;

code = code.replace(targetOuter, replacementOuter);
code = code.replace(targetInner, replacementInner);
code = code.replace(`<div className="fixed inset-0 z-50 flex items-center justify-center p-4">`, `<div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">`); // Just in case there is no bg-slate

fs.writeFileSync(filePath, code);
console.log('Patched modal responsive layout');

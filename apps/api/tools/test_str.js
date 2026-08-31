const val = { chk_1787537361251: true, chk_1787537368634: true, chk_1787537379136: true };
const options = [
  { key: 'chk_1787537361251', label: '1', indent: 0 },
  { key: 'chk_1787537368634', label: '1.1', indent: 1 },
  { key: 'chk_1787537379136', label: '1.1.1', indent: 2 }
];
let checklistText = '';
options.forEach((opt, optIndex) => {
   const isChecked = val[opt.key];
   const box = isChecked ? '☑' : '☐';
   let indent = '';
   if (opt.indent === 1) indent = '    ';
   if (opt.indent === 2) indent = '        ';
   checklistText += `${indent}${box} ${opt.label}\n`;
});
console.log("-----");
console.log(checklistText);
console.log("-----");

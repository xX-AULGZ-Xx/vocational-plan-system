const fs = require('fs');
let code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');

code = code.replace(
  `setSuccessMsg(data.message || 'อัปเดตไฟล์สำเร็จ');`,
  `setMsg({ type: 'success', text: data.message || 'อัปเดตไฟล์สำเร็จ' });`
);

code = code.replace(
  `setErrorMsg(data.message || 'ไม่สามารถอัปเดตไฟล์ได้');`,
  `setMsg({ type: 'error', text: data.message || 'ไม่สามารถอัปเดตไฟล์ได้' });`
);

code = code.replace(
  `setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการอัปเดตไฟล์');`,
  `setMsg({ type: 'error', text: err.message || 'เกิดข้อผิดพลาดในการอัปเดตไฟล์' });`
);

fs.writeFileSync('src/app/admin/templates/page.tsx', code);
console.log('Fixed message state');

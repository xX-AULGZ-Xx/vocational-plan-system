const fs = require('fs');
let code = fs.readFileSync('src/lib/docx-extractor.ts', 'utf8');

const valBlock = `  if (combinedText.includes('{}')) {
    throw new Error('ระบบตรวจพบวงเล็บว่างเปล่า "{}" ในไฟล์ที่คุณอัปโหลด! กรุณาตรวจสอบว่าคุณได้พิมพ์ชื่อตัวแปรลงในวงเล็บ (เช่น {leader_name}) และได้บันทึกไฟล์นั้นอย่างถูกต้องก่อนอัปโหลดครับ (ไฟล์ที่คุณเพิ่งอัปโหลดเข้ามา เซิร์ฟเวอร์อ่านได้แค่ {} ครับ)');
  }`;

code = code.replace('const tagRegex = /\\{([^{}]+)\\}/g;', valBlock + '\n\n  const tagRegex = /\\{([^{}]+)\\}/g;');

fs.writeFileSync('src/lib/docx-extractor.ts', code);

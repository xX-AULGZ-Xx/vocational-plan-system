const fs = require('fs');
let code = fs.readFileSync('prisma/schema.prisma', 'utf8');
code = code.replace(/ALIGNMENT_CHECKLIST/g, 'ALIGNMENT_CHECKLIST\n  DIVISION_DROPDOWN\n  DEPARTMENT_DROPDOWN');
fs.writeFileSync('prisma/schema.prisma', code);

const fs = require('fs');
let code = fs.readFileSync('prisma/schema.prisma', 'utf8');
code = code.replace(/TIMELINE\\n  ALIGNMENT_CHECKLIST/g, 'TIMELINE\n  ALIGNMENT_CHECKLIST');
fs.writeFileSync('prisma/schema.prisma', code);

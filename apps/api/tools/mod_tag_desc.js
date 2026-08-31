const fs = require('fs');
let code = fs.readFileSync('prisma/schema.prisma', 'utf8');
code = code.replace(
  'label       String?          @db.VarChar(150)',
  'label       String?          @db.VarChar(150)\n  description String?          @db.Text'
);
fs.writeFileSync('prisma/schema.prisma', code);

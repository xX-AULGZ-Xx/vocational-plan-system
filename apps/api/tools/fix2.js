const fs = require('fs');
let code = fs.readFileSync('prisma/schema.prisma', 'utf8');

// clean up broken lines
code = code.replace('IMAGE\\n  CALCULATION\\n  DROPDOWN', 'IMAGE\n  CALCULATION\n  DROPDOWN');
code = code.replace('is_required Boolean          @default(false)\\n  sort_order  Int              @default(0)\\n  options     Json?', 'is_required Boolean          @default(false)\n  sort_order  Int              @default(0)\n  options     Json?');

fs.writeFileSync('prisma/schema.prisma', code);

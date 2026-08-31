const fs = require('fs');
const code = fs.readFileSync('apps/api/src/lib/prisma.ts', 'utf8');
console.log(code);

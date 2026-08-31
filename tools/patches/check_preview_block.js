const fs = require('fs');
const code = fs.readFileSync('apps/web/src/app/projects/[id]/page.tsx', 'utf8');
const start = code.indexOf("{/* Read-Only Form View */}");
const end = code.indexOf("{activeTab === 'details'");
console.log('Start index:', start);
console.log('End index:', end);

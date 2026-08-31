const fs = require('fs');
let c = fs.readFileSync('apps/web/src/app/projects/[id]/page.tsx', 'utf8').split('\n');
c[500] = '';
c[439] = `{activeTab === 'approvals' && (
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm no-print space-y-3">`;
fs.writeFileSync('apps/web/src/app/projects/[id]/page.tsx', c.join('\n'));

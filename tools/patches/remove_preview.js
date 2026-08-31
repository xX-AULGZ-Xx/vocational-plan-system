const fs = require('fs');
const file = 'apps/web/src/app/projects/[id]/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const start = code.indexOf("{/* Read-Only Form View */}");
const end = code.indexOf("{activeTab === 'details'");

if (start > -1 && end > -1) {
  code = code.slice(0, start) + code.slice(end);
}

// Remove from useState
code = code.replace("useState<'preview' | 'details' | 'approvals' | 'attachments'>('preview')", "useState<'details' | 'approvals' | 'attachments'>('details')");

// Remove from tabs array
code = code.replace("{ id: 'preview', label: '?????????????', icon: FileText },\n          ", "");

fs.writeFileSync(file, code);
console.log('Removed preview tab');

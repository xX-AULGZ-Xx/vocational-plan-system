const fs = require('fs');

function patchFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  // Find the payload block
  const oldPayloadStatus = "status,";
  const newPayloadStatus = "status: status === 'pending' ? 'submitted' : status,";
  
  // Actually, let's just replace 'status,' inside the payload block
  code = code.replace("template_id: proposalTemplate?.id,\n        status,\n        dynamic_data: dynamicData,", "template_id: proposalTemplate?.id,\n        status: status === 'pending' ? 'submitted' : status,\n        dynamic_data: dynamicData,");
  
  fs.writeFileSync(file, code);
}

patchFile('apps/web/src/app/projects/new/page.tsx');
patchFile('apps/web/src/app/projects/[id]/edit/page.tsx');
console.log('Patched');

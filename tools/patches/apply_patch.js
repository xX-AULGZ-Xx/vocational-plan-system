const fs = require('fs');
const path = 'apps/api/src/lib/docx-generator.ts';
let code = fs.readFileSync(path, 'utf8');

const sc = "    formData.mat_total = matBudget > 0 ? matBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-';\n    formData.svc_total = svcBudget > 0 ? svcBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-';\n    formData.rem_total = remBudget > 0 ? remBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-';\n    const total = matBudget + svcBudget + remBudget;\n    formData.budget_total = total > 0 ? total.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-';\n  }";

const rc = "    const matText = matBudget > 0 ? matBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-';\n    const svcText = svcBudget > 0 ? svcBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-';\n    const remText = remBudget > 0 ? remBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-';\n    const total = matBudget + svcBudget + remBudget;\n    const totalText = total > 0 ? total.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-';\n\n    formData.mat_total = matText;\n    formData.svc_total = svcText;\n    formData.rem_total = remText;\n    formData.budget_total = totalText;\n\n    const bt = (formData.budget_type || '').toString().trim();\n    const isGov = bt.includes('????????') && !bt.includes('??????');\n    const isIncome = bt.includes('??????');\n    const isSub = bt.includes('???????');\n    \n    const types = ['gov', 'income', 'sub', 'other'];\n    types.forEach(t => {\n      formData['mat_' + t] = '-';\n      formData['svc_' + t] = '-';\n      formData['rem_' + t] = '-';\n      formData['total_' + t] = '-';\n    });\n\n    let target = 'other';\n    if (isGov) target = 'gov';\n    else if (isIncome) target = 'income';\n    else if (isSub) target = 'sub';\n\n    if (bt) {\n      formData['mat_' + target] = matText;\n      formData['svc_' + target] = svcText;\n      formData['rem_' + target] = remText;\n      formData['total_' + target] = totalText;\n    }\n  }";

code = code.replace(sc, rc);
fs.writeFileSync(path, code);
console.log('Patched');

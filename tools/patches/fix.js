const fs = require('fs');
const file = 'apps/api/src/modules/projects/project.controller.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace all garbled text with proper Thai or English
code = code.replace(/message:\s*'犹�ｸ｡犹謂ｸ樅ｸ壟ｸもｹ霞ｸｭ犧｡犧ｹ犧･犹もｸ�ｸ｣犧�ｸ≒ｸｲ犧｣'/g, "message: '??????????????????'");
code = code.replace(/message:\s*'犧�ｸｸ犧内ｹ�ｸ｡犹謂ｸ｡犧ｵ犧ｪ犧ｴ犧伶ｸ倨ｸｴ犹呉ｹ≒ｸ≒ｹ霞ｹ�ｸもｹもｸ�ｸ｣犧�ｸ≒ｸｲ犧｣犧� �ｸｵ犹�'/g, "message: '?????????????????????????????'");
code = code.replace(/message:\s*'犧ｭ犧ｱ犧巵ｹ犧扉ｸ歩ｸもｹ霞ｸｭ犧｡犧ｹ犧･犹もｸ�ｸ｣犧�ｸ≒ｸｲ犧｣犧ｪ犧ｳ犹犧｣犹�ｸ�'/g, "message: '?????????????????????????'");
code = code.replace(/message:\s*'犹犧≒ｸｴ犧扉ｸもｹ霞ｸｭ犧憫ｸｴ犧扉ｸ樅ｸ･犧ｲ犧�'/g, "message: '?????????????????????????'");

// Add dynamic_data to the update block
code = code.replace('status: status ? (status as ProjectStatus) : existingProject.status,', 'status: status ? (status as ProjectStatus) : existingProject.status,\n        dynamic_data: dynamic_data ? JSON.stringify(dynamic_data) : existingProject.dynamic_data,');

fs.writeFileSync(file, code);
console.log('Fixed');

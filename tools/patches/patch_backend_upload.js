const fs = require('fs');
const path = 'apps/api/src/modules/projects/project.controller.ts';
let code = fs.readFileSync(path, 'utf8');

const postDocSearch = "const { id } = req.params;\n    const projectId = BigInt(id);\n\n    if (!req.file) {";
const postDocReplace = "const { id } = req.params;\n    const projectId = BigInt(id);\n\n    const existingProject = await prisma.project.findUnique({ where: { id: projectId }, select: { leader_id: true } });\n    if (!existingProject) return res.status(404).json({ success: false, message: '????????????' });\n    if (existingProject.leader_id !== BigInt(req.user.id) && req.user.role !== 'ADMIN' && req.user.role !== 'PLANNING_OFFICER') {\n      return res.status(403).json({ success: false, message: '??????????????????????????????????' });\n    }\n\n    if (!req.file) {";

code = code.replace(postDocSearch, postDocReplace);

const delDocSearch = "const doc = await prisma.projectDocument.findUnique({\n      where: { id: BigInt(docId) },\n    });";
const delDocReplace = "const doc = await prisma.projectDocument.findUnique({\n      where: { id: BigInt(docId) },\n      include: { project: { select: { leader_id: true } } },\n    });\n\n    if (doc && doc.project.leader_id !== BigInt(req.user.id) && req.user.role !== 'ADMIN' && req.user.role !== 'PLANNING_OFFICER') {\n      return res.status(403).json({ success: false, message: '?????????????????????????????' });\n    }";

code = code.replace(delDocSearch, delDocReplace);

fs.writeFileSync(path, code);
console.log('Backend patched.');

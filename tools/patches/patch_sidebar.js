const fs = require('fs');
const path = 'apps/web/src/components/layout/Sidebar.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldNav = "{ name: '?????????????', href: '/my-projects', icon: FolderKanban, roles: ['TEACHER', 'HEAD_DEPT', 'PLANNING_OFFICER', 'ADMIN'] },";
const newNav = "{ name: role === 'PLANNING_OFFICER' ? '??????????????' : '?????????????', href: '/my-projects', icon: FolderKanban, roles: ['TEACHER', 'HEAD_DEPT', 'PLANNING_OFFICER', 'ADMIN'] },";

code = code.replace(oldNav, newNav);

fs.writeFileSync(path, code);
console.log('Sidebar patched.');

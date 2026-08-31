const fs = require('fs');
const path = 'apps/web/src/app/my-projects/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Get user from useAuth
code = code.replace("const { token } = useAuth();", "const { token, user } = useAuth();");

// 2. Modify fetchMyProjects URL
const oldFetch = "const res = await fetch('/api/v1/projects?my_projects=true', {";
const newFetch = "const endpoint = user?.role === 'PLANNING_OFFICER' ? '/api/v1/projects' : '/api/v1/projects?my_projects=true';\n      const res = await fetch(endpoint, {";
code = code.replace(oldFetch, newFetch);

// 3. Update the H1 title
const oldH1 = "<h1 className=\"text-2xl font-bold text-slate-900\">?????????????</h1>";
const newH1 = "<h1 className=\"text-2xl font-bold text-slate-900\">{user?.role === 'PLANNING_OFFICER' ? '??????????????' : '?????????????'}</h1>";
code = code.replace(oldH1, newH1);

fs.writeFileSync(path, code);
console.log('my-projects page patched.');

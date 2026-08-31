const fs = require('fs');
const path = 'apps/web/src/app/projects/[id]/edit/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add useParams
code = code.replace("import { useRouter } from 'next/navigation';", "import { useRouter, useParams } from 'next/navigation';");

// 2. Add params hook
code = code.replace("const router = useRouter();", "const router = useRouter();\n  const params = useParams();\n  const projectId = params.id as string;\n  const [isLoadingProject, setIsLoadingProject] = useState(true);");

// 3. Rename component
code = code.replace("export default function NewProjectPage() {", "export default function EditProjectPage() {");

// 4. Update the fetchDivisions and add fetchProject
const oldEffect = \  useEffect(() => {
    fetchDivisions();
    fetchTemplate();
  }, [token]);\;

const newEffect = \  useEffect(() => {
    if (token && projectId) {
      fetchDivisions().then(() => fetchTemplate().then(() => fetchProject()));
    }
  }, [token, projectId]);

  const fetchProject = async () => {
    try {
      const res = await fetch(\/api/v1/projects/\\, {
        headers: { Authorization: \Bearer \\ }
      });
      const data = await res.json();
      if (data.success && data.data) {
        const proj = data.data;
        if (proj.status !== 'DRAFT') {
          alert('?????????????????????????????????????????????');
          router.push('/my-projects');
          return;
        }
        
        let parsedDynamic = {};
        try {
          if (typeof proj.dynamic_data === 'string') {
            parsedDynamic = JSON.parse(proj.dynamic_data);
          } else if (proj.dynamic_data) {
            parsedDynamic = proj.dynamic_data;
          }
        } catch(e){}
        
        // Also populate default fields from the parsed dynamic data if needed
        setDynamicData(parsedDynamic);
        
        // Map budget items
        if (proj.budget_items && Array.isArray(proj.budget_items)) {
          const bItems = proj.budget_items.map((b: any) => ({
             category_id: b.category_id,
             description: b.description,
             quantity: Number(b.quantity),
             unit: b.unit,
             unit_price: Number(b.unit_price),
             total_amount: Number(b.total_amount)
          }));
          setBudgetItems(bItems);
        }
      }
    } catch(e) {
      console.error(e);
    } finally {
      setIsLoadingProject(false);
    }
  };\;

code = code.replace(oldEffect, newEffect);

// 5. Update handleSubmit
code = code.replace("const res = await fetch('/api/v1/projects', {", "const res = await fetch(\/api/v1/projects/\\, {");
code = code.replace("method: 'POST',", "method: 'PUT',");
code = code.replace("setSuccessMsg('??????????????????');", "setSuccessMsg('???????????????????????????');");

// 6. Update title
code = code.replace('<h1 className="text-2xl font-bold text-gray-900">????????????????</h1>', '<h1 className="text-2xl font-bold text-gray-900">????????????????</h1>');
code = code.replace('<p className="text-gray-500 mt-1">????????????????????????????????????????????</p>', '<p className="text-gray-500 mt-1">????????????????????????????</p>');

// 7. Add loading wrapper
code = code.replace("return (\n    <div className=\"max-w-4xl", "if (isLoadingProject) return <div className=\"text-center py-20\">???????????????...</div>;\n\n  return (\n    <div className=\"max-w-4xl");

fs.writeFileSync(path, code);
console.log('Patched edit page');

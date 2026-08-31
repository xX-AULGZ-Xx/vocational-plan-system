const fs = require('fs');

function modAdminPage() {
  const path = 'src/app/admin/templates/page.tsx';
  let code = fs.readFileSync(path, 'utf8');

  code = code.replace(
    '<option value="ALIGNMENT_CHECKLIST">แบบประเมินความสอดคล้อง (Alignment Checklist)</option>',
    '<option value="ALIGNMENT_CHECKLIST">แบบประเมินความสอดคล้อง (Alignment Checklist)</option>\n                                <option value="DIVISION_DROPDOWN">เลือกฝ่าย / กลุ่มงาน (Division)</option>\n                                <option value="DEPARTMENT_DROPDOWN">เลือกแผนกวิชา / งาน (Department)</option>'
  );

  fs.writeFileSync(path, code);
  console.log('Modified admin page');
}

function modProjectsPage(path) {
  let code = fs.readFileSync(path, 'utf8');

  // Replace fetchDepartments with fetchDivisions
  if (code.includes('const [departments, setDepartments] = useState')) {
    code = code.replace('const [departments, setDepartments] = useState<any[]>([]);', 'const [divisionsData, setDivisionsData] = useState<any[]>([]);');
    code = code.replace('fetchDepartments();', 'fetchDivisions();');
    
    const fetchDeptBlock = `  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/v1/admin/departments', {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      const data = await res.json();
      if (data.success) {
        setDepartments(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };`;
    
    const fetchDivBlock = `  const fetchDivisions = async () => {
    try {
      const res = await fetch('/api/v1/divisions', {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      const data = await res.json();
      if (data.success) {
        setDivisionsData(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };`;
    
    if (code.includes(fetchDeptBlock)) {
      code = code.replace(fetchDeptBlock, fetchDivBlock);
    } else {
      // Fallback regex if formatting differs
      code = code.replace(/const fetchDepartments[\s\S]*?};/m, fetchDivBlock);
    }
    
    // Update computedDepartmentId
    if (path.includes('new/page.tsx')) {
      const compDeptBlock = `// For department, we'll just pick the first one since we don't have it in the form
      const computedDepartmentId = departments.length > 0 ? departments[0].id : 1;`;
      
      const newCompDeptBlock = `// Find department_id from DEPARTMENT_DROPDOWN tag if selected
      let computedDepartmentId = 1;
      const deptTag = proposalTemplate?.tags?.find((t: any) => t.tag_type === 'DEPARTMENT_DROPDOWN');
      if (deptTag && dynamicData[deptTag.tag_name]) {
        const selectedName = dynamicData[deptTag.tag_name];
        const allDepts = divisionsData.reduce((acc: any[], div: any) => [...acc, ...(div.departments || [])], []);
        const found = allDepts.find((d: any) => d.name === selectedName);
        if (found) computedDepartmentId = found.id;
      } else {
        const firstDiv = divisionsData[0];
        if (firstDiv && firstDiv.departments && firstDiv.departments.length > 0) computedDepartmentId = firstDiv.departments[0].id;
      }`;
      
      code = code.replace(compDeptBlock, newCompDeptBlock);
    }
  }

  // Add the switch cases for DIVISION_DROPDOWN and DEPARTMENT_DROPDOWN
  const replaceStr = `case 'ALIGNMENT_CHECKLIST':`;
  const newStr = `case 'DIVISION_DROPDOWN':
        return (
          <div key={key} className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
            <select
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              disabled={typeof isEditing !== 'undefined' ? !isEditing : false}
              required={tag.is_required}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">-- เลือกฝ่าย / กลุ่มงาน --</option>
              {(typeof divisionsData !== 'undefined' ? divisionsData : []).map((d: any) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        );
      case 'DEPARTMENT_DROPDOWN': {
        const allDepts = (typeof divisionsData !== 'undefined' ? divisionsData : []).reduce((acc: any[], div: any) => [...acc, ...(div.departments || [])], []);
        return (
          <div key={key} className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
            <select
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              disabled={typeof isEditing !== 'undefined' ? !isEditing : false}
              required={tag.is_required}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">-- เลือกแผนกวิชา / งาน --</option>
              {allDepts.map((d: any) => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        );
      }
      case 'ALIGNMENT_CHECKLIST':`;
      
  if (!code.includes("case 'DIVISION_DROPDOWN':")) {
    code = code.replace(replaceStr, newStr);
  }

  fs.writeFileSync(path, code);
  console.log('Modified', path);
}

modAdminPage();
modProjectsPage('src/app/projects/new/page.tsx');
modProjectsPage('src/app/projects/[id]/summary/page.tsx');

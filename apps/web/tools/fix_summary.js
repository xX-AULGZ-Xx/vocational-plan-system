const fs = require('fs');
let code = fs.readFileSync('src/app/projects/[id]/summary/page.tsx', 'utf8');
if (!code.includes('const [divisionsData, setDivisionsData] = useState')) {
  // We need to inject it!
  const block = `const [dynamicData, setDynamicData] = useState<Record<string, any>>({});`;
  const insert = block + `\n  const [divisionsData, setDivisionsData] = useState<any[]>([]);`;
  code = code.replace(block, insert);
  
  const fetchBlock = `const fetchProject = async () => {`;
  const insertFetch = `  const fetchDivisions = async () => {
    try {
      const res = await fetch('/api/v1/divisions', {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      const data = await res.json();
      if (data.success) {
        setDivisionsData(data.data);
      }
    } catch (e) { console.error(e); }
  };
  
  ` + fetchBlock;
  code = code.replace(fetchBlock, insertFetch);
  
  const effectBlock = `fetchProject();`;
  const newEffectBlock = `fetchDivisions();\n      fetchProject();`;
  code = code.replace(effectBlock, newEffectBlock);
  
  fs.writeFileSync('src/app/projects/[id]/summary/page.tsx', code);
  console.log('Injected divisionsData to summary page');
}

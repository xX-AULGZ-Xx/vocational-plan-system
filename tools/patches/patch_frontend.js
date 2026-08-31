const fs = require('fs');
let code = fs.readFileSync('apps/web/src/app/projects/new/page.tsx', 'utf8');

const newFetchLogic = `
  const fetchProposalTemplate = async () => {
    try {
      const res = await fetch('/api/v1/projects/active-proposal-template', {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setProposalTemplate(data.data);
        // Initialize dynamic data
        const initial = {};
        data.data.tags?.forEach((t) => {
           if (t.tag_type === 'TABLE_LOOP') {
             initial[t.tag_name] = [{}];
           } else if (t.tag_type === 'BOOLEAN') {
             initial[t.tag_name] = false;
           } else {
             initial[t.tag_name] = '';
           }
        });
        setDynamicData(initial);
      } else {
         console.warn('No active proposal template found.');
      }
    } catch (e) {
      console.error(e);
    }
  };
`;

// Replace the old fetchProposalTemplate function
const start = code.indexOf('  const fetchProposalTemplate = async () => {');
const end = code.indexOf('  const handleDynamicChange = (key: string, value: any) => {');
code = code.substring(0, start) + newFetchLogic.trim() + '\n\n' + code.substring(end);

fs.writeFileSync('apps/web/src/app/projects/new/page.tsx', code);

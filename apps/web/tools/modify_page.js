const fs = require('fs');
let code = fs.readFileSync('src/app/projects/new/page.tsx', 'utf8');

const startIdx = code.indexOf('{/* System Data */}');
const endIdx = code.indexOf('{/* Dynamic Form from Tags */}');

if (startIdx > -1 && endIdx > -1) {
  const blockToRemove = code.substring(startIdx, endIdx);
  code = code.replace(blockToRemove, '');
  
  // Update handleSubmit
  const oldSubmit = `const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'pending') => {
    e.preventDefault();
    if (!title || !departmentId) {`;
  
  const newSubmit = `const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'pending') => {
    e.preventDefault();
    
    // Auto-map system fields from dynamic data
    const computedTitle = dynamicData['title'] || dynamicData['project_name'] || 'โครงการไม่มีชื่อ';
    const computedFiscalYear = parseInt(dynamicData['fiscal_year']) || new Date().getFullYear() + 543;
    const computedTotalBudget = dynamicData['total_budget'] || 0;
    // For department, we'll just pick the first one since we don't have it in the form
    const computedDepartmentId = departments.length > 0 ? departments[0].id : 1;
    
    if (!computedTitle) {`;
    
  code = code.replace(oldSubmit, newSubmit);
  
  // Replace the payload values
  code = code.replace('title,\n', 'title: computedTitle,\n');
  code = code.replace('fiscal_year: fiscalYear,', 'fiscal_year: computedFiscalYear,');
  code = code.replace('department_id: parseInt(departmentId),', 'department_id: computedDepartmentId,');
  code = code.replace('total_budget: totalBudget,', 'total_budget: computedTotalBudget,');
  
  fs.writeFileSync('src/app/projects/new/page.tsx', code);
  console.log('Successfully updated projects/new form');
} else {
  console.log('Could not find blocks');
}

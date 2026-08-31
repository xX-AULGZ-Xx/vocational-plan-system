const fs = require('fs');

function modFile(path) {
  let code = fs.readFileSync(path, 'utf8');
  
  // templates page
  if (path.includes('admin/templates/page.tsx')) {
    code = code.replace(
      '<option value="DATE">วันที่ (Date)</option>',
      '<option value="DATE">วันที่ (Date)</option>\n                                <option value="DATERANGE">ช่วงวันที่ (Start-End Date)</option>'
    );
  }
  
  // projects page
  if (path.includes('projects/new/page.tsx') || path.includes('summary/page.tsx')) {
    const replaceStr = `      case 'DATE':`;
    const newStr = `      case 'DATERANGE':
        return (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={value?.start || ''}
                onChange={(e) => handleDynamicChange(key, { ...(value || {}), start: e.target.value })}
                disabled={typeof isEditing !== 'undefined' ? !isEditing : false}
                required={tag.is_required}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <span className="text-gray-500 text-sm">ถึง</span>
              <input
                type="date"
                value={value?.end || ''}
                onChange={(e) => handleDynamicChange(key, { ...(value || {}), end: e.target.value })}
                disabled={typeof isEditing !== 'undefined' ? !isEditing : false}
                required={tag.is_required}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        );
      case 'DATE':`;
      
      if (!code.includes("case 'DATERANGE':")) {
        code = code.replace(replaceStr, newStr);
      }
  }
  
  fs.writeFileSync(path, code);
}

modFile('../web/src/app/admin/templates/page.tsx');
modFile('../web/src/app/projects/new/page.tsx');
modFile('../web/src/app/projects/[id]/summary/page.tsx');

console.log('Modified all files for DATERANGE');

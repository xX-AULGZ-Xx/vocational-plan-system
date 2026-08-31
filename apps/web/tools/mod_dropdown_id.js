const fs = require('fs');
let code = fs.readFileSync('src/app/projects/[id]/page.tsx', 'utf8');

if (code.includes("case 'BOOLEAN':")) {
  const replaceStr = `      case 'BOOLEAN':`;
  const newStr = `      case 'DROPDOWN':
        const options = Array.isArray(tag.options) ? tag.options : [];
        return (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
            <select
              value={value || ''}
              onChange={(e) => handleDynamicChange(key, e.target.value)}
              disabled={!isEditing}
              required={tag.is_required}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
            >
              <option value="">-- กรุณาเลือก --</option>
              {options.map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        );
      case 'BOOLEAN':`;

  code = code.replace(replaceStr, newStr);
  fs.writeFileSync('src/app/projects/[id]/page.tsx', code);
  console.log('Modified [id]/page.tsx');
}

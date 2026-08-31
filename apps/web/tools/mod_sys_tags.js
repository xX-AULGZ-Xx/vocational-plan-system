const fs = require('fs');
let code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');

const target1 = `                          <div className="lg:col-span-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Tag ในเอกสาร</label>
                            <div className="px-3 py-2 bg-gray-100 rounded text-sm font-mono text-gray-700 truncate">
                              {tag.tag_name}
                            </div>
                          </div>`;

const replace1 = `                          <div className="lg:col-span-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Tag ในเอกสาร (ตัวแปร)</label>
                            <input
                              type="text"
                              value={tag.tag_name || ''}
                              onChange={(e) => {
                                const newTags = [...tags];
                                newTags[index].tag_name = e.target.value;
                                setTags(newTags);
                              }}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono text-indigo-700"
                            />
                          </div>`;

const target2 = `              <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">`;
const replace2 = `              <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">`;

// We also need to add the helper function in the component. But wait, I can just do it inline.
const target3 = `                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">`;
const replace3 = `                <div className="bg-blue-50 px-6 py-3 border-b border-gray-200 flex items-center space-x-2 overflow-x-auto text-sm shrink-0">
                  <span className="font-semibold text-blue-800 whitespace-nowrap">Tag แนะนำ:</span>
                  {[
                    { key: 'project_name', label: 'ชื่อโครงการ', type: 'TEXT' },
                    { key: 'fiscal_year', label: 'ปีงบประมาณ', type: 'TEXT' },
                    { key: 'total_budget', label: 'งบประมาณรวม', type: 'TEXT' },
                    { key: 'department', label: 'แผนก/ฝ่าย', type: 'DEPARTMENT_DROPDOWN' },
                    { key: 'project_code', label: 'รหัสโครงการ', type: 'TEXT' }
                  ].map(sysTag => (
                    <button
                      key={sysTag.key}
                      onClick={() => {
                        if (tags.some(t => t.tag_name === sysTag.key)) return;
                        setTags([...tags, { 
                          tag_name: sysTag.key, 
                          label: sysTag.label, 
                          tag_type: sysTag.type, 
                          is_required: true, 
                          sort_order: tags.length 
                        }]);
                      }}
                      className="px-2 py-1 bg-white border border-blue-200 text-blue-600 rounded hover:bg-blue-100 whitespace-nowrap transition-colors"
                      title="คลิกเพื่อเพิ่ม"
                    >
                      + {sysTag.key}
                    </button>
                  ))}
                  <div className="flex-1"></div>
                  <button
                    onClick={() => {
                      setTags([...tags, { 
                        tag_name: 'new_tag_' + (tags.length + 1), 
                        label: 'ฟิลด์ใหม่', 
                        tag_type: 'TEXT', 
                        is_required: false, 
                        sort_order: tags.length 
                      }]);
                    }}
                    className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 whitespace-nowrap transition-colors flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" /> เพิ่ม Tag เอง
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">`;


if (code.includes(target1) && code.includes(target3)) {
  code = code.replace(target1, replace1);
  code = code.replace(target3, replace3);
  fs.writeFileSync('src/app/admin/templates/page.tsx', code);
  console.log('Modified Tag Manager UI');
} else {
  console.log('Not found');
}

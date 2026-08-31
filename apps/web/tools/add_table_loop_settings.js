const fs = require('fs');

let code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');

const tableLoopBlock = `
                        {tag.tag_type === 'TABLE_LOOP' && (
                          <div className="mt-3 w-full bg-blue-50 p-3 rounded-md border border-blue-200 col-span-1 md:col-span-2 lg:col-span-4">
                            <label className="block text-xs font-medium text-gray-700 mb-1">จำกัดจำนวนรายการสูงสุด (Max Items)</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="เช่น 3 หรือ 5 (ปล่อยว่างถ้าไม่จำกัด)"
                              value={(tag.options && !Array.isArray(tag.options) && typeof tag.options === 'object') ? tag.options.maxItems || '' : ''}
                              onChange={(e) => {
                                const newTags = [...editingTags];
                                const currentOptions = Array.isArray(tag.options) ? {} : (tag.options || {});
                                newTags[index] = { 
                                  ...tag, 
                                  options: { ...currentOptions, maxItems: e.target.value ? parseInt(e.target.value) : null } 
                                };
                                setEditingTags(newTags);
                              }}
                              className="w-full sm:w-1/2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">ตั้งค่าเพื่อป้องกันไม่ให้ผู้ใช้เพิ่มรายการเกินจำนวนที่กำหนด</p>
                          </div>
                        )}
`;

code = code.replace(
  `                        {tag.tag_type === 'ALIGNMENT_CHECKLIST' && (`,
  tableLoopBlock + `\n                        {tag.tag_type === 'ALIGNMENT_CHECKLIST' && (`
);

fs.writeFileSync('src/app/admin/templates/page.tsx', code);
console.log('Added TABLE_LOOP settings block');

const fs = require('fs');
let code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');

const search = `                          <div className="lg:col-span-1 flex items-center pt-5">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={tag.is_required || false}
                                onChange={(e) => {
                                  const newTags = [...tags];
                                  newTags[index].is_required = e.target.checked;
                                  setTags(newTags);
                                }}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-gray-700">จำเป็นต้องกรอก (Required)</span>
                            </label>
                          </div>`;
                          
const replace = `                          <div className="lg:col-span-1 flex items-center pt-5">
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={tag.is_required || false}
                                onChange={(e) => {
                                  const newTags = [...tags];
                                  newTags[index].is_required = e.target.checked;
                                  setTags(newTags);
                                }}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-gray-700">จำเป็นต้องกรอก (Required)</span>
                            </label>
                          </div>
                          
                          <div className="lg:col-span-4">
                            <label className="block text-xs font-medium text-gray-500 mb-1">คำอธิบาย (Tooltip / Placeholder)</label>
                            <input
                              type="text"
                              value={tag.description || ''}
                              onChange={(e) => {
                                const newTags = [...tags];
                                newTags[index].description = e.target.value;
                                setTags(newTags);
                              }}
                              placeholder="ข้อความแนะนำสำหรับผู้ใช้งาน..."
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-600"
                            />
                          </div>`;

if (code.includes(search)) {
  code = code.replace(search, replace);
  fs.writeFileSync('src/app/admin/templates/page.tsx', code);
  console.log('Modified page.tsx');
} else {
  console.log('Not found');
}

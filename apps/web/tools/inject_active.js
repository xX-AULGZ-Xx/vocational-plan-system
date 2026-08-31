const fs = require('fs');

const filePath = 'src/app/admin/templates/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const target = `                              <span className="text-sm text-gray-700">จำเป็นต้องกรอก (Required)</span>
                            </label>`;

const replacement = `                              <span className="text-sm text-gray-700">จำเป็นต้องกรอก (Required)</span>
                            </label>
                            
                            <label className="flex items-center gap-2 cursor-pointer mt-2">
                              <input
                                type="checkbox"
                                checked={!(tag.options && typeof tag.options === 'object' && !Array.isArray(tag.options) && tag.options.is_hidden)}
                                onChange={(e) => {
                                  const newTags = [...tags];
                                  const currentOptions = Array.isArray(tag.options) ? {} : (tag.options || {});
                                  newTags[index].options = { ...currentOptions, is_hidden: !e.target.checked };
                                  setTags(newTags);
                                }}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                              <span className="text-sm text-gray-700">เปิดใช้งาน (Active)</span>
                            </label>`;

code = code.replace(target, replacement);

fs.writeFileSync(filePath, code);
console.log('Injected Active toggle');

const fs = require('fs');
const filePath = 'src/app/admin/templates/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const isRequiredBlock = `<label className="flex items-center text-xs font-medium text-gray-700">
                              <input
                                type="checkbox"
                                checked={tag.is_required}
                                onChange={(e) => {
                                  const newTags = [...tags];
                                  newTags[index].is_required = e.target.checked;
                                  setTags(newTags);
                                }}
                                className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                              จำเป็นต้องกรอก
                            </label>`;

const isHiddenBlock = `                            <label className="flex items-center text-xs font-medium text-gray-700 ml-4">
                              <input
                                type="checkbox"
                                checked={!(tag.options && typeof tag.options === 'object' && !Array.isArray(tag.options) && tag.options.is_hidden)}
                                onChange={(e) => {
                                  const newTags = [...tags];
                                  const currentOptions = Array.isArray(tag.options) ? {} : (tag.options || {});
                                  newTags[index].options = { ...currentOptions, is_hidden: !e.target.checked };
                                  setTags(newTags);
                                }}
                                className="mr-2 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                              />
                              เปิดใช้งาน (Active)
                            </label>`;

code = code.replace(isRequiredBlock, isRequiredBlock + '\n' + isHiddenBlock);
fs.writeFileSync(filePath, code);
console.log('Added is_hidden toggle');

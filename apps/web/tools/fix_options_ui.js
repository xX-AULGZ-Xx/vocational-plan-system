const fs = require('fs');
let code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');

const regex = /<\/label>\s*<\/div>\s*<\/div>\s*\{\/\* OPTIONS UI \*\/\}\s*\{tag\.tag_type === 'DROPDOWN' && \([\s\S]*?\}\)\}\s*<\/div>\s*\}\)\}\s*<\/div>/;

// I will just do a string replacement.
// Let's replace the whole OPTIONS UI block and put it in the right place!

const oldPart = `                            </label>
                          </div>
                        </div>
                        {/* OPTIONS UI */}
                        {tag.tag_type === 'DROPDOWN' && (
                          <div className="mt-3 w-full bg-gray-50 p-3 rounded-md border border-gray-200 col-span-1 md:col-span-2 lg:col-span-4">
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-xs font-medium text-gray-700">รายการตัวเลือก</label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newTags = [...tags];
                                  const opts = Array.isArray(newTags[index].options) ? [...newTags[index].options] : [];
                                  opts.push('ตัวเลือกใหม่');
                                  newTags[index].options = opts;
                                  setTags(newTags);
                                }}
                                className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 flex items-center"
                              >
                                + เพิ่มตัวเลือก
                              </button>
                            </div>
                            <div className="space-y-2">
                              {(Array.isArray(tag.options) ? tag.options : []).map((opt, optIndex) => (
                                <div key={optIndex} className="flex gap-2">
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => {
                                      const newTags = [...tags];
                                      const opts = [...newTags[index].options];
                                      opts[optIndex] = e.target.value;
                                      newTags[index].options = opts;
                                      setTags(newTags);
                                    }}
                                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newTags = [...tags];
                                      const opts = [...newTags[index].options];
                                      opts.splice(optIndex, 1);
                                      newTags[index].options = opts;
                                      setTags(newTags);
                                    }}
                                    className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-md"
                                  >
                                    ลบ
                                  </button>
                                </div>
                              ))}
                              {(!Array.isArray(tag.options) || tag.options.length === 0) && (
                                <div className="text-xs text-gray-500 italic py-1 text-center">ยังไม่มีตัวเลือก กด + เพิ่มตัวเลือก</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>`;

const newPart = `                            </label>
                          </div>
                          {/* OPTIONS UI */}
                          {tag.tag_type === 'DROPDOWN' && (
                            <div className="mt-3 w-full bg-gray-50 p-3 rounded-md border border-gray-200 col-span-1 md:col-span-2 lg:col-span-4">
                              <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-medium text-gray-700">รายการตัวเลือก</label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newTags = [...tags];
                                    const opts = Array.isArray(newTags[index].options) ? [...newTags[index].options] : [];
                                    opts.push('ตัวเลือกใหม่');
                                    newTags[index].options = opts;
                                    setTags(newTags);
                                  }}
                                  className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 flex items-center"
                                >
                                  + เพิ่มตัวเลือก
                                </button>
                              </div>
                              <div className="space-y-2">
                                {(Array.isArray(tag.options) ? tag.options : []).map((opt, optIndex) => (
                                  <div key={optIndex} className="flex gap-2">
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => {
                                        const newTags = [...tags];
                                        const opts = [...newTags[index].options];
                                        opts[optIndex] = e.target.value;
                                        newTags[index].options = opts;
                                        setTags(newTags);
                                      }}
                                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newTags = [...tags];
                                        const opts = [...newTags[index].options];
                                        opts.splice(optIndex, 1);
                                        newTags[index].options = opts;
                                        setTags(newTags);
                                      }}
                                      className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-md"
                                    >
                                      ลบ
                                    </button>
                                  </div>
                                ))}
                                {(!Array.isArray(tag.options) || tag.options.length === 0) && (
                                  <div className="text-xs text-gray-500 italic py-1 text-center">ยังไม่มีตัวเลือก กด + เพิ่มตัวเลือก</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>`;

if (code.includes(oldPart)) {
  code = code.replace(oldPart, newPart);
  fs.writeFileSync('src/app/admin/templates/page.tsx', code);
  console.log('Replaced correctly!');
} else {
  console.log('oldPart not found!');
}

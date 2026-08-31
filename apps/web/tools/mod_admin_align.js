const fs = require('fs');
let code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');

const target = `                            </div>
                          )}
                        </div>`;
                        
const replace = `                            </div>
                          )}
                        {/* ALIGNMENT CHECKLIST UI */}
                        {tag.tag_type === 'ALIGNMENT_CHECKLIST' && (
                          <div className="mt-3 w-full bg-gray-50 p-3 rounded-md border border-gray-200 col-span-1 md:col-span-2 lg:col-span-4">
                            <div className="flex justify-between items-center mb-2">
                              <label className="block text-xs font-medium text-gray-700">รายการหัวข้อประเมิน (Checklist)</label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newTags = [...tags];
                                  const opts = Array.isArray(newTags[index].options) ? [...newTags[index].options] : [];
                                  opts.push({ key: 'chk_' + Date.now(), label: 'หัวข้อใหม่', indent: 0 });
                                  newTags[index].options = opts;
                                  setTags(newTags);
                                }}
                                className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 flex items-center"
                              >
                                + เพิ่มหัวข้อ
                              </button>
                            </div>
                            <div className="space-y-2">
                              {(Array.isArray(tag.options) ? tag.options : []).map((opt, optIndex) => {
                                const item = typeof opt === 'string' ? { key: 'chk_' + optIndex, label: opt, indent: 0 } : opt;
                                return (
                                  <div key={optIndex} className="flex gap-2 items-center">
                                    <select
                                      value={item.indent || 0}
                                      onChange={(e) => {
                                        const newTags = [...tags];
                                        const opts = [...newTags[index].options];
                                        opts[optIndex] = { ...item, indent: parseInt(e.target.value) };
                                        newTags[index].options = opts;
                                        setTags(newTags);
                                      }}
                                      className="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-xs"
                                    >
                                      <option value={0}>หลัก</option>
                                      <option value={1}>ย่อย 1</option>
                                      <option value={2}>ย่อย 2</option>
                                    </select>
                                    <input
                                      type="text"
                                      placeholder="ตัวแปร (เช่น q_1)"
                                      value={item.key || ''}
                                      onChange={(e) => {
                                        const newTags = [...tags];
                                        const opts = [...newTags[index].options];
                                        opts[optIndex] = { ...item, key: e.target.value };
                                        newTags[index].options = opts;
                                        setTags(newTags);
                                      }}
                                      className="w-28 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-xs font-mono text-indigo-600"
                                      title="ตัวแปรสำหรับเรียกใช้ใน Word"
                                    />
                                    <input
                                      type="text"
                                      placeholder="ข้อความที่แสดง"
                                      value={item.label || ''}
                                      onChange={(e) => {
                                        const newTags = [...tags];
                                        const opts = [...newTags[index].options];
                                        opts[optIndex] = { ...item, label: e.target.value };
                                        newTags[index].options = opts;
                                        setTags(newTags);
                                      }}
                                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-xs"
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
                                );
                              })}
                              {(!Array.isArray(tag.options) || tag.options.length === 0) && (
                                <div className="text-xs text-gray-500 italic py-1 text-center">ยังไม่มีหัวข้อ กด + เพิ่มหัวข้อ</div>
                              )}
                            </div>
                          </div>
                        )}
                        </div>`;

code = code.replace(target, replace);
fs.writeFileSync('src/app/admin/templates/page.tsx', code);
console.log('Modified admin page');

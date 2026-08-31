const fs = require('fs');

function modAdminPage() {
  const path = 'src/app/admin/templates/page.tsx';
  let code = fs.readFileSync(path, 'utf8');

  const insertAfter = `                            </div>
                          </div>
                        )}
                        {/* OPTIONS UI */}`;
                        
  const replacement = `                            </div>
                          </div>
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
                                  opts.push({ key: \`chk_\${Date.now()}\`, label: 'หัวข้อใหม่', indent: 0 });
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
                                const item = typeof opt === 'string' ? { key: \`chk_\${optIndex}\`, label: opt, indent: 0 } : opt;
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
                        {/* OPTIONS UI */}`;
  
  if (code.includes(insertAfter)) {
    code = code.replace(insertAfter, replacement);
    fs.writeFileSync(path, code);
    console.log('Modified admin page');
  } else {
    console.log('Could not find insertion point in admin page');
  }
}

function modProjectsPage(path) {
  let code = fs.readFileSync(path, 'utf8');

  // I need to replace the entire case 'ALIGNMENT_CHECKLIST': { ... } block
  // Since string matching for the huge block is risky, I will use regex or find indices
  
  const startIdx = code.indexOf(`case 'ALIGNMENT_CHECKLIST': {`);
  const endIdx = code.indexOf(`case 'TIMELINE':`);
  
  if (startIdx !== -1 && endIdx !== -1) {
    const newBlock = `case 'ALIGNMENT_CHECKLIST': {
        const valObj = typeof value === 'object' && value !== null ? value : {};
        const toggleCheck = (k) => {
          handleDynamicChange(key, { ...valObj, [k]: !valObj[k] });
        };
        const optionsList = Array.isArray(tag.options) ? tag.options : [];
        const CheckItem = ({ k, label, indent }) => {
          let marginClass = "";
          if (indent === 1) marginClass = "ml-6";
          if (indent === 2) marginClass = "ml-12";
          return (
            <div className={\`flex items-start space-x-2 \${marginClass}\`}>
              <input type="checkbox" checked={valObj[k] || false} onChange={() => toggleCheck(k)} disabled={typeof isEditing !== 'undefined' ? !isEditing : false} className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:bg-gray-100" />
              <label className="text-sm text-gray-700 leading-snug cursor-pointer" onClick={() => { if(typeof isEditing === 'undefined' || isEditing) toggleCheck(k) }}>{label}</label>
            </div>
          );
        };

        return (
          <div key={key} className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-900 mb-3">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
            <div className="space-y-2">
              {optionsList.length > 0 ? optionsList.map((opt, idx) => {
                const item = typeof opt === 'string' ? { key: \`chk_\${idx}\`, label: opt, indent: 0 } : opt;
                return <CheckItem key={idx} k={item.key} label={item.label} indent={item.indent} />;
              }) : (
                <div className="text-sm text-gray-500 italic">ไม่มีหัวข้อประเมิน (กรุณาเพิ่มในหน้าจัดการแม่แบบ)</div>
              )}
            </div>
            <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100">
              <strong>💡 วิธีใช้ในเอกสาร Word:</strong> ครอบส่วนที่เป็นกลุ่มนี้ด้วย <code>&#123;#{tag.tag_name}&#125;</code>...<code>&#123;/{tag.tag_name}&#125;</code> จากนั้นใช้ตัวแปร เช่น <code>&#123;q_voc_chk&#125;</code> (นำชื่อตัวแปรที่ตั้งไว้มาต่อท้ายด้วย _chk) เพื่อแสดงเครื่องหมาย ☑ หรือ ☐ อัตโนมัติ
            </div>
          </div>
        );
      }
      `;
      
    code = code.substring(0, startIdx) + newBlock + code.substring(endIdx);
    fs.writeFileSync(path, code);
    console.log('Modified', path);
  } else {
    console.log('Could not find ALIGNMENT block in', path);
  }
}

modAdminPage();
modProjectsPage('src/app/projects/new/page.tsx');
modProjectsPage('src/app/projects/[id]/summary/page.tsx');


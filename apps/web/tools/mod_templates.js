const fs = require('fs');
let code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');

// The replacement text has some unicode issues, so I will match by a smaller part.
code = code.replace(
  '<option value="CALCULATION">',
  '<option value="DROPDOWN">ตัวเลือก (Dropdown)</option>\n                                <option value="CALCULATION">'
);

// We need to inject the options input if it's DROPDOWN.
// Locate the end of the grid: `</div>\n                        </div>\n                      ))`
const oldPart = `                          </div>
                        </div>
                      ))}
                    </div>`;

const newPart = `                          </div>
                          {tag.tag_type === 'DROPDOWN' && (
                            <div className="mt-3 w-full bg-gray-50 p-3 rounded-md border border-gray-200">
                              <label className="block text-xs font-medium text-gray-700 mb-1">ระบุตัวเลือก (คั่นด้วยเครื่องหมายจุลภาค ,)</label>
                              <input 
                                type="text" 
                                value={Array.isArray(tag.options) ? tag.options.join(", ") : ""} 
                                onChange={(e) => { 
                                  const newTags = [...tags]; 
                                  newTags[index].options = e.target.value.split(",").map(s => s.trim()).filter(Boolean); 
                                  setTags(newTags); 
                                }} 
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" 
                                placeholder="เช่น ตัวเลือกที่ 1, ตัวเลือกที่ 2, ตัวเลือกที่ 3" 
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>`;

code = code.replace(oldPart, newPart);

fs.writeFileSync('src/app/admin/templates/page.tsx', code);

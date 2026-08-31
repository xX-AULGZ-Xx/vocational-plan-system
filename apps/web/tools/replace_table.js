const fs = require('fs');

const replacement = `
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อแม่แบบ / ไฟล์</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ประเภทแม่แบบ (Default)</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p>ยังไม่มีข้อมูลแม่แบบเอกสาร</p>
                    </td>
                  </tr>
                ) : (
                  templates.map((tpl) => (
                    <tr key={tpl.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-start">
                          <FileText className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{tpl.name}</div>
                            <div className="text-xs text-gray-500">{tpl.file_name} (v{tpl.version})</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={tpl.default_type || 'NONE'}
                          onChange={(e) => handleSetDefaultType(tpl.id, e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                          <option value="NONE">- ไม่ได้ตั้งค่า -</option>
                          <option value="PROPOSAL">แบบเสนอโครงการ (Proposal)</option>
                          <option value="FULL_SUMMARY">สรุปแบบเต็ม (Full Summary)</option>
                          <option value="SHORT_SUMMARY">สรุปหน้าเดียว (Short Summary)</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(tpl.id, tpl.is_active)}
                          className={\`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 \${tpl.is_active ? 'bg-blue-600' : 'bg-gray-200'}\`}
                        >
                          <span className={\`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out \${tpl.is_active ? 'translate-x-5' : 'translate-x-0'}\`} />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => openTagManager(tpl)}
                          className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md transition-colors"
                        >
                          <Tag className="w-4 h-4 mr-1.5" />
                          Tag Manager
                        </button>
                          <button
                            onClick={() => handleUpdateFileClick(tpl.id)}
                            className="inline-flex items-center p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors mr-1"
                            title="อัปเดตไฟล์ (Upload new version)"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tpl.id)}
                            className="inline-flex items-center p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden">
            {templates.length === 0 ? (
              <div className="p-8 text-center text-gray-500 border-t border-gray-100">
                <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-sm">ยังไม่มีข้อมูลแม่แบบเอกสาร</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start flex-1 pr-3">
                        <FileText className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-semibold text-gray-900 leading-tight">{tpl.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{tpl.file_name} (v{tpl.version})</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleActive(tpl.id, tpl.is_active)}
                        className={\`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 \${tpl.is_active ? 'bg-blue-600' : 'bg-gray-200'}\`}
                      >
                        <span className={\`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out \${tpl.is_active ? 'translate-x-5' : 'translate-x-0'}\`} />
                      </button>
                    </div>

                    <div className="mb-3">
                      <label className="block text-xs text-gray-500 mb-1">ประเภทแม่แบบ (Default):</label>
                      <select
                        value={tpl.default_type || 'NONE'}
                        onChange={(e) => handleSetDefaultType(tpl.id, e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-sm py-1.5"
                      >
                        <option value="NONE">- ไม่ได้ตั้งค่า -</option>
                        <option value="PROPOSAL">แบบเสนอโครงการ (Proposal)</option>
                        <option value="FULL_SUMMARY">สรุปแบบเต็ม (Full Summary)</option>
                        <option value="SHORT_SUMMARY">สรุปหน้าเดียว (Short Summary)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => openTagManager(tpl)}
                        className="inline-flex items-center px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-md transition-colors text-xs font-medium"
                      >
                        <Tag className="w-3.5 h-3.5 mr-1.5" />
                        Tag Manager
                      </button>
                      
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleUpdateFileClick(tpl.id)}
                          className="inline-flex items-center p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="อัปเดตไฟล์"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tpl.id)}
                          className="inline-flex items-center p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
`;

let code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');

// The replacement logic:
const lines = code.split('\\n');
let start = -1;
let end = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<div className="overflow-x-auto">')) {
    if (start === -1) start = i; // only take the first
  }
  if (start !== -1 && lines[i].includes('</table>')) end = i + 2; // include </table> and </div>
}

if (start !== -1 && end !== -1) {
  const before = lines.slice(0, start).join('\\n');
  const after = lines.slice(end).join('\\n');
  fs.writeFileSync('src/app/admin/templates/page.tsx', before + '\\n' + replacement + '\\n' + after);
  console.log('Replaced table with responsive version.');
} else {
  console.log('Could not find table boundaries.', start, end);
}

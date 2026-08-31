const fs = require('fs');

const innerContent = fs.readFileSync('temp_inner.txt', 'utf8');

const newBottom = `
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col relative">
            <div className="p-4 bg-blue-900 text-white flex justify-between items-center shrink-0">
              <h2 className="text-lg font-bold">อัปโหลดแม่แบบใหม่</h2>
              <button onClick={() => setShowUploadModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อแม่แบบ</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">รายละเอียด (ถ้ามี)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทเอกสาร (Default Type)</label>
                <select value={defaultType} onChange={e => setDefaultType(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="NONE">ไม่ระบุ (None)</option>
                  <option value="PROPOSAL">แบบเสนอโครงการ (Proposal)</option>
                  <option value="FULL_SUMMARY">สรุปแบบเต็ม (Full Summary)</option>
                  <option value="SHORT_SUMMARY">สรุปหน้าเดียว (Short Summary)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ไฟล์แม่แบบ (.docx)</label>
                <input type="file" accept=".docx" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full" />
              </div>
              {msg && (
                <p className={\`text-sm \${msg.type === 'error' ? 'text-red-500' : 'text-green-600'}\`}>{msg.text}</p>
              )}
            </div>
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">ยกเลิก</button>
              <button onClick={handleUpload} disabled={uploading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {uploading ? 'กำลังอัปโหลด...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tag Manager Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden relative">
            <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-700" onClick={() => setSelectedTemplate(null)}><X className="w-6 h-6" /></button>
` + innerContent + `
          </div>
        </div>
      )}
    </div>
  );
}
`;

let code = fs.readFileSync('src/app/admin/templates/page.tsx', 'utf8');
const lines = code.split('\\n');
const tableEnd = lines.findIndex(l => l.includes('</tbody>')) + 4; // this is '      )}' of the loading ternary

// Splice everything after tableEnd
code = lines.slice(0, tableEnd).join('\\n') + '\\n' + newBottom;
fs.writeFileSync('src/app/admin/templates/page.tsx', code);
console.log('Restored both modals successfully! tableEnd was at line ' + tableEnd);

const fs = require('fs');

function modFile(path) {
  let code = fs.readFileSync(path, 'utf8');
  
  // templates page
  if (path.includes('admin/templates/page.tsx')) {
    code = code.replace(
      '<option value="DATERANGE">ช่วงวันที่ (Start-End Date)</option>',
      '<option value="DATERANGE">ช่วงวันที่ (Start-End Date)</option>\n                                <option value="TIMELINE">ตารางแผนปฏิบัติงาน (Timeline PDCA)</option>'
    );
  }
  
  // projects page
  if (path.includes('projects/new/page.tsx') || path.includes('summary/page.tsx')) {
    const replaceStr = `      case 'DATERANGE':`;
    const newStr = `      case 'TIMELINE': {
        const defaultSteps = [
          "1. เสนอโครงการ (PLAN)",
          "2. ดำเนินการตามโครงการ (DO)",
          "3. การประเมินผลการดำเนินงานโครงการ/การติดตามผล/สรุปผล (CHECK)",
          "4. รายงานผล (Act)"
        ];
        const months = ["ต.ค.", "พ.ย.", "ธ.ค.", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย."];
        const timelineData = Array.isArray(value) && value.length > 0 ? value : defaultSteps.map(s => ({ step_name: s, m1: "", m2: "", m3: "", m4: "", m5: "", m6: "", m7: "", m8: "", m9: "", m10: "", m11: "", m12: "" }));

        return (
          <div key={key} className="col-span-1 md:col-span-2 overflow-hidden">
            <label className="block text-sm font-medium text-gray-700 mb-2">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 border-r w-1/3">ขั้นตอนการดำเนินงาน</th>
                    {months.map((m, i) => (
                      <th key={i} className="px-1 py-2 text-center font-medium text-gray-500 border-r min-w-[30px]">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {timelineData.map((row, rIndex) => (
                    <tr key={rIndex}>
                      <td className="px-3 py-2 border-r whitespace-normal">{row.step_name}</td>
                      {Array.from({ length: 12 }).map((_, cIndex) => {
                        const mKey = 'm' + (cIndex + 1);
                        return (
                          <td key={cIndex} className="px-1 py-2 border-r text-center">
                            <input
                              type="checkbox"
                              checked={row[mKey] === "/"}
                              onChange={(e) => {
                                const newData = [...timelineData];
                                newData[rIndex] = { ...newData[rIndex], [mKey]: e.target.checked ? "/" : "" };
                                handleDynamicChange(key, newData);
                              }}
                              disabled={typeof isEditing !== 'undefined' ? !isEditing : false}
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:bg-gray-100"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-gray-400">คำแนะนำการใช้ตัวแปร: ให้ครอบตารางด้วย &#123;#{tag.tag_name}&#125; ... &#123;/{tag.tag_name}&#125; และใช้ตัวแปร &#123;step_name&#125; และ &#123;m1&#125; ถึง &#123;m12&#125; ในช่องต่างๆ</p>
          </div>
        );
      }
      case 'DATERANGE':`;
      
      if (!code.includes("case 'TIMELINE':")) {
        code = code.replace(replaceStr, newStr);
      }
  }
  
  fs.writeFileSync(path, code);
}

modFile('../web/src/app/admin/templates/page.tsx');
modFile('../web/src/app/projects/new/page.tsx');
modFile('../web/src/app/projects/[id]/summary/page.tsx');

console.log('Modified all files for TIMELINE');

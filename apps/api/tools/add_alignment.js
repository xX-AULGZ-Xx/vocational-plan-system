const fs = require('fs');

function modFile(path) {
  let code = fs.readFileSync(path, 'utf8');
  
  // templates page
  if (path.includes('admin/templates/page.tsx')) {
    code = code.replace(
      '<option value="TIMELINE">ตารางแผนปฏิบัติงาน (Timeline PDCA)</option>',
      '<option value="TIMELINE">ตารางแผนปฏิบัติงาน (Timeline PDCA)</option>\n                                <option value="ALIGNMENT_CHECKLIST">แบบประเมินความสอดคล้อง (Alignment Checklist)</option>'
    );
  }
  
  // projects page
  if (path.includes('projects/new/page.tsx') || path.includes('summary/page.tsx')) {
    const replaceStr = `      case 'TIMELINE':`;
    const newStr = `      case 'ALIGNMENT_CHECKLIST': {
        const valObj = typeof value === 'object' && value !== null ? value : {};
        const toggleCheck = (k) => {
          handleDynamicChange(key, { ...valObj, [k]: !valObj[k] });
        };
        const CheckItem = ({ k, label, indent }) => (
          <div className={\`flex items-start space-x-2 \${indent}\`}>
            <input type="checkbox" checked={valObj[k] || false} onChange={() => toggleCheck(k)} disabled={typeof isEditing !== 'undefined' ? !isEditing : false} className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:bg-gray-100" />
            <label className="text-sm text-gray-700 leading-snug cursor-pointer" onClick={() => { if(typeof isEditing === 'undefined' || isEditing) toggleCheck(k) }}>{label}</label>
          </div>
        );

        return (
          <div key={key} className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-900 mb-3">{label} {tag.is_required && <span className="text-red-500">*</span>}</label>
            <div className="space-y-2">
              <CheckItem k="q_voc" label="ความสอดคล้องกับมาตรฐานการอาชีวศึกษา (งานประกันคุณภาพการศึกษา)" indent="" />
              <CheckItem k="q_std1" label="มาตรฐานที่ 1 คุณลักษณะของผู้สำเร็จการศึกษาอาชีวศึกษาที่พึงประสงค์" indent="ml-6" />
              <CheckItem k="q_std1_1" label="ประเด็นการประเมิน ๑.๑ ด้านความรู้" indent="ml-12" />
              <CheckItem k="q_std1_2" label="ประเด็นการประเมิน ๑.๒ ด้านทักษะและการประยุกต์ใช้" indent="ml-12" />
              <CheckItem k="q_std1_3" label="ประเด็นการประเมิน ๑.๓ ด้านคุณธรรม จริยธรรม และคุณลักษณะที่พึงประสงค์" indent="ml-12" />
              <CheckItem k="q_std2" label="มาตรฐานที่ 2 การจัดการอาชีวศึกษา" indent="ml-6" />
              <CheckItem k="q_std2_1" label="ประเด็นการประเมิน ๒.๑ ด้านหลักสูตรอาชีวศึกษา" indent="ml-12" />
              <CheckItem k="q_std2_2" label="ประเด็นการประเมิน ๒.๒ ด้านการจัดการเรียนการสอนอาชีวศึกษา" indent="ml-12" />
              <CheckItem k="q_std2_3" label="ประเด็นการประเมิน ๒.๓ ด้านการบริหารจัดการ" indent="ml-12" />
              <CheckItem k="q_std2_4" label="ประเด็นการประเมิน ๒.๔ ด้านการนำนโยบายสู่การปฏิบัติ" indent="ml-12" />
              <CheckItem k="q_std3" label="มาตรฐานที่ 3 การสร้างสังคมแห่งการเรียนรู้" indent="ml-6" />
              <CheckItem k="q_std3_1" label="ประเด็นการประเมิน ๓.๑ ด้านความร่วมมือในการสร้างสังคมแห่งการเรียนรู้" indent="ml-12" />
              <CheckItem k="q_std3_2" label="ประเด็นการประเมิน ๓.๒ ด้านนวัตกรรม สิ่งประดิษฐ์ งานสร้างสรรค์ งานวิจัย" indent="ml-12" />
              
              <CheckItem k="q_emvs" label="ความสอดคล้องกับระบบติดตามและประเมินผล E-MVS" indent="mt-4" />
              <CheckItem k="q_ita" label="ความสอดคล้องกับแนวทางการประเมิน ITA" indent="" />
              <CheckItem k="q_ovec" label="ความสอดคล้องกับระบบติดตามและประเมินผล OVEC-SmartPlan" indent="" />
              <CheckItem k="q_plan" label="ความสอดคล้องกับแผนพัฒนาการจัดการศึกษาของสถานศึกษา" indent="" />
            </div>
            <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100">
              <strong>💡 วิธีใช้ในเอกสาร Word:</strong> ครอบส่วนที่เป็นกลุ่มนี้ด้วย <code>&#123;#{tag.tag_name}&#125;</code>...<code>&#123;/{tag.tag_name}&#125;</code> จากนั้นใช้ตัวแปร <code>&#123;ชื่อคีย์_chk&#125;</code> เพื่อแสดงเครื่องหมาย ☑ หรือ ☐ อัตโนมัติ (เช่น <code>&#123;q_voc_chk&#125;</code>, <code>&#123;q_std1_chk&#125;</code> เป็นต้น)
            </div>
          </div>
        );
      }
      case 'TIMELINE':`;
      
      if (!code.includes("case 'ALIGNMENT_CHECKLIST':")) {
        code = code.replace(replaceStr, newStr);
      }
  }
  
  fs.writeFileSync(path, code);
}

modFile('../web/src/app/admin/templates/page.tsx');
modFile('../web/src/app/projects/new/page.tsx');
modFile('../web/src/app/projects/[id]/summary/page.tsx');

console.log('Modified all files for ALIGNMENT_CHECKLIST');

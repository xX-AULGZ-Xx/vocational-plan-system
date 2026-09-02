import fs from 'fs';
import PizZip from 'pizzip';

export interface ExtractedTag {
  key: string;
  tag: string;
  detectedLabel: string;
  type: 'variable' | 'loop' | 'image' | 'raw';
  is_custom: boolean;
  suggested_type?: 'TEXT' | 'LONGTEXT' | 'DATE' | 'BOOLEAN' | 'TABLE_LOOP' | 'IMAGE' | 'CALCULATION';
}

const defaultKnownLabels: Record<string, string> = {
  title: 'ชื่อโครงการ',
  project_name: 'ชื่อโครงการ',
  project_code: 'รหัสโครงการ',
  fiscal_year: 'งบประมาณประจำปี พ.ศ.',
  division_name: 'ชื่อฝ่าย / หน่วยงานต้นสังกัด',
  sub_division: 'ชื่อแผนก / หน่วยงานย่อย',
  department_name: 'ชื่อสาขาวิชา / หมวดวิชา / งาน',
  leader_name: 'ผู้รับผิดชอบโครงการ (หัวหน้า)',
  responsible_person: 'ผู้รับผิดชอบโครงการ',
  leader_position: 'ตำแหน่งของผู้รับผิดชอบ',
  responsible_position: 'ตำแหน่งของผู้รับผิดชอบ',
  project_nature: 'ลักษณะโครงการ',
  is_act_budget: 'โครงการ ตาม พ.ร.บ. งบประมาณ',
  is_routine_job: 'โครงการ งานประจำ/งานพื้นฐาน',
  is_ovec_policy: 'โครงการ นโยบาย สอศ.',
  is_special_no_budget: 'โครงการพิเศษ ไม่ใช้งบประมาณ',
  national_strategy: 'ความสอดคล้องกับยุทธศาสตร์ชาติ',
  nesdc_plan13: 'ความสอดคล้องกับแผนพัฒนาเศรษฐกิจและสังคมแห่งชาติ',
  moe_policy: 'ความสอดคล้องกับนโยบายกระทรวงศึกษาธิการ',
  ovec_policy_agenda: 'ความสอดคล้องกับนโยบาย สอศ.',
  college_mission: 'ความสอดคล้องกับพันธกิจของสถานศึกษา',
  qa_standard: 'ความสอดคล้องกับมาตรฐานการอาชีวศึกษา',
  background: 'หลักการและเหตุผล',
  rationale: 'หลักการและเหตุผล',
  objectives: 'วัตถุประสงค์',
  target_quantitative: 'เป้าหมายเชิงปริมาณ',
  target_qualitative: 'เป้าหมายเชิงคุณภาพ',
  timelines: 'กิจกรรมและขั้นตอนดำเนินการ',
  start_date: 'วันที่เริ่มต้น',
  end_date: 'วันที่สิ้นสุด',
  project_period: 'ระยะเวลาดำเนินการ',
  location: 'สถานที่ดำเนินการ',
  location_full: 'สถานที่ดำเนินการ',
  project_location: 'สถานที่ดำเนินการ',
  budget_items: 'รายการงบประมาณ',
  budget_gov: 'งบประมาณ (เงินอุดหนุน)',
  budget_revenue: 'งบประมาณ (เงินรายได้สถานศึกษา)',
  budget_subsidy: 'งบประมาณ (เงินบริจาค/อื่นๆ)',
  total_budget: 'รวมงบประมาณทั้งสิ้น',
  total_budget_text: 'รวมงบประมาณทั้งสิ้น (ตัวเลข)',
  total_budget_bahttext: 'รวมงบประมาณทั้งสิ้น (ตัวอักษร)',
  expected_results: 'ผลที่คาดว่าจะได้รับ',
  monitoring_evaluation: 'การติดตามและประเมินผล',
  item: 'รายการ/รายละเอียด',
  activity_name: 'ชื่อกิจกรรม',
  no: 'ลำดับที่',
  description: 'รายละเอียดการใช้งบประมาณ',
  quantity: 'จำนวน',
  unit: 'หน่วย',
  unit_price: 'ราคาต่อหน่วย',
  total_amount: 'จำนวนเงิน',
  proposer_name: 'ผู้เสนอโครงการ',
  proposer_position: 'ตำแหน่งผู้เสนอโครงการ',
  endorser_name: 'ผู้เห็นชอบโครงการ',
  endorser_position: 'ตำแหน่งผู้เห็นชอบโครงการ',
  planning_head_name: 'หัวหน้างานแผนงานและงบประมาณ',
  planning_head_position: 'ตำแหน่งหัวหน้างานแผนงาน',
  deputy_strat_name: 'รองผู้อำนวยการฝ่ายแผนงานฯ',
  deputy_strat_position: 'ตำแหน่งรองผู้อำนวยการฝ่ายแผนงานฯ',
  director_name: 'ผู้อำนวยการสถานศึกษา',
  director_position: 'ตำแหน่งผู้อำนวยการสถานศึกษา',
  approvals: 'ส่วนของการอนุมัติ/ลงนาม',
};

export function extractTagsFromDocx(filePath: string): ExtractedTag[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, 'binary');
    const zip = new PizZip(content);

    const xmlFiles = [
      'word/document.xml',
      'word/header1.xml',
      'word/header2.xml',
      'word/header3.xml',
      'word/footer1.xml',
      'word/footer2.xml',
      'word/footer3.xml',
    ];

    let combinedText = '';
    for (const xmlFile of xmlFiles) {
      const file = zip.files[xmlFile];
      if (file) {
        const xmlStr = file.asText();
        const plainText = xmlStr.replace(/<[^>]+>/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '');
        combinedText += '\n' + plainText;
      }
    }

    const tagRegex = /\{([^{}]+)\}/g;
    const rawTags: string[] = [];
    let match;
    while ((match = tagRegex.exec(combinedText)) !== null) {
      rawTags.push(match[1].trim());
    }

    const isLoopTable: Record<string, boolean> = {};
    for (let i = 0; i < rawTags.length; i++) {
      const tag = rawTags[i];
      if (tag.startsWith("#")) {
        const name = tag.substring(1).trim();
        let hasSubTags = false;
        let depth = 1;
        for (let j = i + 1; j < rawTags.length; j++) {
          const nextTag = rawTags[j];
          if (nextTag === `#${name}`) {
            depth++;
          } else if (nextTag === `/${name}`) {
            depth--;
            if (depth === 0) break;
          } else if (!nextTag.startsWith("#") && !nextTag.startsWith("/") && !nextTag.startsWith("^") && !nextTag.startsWith("?")) {
            hasSubTags = true;
          }
        }
        isLoopTable[name] = hasSubTags;
      }
    }

    const foundTagsMap = new Map<string, ExtractedTag>();
    const activeLoops: string[] = [];

    for (let i = 0; i < rawTags.length; i++) {
      const tag = rawTags[i];
      if (!tag) continue;

      let key = tag;
      let type: ExtractedTag['type'] = 'variable';
      let suggested_type: ExtractedTag['suggested_type'] = 'TEXT';

      if (tag.startsWith("#")) {
        const name = tag.substring(1).trim();
        key = tag;
        if (isLoopTable[name]) {
          activeLoops.push(name);
          type = 'loop';
          suggested_type = 'TABLE_LOOP';
        } else {
          type = 'loop';
          suggested_type = 'BOOLEAN';
        }
      } else if (tag.startsWith("/")) {
        const name = tag.substring(1).trim();
        if (isLoopTable[name]) {
          const index = activeLoops.indexOf(name);
          if (index > -1) {
            activeLoops.splice(index, 1);
          }
        }
        continue;
      } else if (tag.startsWith("^") || tag.startsWith("?")) {
        key = tag;
        type = 'loop';
        suggested_type = 'BOOLEAN';
      } else if (tag.startsWith("%")) {
        key = tag;
        type = 'image';
        suggested_type = 'IMAGE';
      } else if (tag.startsWith("@")) {
        key = tag;
        type = 'raw';
        suggested_type = 'LONGTEXT';
      } else if (tag.startsWith(">") || tag.startsWith("!")) {
        continue;
      } else {
        key = tag;
        type = 'variable';
        if (key.startsWith('is_')) {
          suggested_type = 'BOOLEAN';
        } else if (key.endsWith('date') || key.endsWith('time')) {
          suggested_type = 'DATE';
        } else if (key.includes('total') || key.includes('sum') || key.includes('amount')) {
          suggested_type = 'CALCULATION';
        } else if (key.includes('description') || key.includes('rationale') || key.includes('background') || key.includes('objectives') || key.includes('timelines') || key.includes('results')) {
          suggested_type = 'LONGTEXT';
        } else {
          suggested_type = 'TEXT';
        }
      }

      const rawKeyClean = key.replace(/^[#^/%@?!]/, '');
      const isCustom = !defaultKnownLabels[rawKeyClean];
      const detectedLabel = defaultKnownLabels[rawKeyClean] || rawKeyClean;
      
      if (!foundTagsMap.has(key)) {
        foundTagsMap.set(key, {
          key: key,
          tag: `{${tag}}`,
          detectedLabel,
          type,
          is_custom: isCustom,
          suggested_type
        });
      }
    }

    return Array.from(foundTagsMap.values());
  } catch (err) {
    console.warn('Tag extraction notice:', err);
    return [];
  }
}

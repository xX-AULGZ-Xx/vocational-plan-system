import fs from 'fs';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import mammoth from 'mammoth';
import { prisma } from './prisma';

export function formatThaiBaht(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'ศูนย์บาทถ้วน';

  const digits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  const numStr = amount.toFixed(2);
  const [bahtStr, satangStr] = numStr.split('.');

  function convertGroup(nStr: string): string {
    let result = '';
    const len = nStr.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(nStr.charAt(i), 10);
      const pos = len - i - 1;

      if (digit !== 0) {
        if (pos === 0 && digit === 1 && len > 1 && nStr.charAt(len - 2) !== '0') {
          result += 'เอ็ด';
        } else if (pos === 1 && digit === 1) {
          result += 'สิบ';
        } else if (pos === 1 && digit === 2) {
          result += 'ยี่สิบ';
        } else {
          result += digits[digit] + positions[pos];
        }
      }
    }
    return result;
  }

  let bahtText = '';
  const bahtNum = parseInt(bahtStr, 10);
  if (bahtNum > 0) {
    if (bahtStr.length > 6) {
      const millions = bahtStr.slice(0, -6);
      const remainder = bahtStr.slice(-6);
      bahtText = convertGroup(millions) + 'ล้าน' + convertGroup(remainder) + 'บาท';
    } else {
      bahtText = convertGroup(bahtStr) + 'บาท';
    }
  }

  let satangText = '';
  const satangNum = parseInt(satangStr, 10);
  if (satangNum === 0) {
    satangText = 'ถ้วน';
  } else {
    satangText = convertGroup(satangStr) + 'สตางค์';
  }

  return bahtText + satangText;
}

export interface RenderResult {
  html: string;
  pages: string[];
  total_pages: number;
  is_custom_doc: boolean;
}

export async function renderDocxToHtml(templateId: number | null, formData: any): Promise<RenderResult> {
  let templateFilePath: string | null = null;

  if (templateId) {
    const template = await (prisma as any).documentTemplate.findUnique({
      where: { id: templateId },
    });
    if (template && fs.existsSync(template.file_path)) {
      templateFilePath = template.file_path;
    }
  }

  if (!templateFilePath) {
    const defaultTemplate = await (prisma as any).documentTemplate.findFirst({
      where: { is_default: true },
    });
    if (defaultTemplate && fs.existsSync(defaultTemplate.file_path)) {
      templateFilePath = defaultTemplate.file_path;
    } else {
      const firstTemplate = await (prisma as any).documentTemplate.findFirst({
        orderBy: { created_at: 'desc' },
      });
      if (firstTemplate && fs.existsSync(firstTemplate.file_path)) {
        templateFilePath = firstTemplate.file_path;
      }
    }
  }

  if (!templateFilePath || !fs.existsSync(templateFilePath)) {
    return { html: '', pages: [], total_pages: 0, is_custom_doc: false };
  }

  // Budget calculations
  const budgetItems = Array.isArray(formData.budget_items) ? formData.budget_items : [];
  const totalBudget = budgetItems.reduce((sum: number, item: any) => {
    const q = parseFloat(item.quantity) || 0;
    const p = parseFloat(item.unit_price) || 0;
    return sum + q * p;
  }, 0);

  const bahtText = formatThaiBaht(totalBudget);

  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
      return `${d.getDate()} ${thaiMonths[d.getMonth()]} พ.ศ. ${d.getFullYear() + 543}`;
    } catch {
      return dateStr;
    }
  };

  const now = new Date();
  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const todayThaiFull = `${now.getDate()} ${thaiMonths[now.getMonth()]} พ.ศ. ${now.getFullYear() + 543}`;

  const firstTimeline = formData.timelines && formData.timelines[0] ? formData.timelines[0] : null;
  const startDateThai = firstTimeline?.start_date ? formatThaiDate(firstTimeline.start_date) : todayThaiFull;
  const locationFull = firstTimeline?.location || 'วิทยาลัยอาชีวศึกษาเชียงราย';

  const titleVal = formData.title || '........................................................';
  const deptVal = formData.department_name || 'แผนกวิชาเทคโนโลยีสารสนเทศ';
  const divVal = formData.division_name || 'ฝ่ายวิชาการ';
  const leaderVal = formData.leader_name || 'ผู้ดูแลระบบส่วนกลาง (ADMIN)';
  const positionVal = formData.leader_position || 'System Administrator';
  const backgroundVal = formData.background || 'เพื่อให้นักเรียน นักศึกษาวิทยาลัยการอาชีพเชียงราย ได้รับการพัฒนาทักษะวิชาชีพและสมรรถนะตรงตามความต้องการของสถานประกอบการ';

  // Build Context for docxtemplater
  const docxContext: Record<string, any> = {
    // Project Title aliases
    title: titleVal,
    project_name: titleVal,
    project_title: titleVal,
    name: titleVal,

    // Project Code & Year
    project_code: formData.project_code || 'ร่างโครงการ',
    fiscal_year: String(formData.fiscal_year || 2569),

    // Department & Division aliases
    department_name: deptVal,
    department: deptVal,
    division_name: divVal,
    division: divVal,
    sub_division: divVal,
    subdivision: divVal,

    // Leader / Responsible person aliases
    leader_name: leaderVal,
    leader: leaderVal,
    responsible_person: leaderVal,
    responsible_name: leaderVal,
    leader_position: positionVal,
    position: positionVal,
    responsible_position: positionVal,

    // Rationale & Background aliases
    background: backgroundVal,
    rationale: backgroundVal,
    principle: backgroundVal,
    principles: backgroundVal,

    // Dates & Location
    doc_date_full: todayThaiFull,
    date: todayThaiFull,
    today: todayThaiFull,
    start_date: startDateThai,
    location_full: locationFull,
    location: locationFull,

    // Targets & Results
    target_quantitative: formData.target_quantitative || formData.target_groups?.quantitative || 'นักศึกษา 50 คน',
    target_qualitative: formData.target_qualitative || formData.target_groups?.qualitative || 'ผ่านเกณฑ์ร้อยละ 80',
    expected_results: formData.expected_results || 'นักศึกษามีทักษะความรู้ตรงตามวัตถุประสงค์',

    // Budget
    total_budget_text: totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
    total_budget_bahttext: bahtText,

    // Loops
    objectives: Array.isArray(formData.objectives)
      ? formData.objectives.map((obj: string, idx: number) => ({
          no: idx + 1,
          item: obj || `วัตถุประสงค์ข้อที่ ${idx + 1}`,
          description: obj || `วัตถุประสงค์ข้อที่ ${idx + 1}`,
        }))
      : [],
    timelines: Array.isArray(formData.timelines)
      ? formData.timelines.map((t: any, idx: number) => ({
          no: idx + 1,
          activity_name: t.activity_name || '',
          start_date: formatThaiDate(t.start_date),
          end_date: formatThaiDate(t.end_date),
          location: t.location || '',
        }))
      : [],
    budget_items: budgetItems.map((b: any, idx: number) => {
      const q = parseFloat(b.quantity) || 0;
      const p = parseFloat(b.unit_price) || 0;
      const total = q * p;
      return {
        no: idx + 1,
        description: b.description || '',
        quantity: q,
        unit: b.unit || '',
        unit_price: p.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
        total_amount: total.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
      };
    }),
  };

  // Load Word ZIP
  const content = fs.readFileSync(templateFilePath, 'binary');
  const zip = new PizZip(content);

  // Normalize all double braces in XML files and inject PAGE_BREAK markers
  const xmlTargetFiles = ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/footer1.xml', 'word/footer2.xml'];
  for (const xmlPath of xmlTargetFiles) {
    const file = zip.files[xmlPath];
    if (file) {
      let xmlStr = file.asText();
      xmlStr = xmlStr.replace(/<w:lastRenderedPageBreak[^>]*\/>/g, '<w:r><w:t>[[PAGE_BREAK]]</w:t></w:r>');
      xmlStr = xmlStr.replace(/<w:br[^>]*w:type="page"[^>]*\/>/g, '<w:r><w:t>[[PAGE_BREAK]]</w:t></w:r>');
      xmlStr = xmlStr.replace(/<w:sectPr[^>]*>[\s\S]*?<\/w:sectPr>/g, '<w:r><w:t>[[PAGE_BREAK]]</w:t></w:r>');
      xmlStr = xmlStr.replace(/\{\{/g, '{').replace(/\}\}/g, '}');
      zip.file(xmlPath, xmlStr);
    }
  }

  // Populate using Docxtemplater across all merged runs
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: (part) => {
      if (docxContext[part.value] !== undefined) {
        return docxContext[part.value];
      }
      return '';
    },
  });

  try {
    doc.render(docxContext);
  } catch (err) {
    console.warn('Docxtemplater render notice:', err);
  }

  const buf = doc.getZip().generate({ type: 'nodebuffer' });

  // Convert populated Word Buffer into styled HTML with exact image proportions
  let imageCounter = 0;
  const options = {
    convertImage: mammoth.images.imgElement((image: any) => {
      imageCounter++;
      const currentIdx = imageCounter;
      return image.read('base64').then((imageBuffer: string) => {
        // Apply exact dimension style based on image purpose
        let imgStyle = 'display: block; margin: 8px auto; object-fit: contain;';
        if (currentIdx === 1) {
          // Top Garuda logo (Page 1): 3.0cm height
          imgStyle = 'display: block; width: 3.0cm; height: 3.0cm; margin: 0 auto 6px auto; object-fit: contain;';
        } else if (currentIdx === 2) {
          // Cover Vocational emblem (Page 2): 4.5cm height
          imgStyle = 'display: block; width: 4.5cm; height: 4.5cm; margin: 16px auto; object-fit: contain;';
        } else {
          // Photos / Activity Frames: 14cm width
          imgStyle = 'display: block; width: 14.5cm; max-height: 10cm; margin: 10px auto; object-fit: contain; border-radius: 4px; border: 1px solid #cbd5e1;';
        }

        return {
          src: `data:${image.contentType};base64,${imageBuffer}`,
          style: imgStyle,
        };
      });
    }),
  };

  const result = await (mammoth as any).convertToHtml({ buffer: buf }, options);
  const fullHtml = result.value;

  const rawPages = fullHtml.split('[[PAGE_BREAK]]');
  const cleanPages = rawPages
    .map((p: string) => p.trim())
    .filter((p: string) => p.length > 0);

  return {
    html: fullHtml.replace(/\[\[PAGE_BREAK\]\]/g, ''),
    pages: cleanPages.length > 0 ? cleanPages : [fullHtml],
    total_pages: cleanPages.length > 0 ? cleanPages.length : 1,
    is_custom_doc: true,
  };
}

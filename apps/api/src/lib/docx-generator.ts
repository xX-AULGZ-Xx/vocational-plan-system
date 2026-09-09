import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { prisma } from './prisma';

const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || './storage');
const TEMPLATES_DIR = path.join(STORAGE_DIR, 'templates');
const EXPORTS_DIR = path.join(STORAGE_DIR, 'exports');

if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}


function toThaiNumerals(str: string): string {
  if (!str) return '';
  const thaiNums = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return str.replace(/[0-9]/g, (match) => thaiNums[parseInt(match)]);
}

export function formatThaiDate(date: Date | string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];
  return `${d.getDate()} ${thaiMonths[d.getMonth()]} พ.ศ. ${d.getFullYear() + 543}`;
}

export function resolveTemplateFilePath(filePath: string): string {
  if (!filePath) return '';
  if (fs.existsSync(filePath)) return filePath;
  const base = path.basename(filePath);
  const inTemplatesDir = path.join(TEMPLATES_DIR, base);
  if (fs.existsSync(inTemplatesDir)) return inTemplatesDir;
  return '';
}

export function sanitizeDocxTemplate(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  try {
    const content = fs.readFileSync(filePath, 'binary');
    const zip = new PizZip(content);
    let docXml = zip.files['word/document.xml']?.asText();
    if (!docXml) return;

    docXml = docXml.replace(/<w:proofErr[^>]*\/>/g, '');
    docXml = docXml.replace(/<w:noProof[^>]*\/>/g, '');


    zip.file('word/document.xml', docXml);
    const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    fs.writeFileSync(filePath, buf);
  } catch (err) {
    console.warn('Docx sanitize warning:', err);
  }
}

export async function renderDynamicDocx(templatePath: string, formData: Record<string, any>, tags?: any[]): Promise<{ filePath: string; fileName: string; buffer: Buffer }> {
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found at ${templatePath}`);
  }

  // Auto-inject settings defaults for executive / college info if not provided in formData
  try {
    const sysSettings = await (prisma as any).systemSetting.findMany();
    const settingsMap = new Map(sysSettings.map((s: any) => [s.key, s.value]));

    const collegeName = settingsMap.get('college_name') || 'วิทยาลัยการอาชีพเชียงราย';
    const directorName = settingsMap.get('director_name') || 'นางปิยะพร พูลเพิ่ม';
    const directorPosition = settingsMap.get('director_position') || `ผู้อำนวยการ${collegeName}`;

    if (!formData.college_name) formData.college_name = collegeName;
    if (!formData.director_name) formData.director_name = directorName;
    if (!formData.director_position) formData.director_position = directorPosition;
    if (!formData.deputy_acad_name) formData.deputy_acad_name = settingsMap.get('deputy_acad_name') || '';
    if (!formData.deputy_acad_position) formData.deputy_acad_position = settingsMap.get('deputy_acad_position') || 'รองผู้อำนวยการฝ่ายวิชาการ';
    if (!formData.deputy_res_name) formData.deputy_res_name = settingsMap.get('deputy_res_name') || '';
    if (!formData.deputy_res_position) formData.deputy_res_position = settingsMap.get('deputy_res_position') || 'รองผู้อำนวยการฝ่ายบริหารทรัพยากร';
    if (!formData.deputy_dev_name) formData.deputy_dev_name = settingsMap.get('deputy_dev_name') || '';
    if (!formData.deputy_dev_position) formData.deputy_dev_position = settingsMap.get('deputy_dev_position') || 'รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียน นักศึกษา';
    if (!formData.deputy_strat_name) formData.deputy_strat_name = settingsMap.get('deputy_strat_name') || '';
    if (!formData.deputy_strat_position) formData.deputy_strat_position = settingsMap.get('deputy_strat_position') || 'รองผู้อำนวยการฝ่ายแผนงานและความร่วมมือ';
    if (!formData.planning_head_name) formData.planning_head_name = settingsMap.get('planning_head_name') || '';
    if (!formData.planning_head_position) formData.planning_head_position = settingsMap.get('planning_head_position') || 'หัวหน้างานวางแผนและงบประมาณ';
  } catch (err) {
    console.warn('Could not load system settings for docx render fallback:', err);
  }

  // Auto-format dates, date ranges, and boolean checklists
  for (const key of Object.keys(formData)) {
    const val = formData[key];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (val.start && val.end) {
        formData[key] = formatThaiDate(val.start) + ' ถึง ' + formatThaiDate(val.end);
      } else {
        // Inject _chk formatted strings for boolean checklists
        for (const subKey of Object.keys(val)) {
          if (typeof val[subKey] === 'boolean') {
            val[subKey + '_chk'] = val[subKey] ? '☑' : '☐';
            if (subKey.endsWith('_chk')) {
              val[subKey] = val[subKey] ? '☑' : '☐';
            }
          }
        }
        
        // Auto-generate a beautiful multiline text version for ALIGNMENT_CHECKLIST

      }
    } else if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      formData[key] = formatThaiDate(val);
    } else if (typeof val === 'boolean') {
      const tag = tags?.find(t => t.tag_name === key || t.tag_name + '_chk' === key);
      const labelText = tag ? ` ${tag.label}` : '';
      const box = val ? '☑' : '☐';
      formData[key + '_chk'] = box + labelText;
      if (key.endsWith('_chk')) {
        formData[key] = box + labelText;
      }
    }
  }

  // Pre-process docx for proofErr tags etc
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);

  // Helper to coalesce and clean tags across text runs in Word XML
  const cleanWordXmlTags = (xml: string): string => {
    let result = xml;
    result = result.replace(/<w:proofErr[^>]*\/>/g, '');
    result = result.replace(/<w:noProof[^>]*\/>/g, '');
    result = result.replace(/<w:lang[^>]*\/>/g, '');

    // Step 1: Coalesce tags that Word split across multiple <w:t> tags within the same paragraph/run:
    // e.g. <w:t>{</w:t></w:r>...<w:t>title</w:t>...<w:t>}</w:t>
    for (let iter = 0; iter < 5; iter++) {
      const prev = result;
      // Match { without matching } before the next <w:t> close, followed by XML and then the next <w:t>
      result = result.replace(/(<w:t[^>]*>[^<\}]*?\{[^<\}]*?)<\/w:t>(?:(?!<w:t[^>]*>)[\s\S])*?<w:t[^>]*>([^<]*?)/g, '$1$2');
      // Match (( without matching )) before next run
      result = result.replace(/(<w:t[^>]*>[^<\)]*?\(\([^<\)]*?)<\/w:t>(?:(?!<w:t[^>]*>)[\s\S])*?<w:t[^>]*>([^<]*?)/g, '$1$2');
      if (result === prev) break;
    }

    // Step 2: Convert ((tag)) -> {tag}
    result = result.replace(/\(\(([#^/]?[\w\d_]+)\)\)/g, '{$1}');

    // Step 3: Normalize double brackets {{tag}} -> {tag} to avoid duplicate delimiters
    result = result.replace(/\{\{\s*([%#^/]?[\w\d_]+)\s*\}\}/g, '{$1}');

    // Step 4: Clean up any remaining {tag} whitespace
    result = result.replace(/\{\s+([%#^/]?[\w\d_]+)\s*\}/g, '{$1}');
    result = result.replace(/\{\s*([%#^/]?[\w\d_]+)\s+\}/g, '{$1}');

    return result;
  };

  if (zip.files['word/document.xml']) {
    let docXml = zip.files['word/document.xml'].asText();
    docXml = cleanWordXmlTags(docXml);
    zip.file('word/document.xml', docXml);
  }

  // Also clean headers and footers if any
  for (const fileName of Object.keys(zip.files)) {
    if (fileName.startsWith('word/header') || fileName.startsWith('word/footer')) {
      let headerXml = zip.files[fileName]?.asText();
      if (headerXml) {
        headerXml = cleanWordXmlTags(headerXml);
        zip.file(fileName, headerXml);
      }
    }
  }

  let imageModule: any = null;
  // 1x1 transparent PNG fallback buffer
  const EMPTY_PNG_BUFFER = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

  try {
    const ImageModule = require('docxtemplater-image-module-free');
    imageModule = new ImageModule({
      centered: false,
      fileType: "docx",
      getImage: (tagValue: string, tagName: string) => {
        if (!tagValue) return EMPTY_PNG_BUFFER;
        try {
          if (typeof tagValue === 'string' && tagValue.startsWith('data:image')) {
            const base64Data = tagValue.replace(/^data:image\/\w+;base64,/, '');
            return Buffer.from(base64Data, 'base64');
          }
          if (typeof tagValue === 'string' && tagValue.startsWith('/storage/documents/')) {
            const relName = tagValue.replace('/storage/documents/', '');
            const absPath = path.join(STORAGE_DIR, 'documents', relName);
            if (fs.existsSync(absPath)) return fs.readFileSync(absPath);
          }
          if (typeof tagValue === 'string' && fs.existsSync(tagValue)) {
            return fs.readFileSync(tagValue);
          }
        } catch (err) {
          console.warn(`Could not read image for tag ${tagName}:`, err);
        }
        return EMPTY_PNG_BUFFER;
      },
      getSize: (img: any, tagValue: string, tagName: string) => {
        if (!tagValue || img === EMPTY_PNG_BUFFER) {
          return [1, 1];
        }
        const size = formData[`${tagName}_size`];
        if (size && Array.isArray(size) && size.length === 2) {
          return size; // [width, height] in pixels
        }
        return [220, 160];
      }
    });
  } catch (err) {
    console.warn("docxtemplater-image-module-free not found, images won't be rendered.");
  }

  const docOptions: any = {
    delimiters: { start: '{', end: '}' },
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  };

  // Auto-resolve dates if present
  const formatThaiDateHelper = (d: any) => {
    if (!d) return '';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return String(d);
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return `${dateObj.getDate()} ${months[dateObj.getMonth()]} พ.ศ. ${dateObj.getFullYear() + 543}`;
  };

  if (Array.isArray(formData.timelines) && formData.timelines.length > 0) {
    const validStartTimelines = formData.timelines.filter((t: any) => t.start_date).sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    const validEndTimelines = formData.timelines.filter((t: any) => t.end_date || t.start_date).sort((a: any, b: any) => new Date(a.end_date || a.start_date).getTime() - new Date(b.end_date || b.start_date).getTime());
    if (validStartTimelines.length > 0 && !formData.start_date) {
      formData.start_date = formatThaiDateHelper(validStartTimelines[0].start_date);
    }
    if (validEndTimelines.length > 0 && !formData.end_date) {
      formData.end_date = formatThaiDateHelper(validEndTimelines[validEndTimelines.length - 1].end_date || validEndTimelines[validEndTimelines.length - 1].start_date);
    }
  }

  if (formData.start_date && formData.end_date && !formData.duration_text) {
    formData.duration_text = formData.start_date === formData.end_date ? formData.start_date : `${formData.start_date} ถึง ${formData.end_date}`;
  }
  if (formData.duration_text && !formData.duration) {
    formData.duration = formData.duration_text;
  }

  // Auto-calculate budget totals if budget_items exists
  if (Array.isArray(formData.budget_items)) {
    const isMat = (b: any) => (b.category_name && b.category_name.includes('วัสดุ')) || Number(b.category_id) === 3 || (!b.category_name && !b.category_id && !(b.description || '').includes('ใช้สอย') && !(b.description || '').includes('ตอบแทน'));
    const isSvc = (b: any) => (b.category_name && b.category_name.includes('ใช้สอย')) || Number(b.category_id) === 2 || (!b.category_name && (b.description && (b.description.includes('ใช้สอย') || b.description.includes('อาหาร') || b.description.includes('ที่พัก') || b.description.includes('สถานที่') || b.description.includes('จ้าง'))));
    const isRem = (b: any) => (b.category_name && b.category_name.includes('ตอบแทน')) || Number(b.category_id) === 1 || (!b.category_name && (b.description && (b.description.includes('ตอบแทน') || b.description.includes('วิทยากร') || b.description.includes('กรรมการ'))));

    let matBudget = 0;
    let svcBudget = 0;
    let remBudget = 0;

    formData.budget_items.forEach(b => {
      const amt = (Number(b.quantity) || 0) * (Number(b.unit_price) || 0);
      if (isMat(b)) matBudget += amt;
      else if (isSvc(b)) svcBudget += amt;
      else if (isRem(b)) remBudget += amt;
    });

    const matText = matBudget > 0 ? matBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-';
    const svcText = svcBudget > 0 ? svcBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-';
    const remText = remBudget > 0 ? remBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-';
    const total = matBudget + svcBudget + remBudget;
    const totalText = total > 0 ? total.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-';

    formData.mat_total = matText;
    formData.svc_total = svcText;
    formData.rem_total = remText;
    formData.budget_total = totalText;

    const bt = (formData.budget_type || '').toString().trim();
    const isGov = bt.includes('งบประมาณ') && !bt.includes('รายได้');
    const isIncome = bt.includes('รายได้');
    const isSub = bt.includes('อุดหนุน');
    
    const types = ['gov', 'income', 'sub', 'other'];
    types.forEach(t => {
      formData['mat_' + t] = '-';
      formData['svc_' + t] = '-';
      formData['rem_' + t] = '-';
      formData['total_' + t] = '-';
    });

    let target = 'other';
    if (isGov) target = 'gov';
    else if (isIncome) target = 'income';
    else if (isSub) target = 'sub';

    if (bt) {
      formData['mat_' + target] = matText;
      formData['svc_' + target] = svcText;
      formData['rem_' + target] = remText;
      formData['total_' + target] = totalText;
    }
  }
  
  if (imageModule) {
    docOptions.modules = [imageModule];
  }


  // Ensure ALIGNMENT_CHECKLIST is generated even if it's not in formData (e.g. empty)
  if (tags && Array.isArray(tags)) {
    for (const tag of tags) {
      if (tag.tag_type === 'TABLE_LOOP' || tag.tag_type === 'TIMELINE') {
        const key = tag.tag_name;
        if (Array.isArray(formData[key])) {
          formData[key] = formData[key].map((item, idx) => {
            const enriched = {
              ...item,
              _index: idx + 1,
              _indexThai: toThaiNumerals((idx + 1).toString())
            };
            if (key === 'timelines') {
              const fy = parseInt(formData.fiscal_year) || (new Date().getFullYear() + 543);
              const gregYear = fy - 543;
              const months = [9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8];
              const startDate = item.start_date ? new Date(item.start_date) : null;
              const endDate = item.end_date ? new Date(item.end_date) : null;
              const startAbs = startDate && !isNaN(startDate.getTime()) ? startDate.getFullYear() * 12 + startDate.getMonth() : null;
              const endAbs = endDate && !isNaN(endDate.getTime()) ? endDate.getFullYear() * 12 + endDate.getMonth() : null;
              for (let i = 0; i < 12; i++) {
                const colY = (i < 3) ? gregYear - 1 : gregYear;
                const colAbs = colY * 12 + months[i];
                let hit = false;
                if (startAbs !== null && endAbs !== null) {
                  hit = (colAbs >= startAbs && colAbs <= endAbs);
                } else if (startAbs !== null) {
                  hit = (colAbs === startAbs);
                }
                enriched['m' + (i + 1)] = hit ? '/' : '';
                enriched['m' + (i + 1) + '_check'] = hit ? '\u2713' : '';
                enriched['m' + (i + 1) + '_bullet'] = hit ? '\u25CF' : '';
              }
            }
            return enriched;
          });
        }
      }
      
      if (tag.tag_type === 'ALIGNMENT_CHECKLIST' && Array.isArray(tag.options)) {
        const key = tag.tag_name;
        const val = formData[key] || {};
        
        const listArr: any[] = [];
        let checklistText = '';
        
        tag.options.forEach((opt: any, optIndex: number) => {
           const item = typeof opt === 'string' ? { key: 'chk_' + optIndex, label: opt, indent: 0 } : opt;
           const isChecked = val[item.key];
           const box = isChecked ? '☑' : '☐';
           const safeLabel = toThaiNumerals(item.label || '');
           let indentSpaces = '';
           if (item.indent === 1) indentSpaces = '        ';
           if (item.indent === 2) indentSpaces = '                ';
           
           checklistText += `${indentSpaces}${box}  ${safeLabel}\n`;
           
           listArr.push({
             isBold: item.indent === 0,
             text: `${indentSpaces}${box}  ${safeLabel}`,
             rawText: `${box}  ${safeLabel}`,
             textBold: item.indent === 0 ? `${indentSpaces}${box}  ${safeLabel}` : '',
             textRegular: item.indent !== 0 ? `${indentSpaces}${box}  ${safeLabel}` : '',
             box: box,
             label: safeLabel,
             indent: item.indent
           });
        });
        
        const listKey = key.endsWith('_list') ? key : key + '_list';
        formData[listKey] = listArr;
        
        if (key.endsWith('_chk') && !key.endsWith('_list')) {
          formData[key] = checklistText.trim();
        }
      }
    }
  }

  let buf: Buffer;
  try {
    const doc = new Docxtemplater(zip, docOptions);
    doc.render(formData);
    buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });
  } catch (renderError: any) {
    console.error('Docxtemplater render error details:', renderError);
    if (renderError.properties && renderError.properties.errors) {
      console.error('Docxtemplater sub-errors:', JSON.stringify(renderError.properties.errors, null, 2));
    }
    throw renderError;
  }

  const safeTitle = (formData.title || 'document').replace(/[\/\\:*?"<>|]/g, '_').slice(0, 50);
  const outFileName = `exported_${safeTitle}_${Date.now()}.docx`;
  const outFilePath = path.join(EXPORTS_DIR, outFileName);

  fs.writeFileSync(outFilePath, buf);

  return {
    filePath: outFilePath,
    fileName: outFileName,
    buffer: buf
  };
}

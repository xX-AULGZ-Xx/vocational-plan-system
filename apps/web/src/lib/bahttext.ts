export function formatThaiBaht(num: number | string): string {
  const number = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(number) || number < 0) return 'ศูนย์บาทถ้วน';
  if (number === 0) return 'ศูนย์บาทถ้วน';

  const numbers = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  const [integerPart, decimalPart] = number.toFixed(2).split('.');

  function convertGroup(digits: string): string {
    let text = '';
    const len = digits.length;
    for (let i = 0; i < len; i++) {
      const d = parseInt(digits[i]);
      const u = len - 1 - i;
      if (d === 0) continue;

      if (u === 1 && d === 1) {
        text += 'สิบ';
      } else if (u === 1 && d === 2) {
        text += 'ยี่สิบ';
      } else if (u === 0 && d === 1 && len > 1 && parseInt(digits[len - 2]) !== 0) {
        text += 'เอ็ด';
      } else {
        text += numbers[d] + units[u];
      }
    }
    return text;
  }

  let result = '';
  if (parseInt(integerPart) > 0) {
    if (integerPart.length > 6) {
      const millionPart = integerPart.slice(0, integerPart.length - 6);
      const remainPart = integerPart.slice(integerPart.length - 6);
      result += convertGroup(millionPart) + 'ล้าน' + convertGroup(remainPart) + 'บาท';
    } else {
      result += convertGroup(integerPart) + 'บาท';
    }
  }

  if (parseInt(decimalPart) > 0) {
    result += convertGroup(decimalPart) + 'สตางค์';
  } else {
    result += 'ถ้วน';
  }

  return result;
}

/**
 * คำนวณปีงบประมาณไทยปัจจุบัน (พ.ศ.)
 * - รอบปีงบประมาณไทยเริ่ม 1 ต.ค. (เดือน 10 หรือ index 9) ถึง 30 ก.ย.
 * - หากเดือน >= 10 (ต.ค. - ธ.ค.) ปีงบประมาณ = ปี พ.ศ. ปัจจุบัน + 1
 * - หากเดือน < 10 (ม.ค. - ก.ย.) ปีงบประมาณ = ปี พ.ศ. ปัจจุบัน
 */
export function getCurrentThaiFiscalYear(date: Date = new Date()): number {
  const thaiYear = date.getFullYear() + 543;
  const month = date.getMonth(); // 0 = มกราคม, 9 = ตุลาคม
  return month >= 9 ? thaiYear + 1 : thaiYear;
}

/**
 * คำนวณปีงบประมาณไทย (พ.ศ.) จากสตริงวันที่ เช่น '2025-10-01', '2568-10-01'
 * - ต.ค. (เดือน 10) - ธ.ค. (เดือน 12) นับเป็นปีงบประมาณถัดไป (+1)
 * - ม.ค. (เดือน 1) - ก.ย. (เดือน 9) นับเป็นปีงบประมาณปัจจุบัน
 */
export function calculateFiscalYearFromDateString(dateStr: string | null | undefined): number | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    let year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10); // 1 - 12
    if (year < 2400) {
      year += 543;
    }
    return month >= 10 ? year + 1 : year;
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    let y = d.getFullYear();
    const m = d.getMonth(); // 0 - 11
    if (y < 2400) {
      y += 543;
    }
    return m >= 9 ? y + 1 : y;
  }

  return null;
}

/**
 * ตรวจจับปีงบประมาณจากข้อมูลฟอร์มโครงการ (dynamicData หรือ timelines)
 * โดยดูจากวันเริ่มต้นโครงการในฟิลด์ DATERANGE, DATE, หรือ key ที่ระบุวันเริ่มต้น
 */
export function detectProjectFiscalYear(dynamicData: Record<string, any>, defaultYear?: number | string): number {
  const fallbackYear = defaultYear ? parseInt(String(defaultYear), 10) : getCurrentThaiFiscalYear();

  if (!dynamicData || typeof dynamicData !== 'object') {
    return fallbackYear;
  }

  // 1. ตรวจสอบฟิลด์ DATERANGE หรือ object ที่มี property 'start'
  for (const [_, val] of Object.entries(dynamicData)) {
    if (val && typeof val === 'object' && !Array.isArray(val) && (val as any).start) {
      const fy = calculateFiscalYearFromDateString((val as any).start);
      if (fy) return fy;
    }
  }

  // 2. ตรวจสอบฟิลด์ประเภท DATE หรือ key ที่มีคำว่า start_date, start, begin, duration, period
  for (const [key, val] of Object.entries(dynamicData)) {
    if (typeof val === 'string' && val) {
      const lk = key.toLowerCase();
      if (lk.includes('start') || lk.includes('begin') || lk.includes('period') || lk.includes('duration') || lk.includes('date')) {
        const fy = calculateFiscalYearFromDateString(val);
        if (fy) return fy;
      }
    }
  }

  // 3. ตรวจสอบ timelines (ถ้ามี)
  if (Array.isArray(dynamicData.timelines) && dynamicData.timelines.length > 0) {
    for (const item of dynamicData.timelines) {
      if (item && item.start_date) {
        const fy = calculateFiscalYearFromDateString(item.start_date);
        if (fy) return fy;
      }
    }
  }

  // 4. ถ้ามีระบุ fiscal_year ใน dynamicData
  if (dynamicData.fiscal_year) {
    const parsed = parseInt(String(dynamicData.fiscal_year), 10);
    if (!isNaN(parsed) && parsed > 2500) {
      return parsed;
    }
  }

  return fallbackYear;
}

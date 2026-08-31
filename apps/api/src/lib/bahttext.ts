export function formatThaiBaht(num: number | string): string {
  const number = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(number)) return '';

  const numbers = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const units = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  if (number === 0) return 'ศูนย์บาทถ้วน';

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
  // Handle integer
  if (parseInt(integerPart) > 0) {
    if (integerPart.length > 6) {
      const millionPart = integerPart.slice(0, integerPart.length - 6);
      const remainPart = integerPart.slice(integerPart.length - 6);
      result += convertGroup(millionPart) + 'ล้าน' + convertGroup(remainPart) + 'บาท';
    } else {
      result += convertGroup(integerPart) + 'บาท';
    }
  }

  // Handle satang
  if (parseInt(decimalPart) > 0) {
    result += convertGroup(decimalPart) + 'สตางค์';
  } else {
    result += 'ถ้วน';
  }

  return result;
}

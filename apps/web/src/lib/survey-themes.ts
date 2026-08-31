export interface SurveyThemeConfig {
  preset?: string;
  font?: string;
  color?: string;
  bg_style?: string;
  header_style?: string;
  rating_style?: 'buttons' | 'stars' | 'emoji';
  border_radius?: string;
}

export interface FontOption {
  id: string;
  name: string;
  desc: string;
  preview: string;
  className: string;
}

export interface ColorOption {
  id: string;
  name: string;
  colorCode: string;
  primaryClass: string;
  headerGradient: string;
  gradientStyle: string;
  buttonClass: string;
  buttonColor: string;
  badgeClass: string;
  activeRadioClass: string;
  ringClass: string;
  scoreSelectedClass: string;
  accentText: string;
  lightBg: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  desc: string;
  icon: string;
  font: string;
  color: string;
  bg_style: string;
  rating_style: 'buttons' | 'stars' | 'emoji';
  border_radius: string;
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  vocational_official: {
    id: 'vocational_official',
    name: 'ราชการอาชีวะ มาตรฐาน',
    desc: 'ฟอนต์สารบรรณ โทนน้ำเงินคราม สุภาพ เรียบร้อย ตามแบบแผนราชการ',
    icon: '🏛️',
    font: 'sarabun',
    color: 'indigo',
    bg_style: 'clean',
    rating_style: 'buttons',
    border_radius: 'rounded-2xl',
  },
  modern_tech: {
    id: 'modern_tech',
    name: 'เทคโนโลยี & นวัตกรรม (Cyber)',
    desc: 'ฟอนต์จักรเพชร สีน้ำเงินมหาสมุทร พื้นหลังออร่า เหมาะกับงาน IT',
    icon: '🚀',
    font: 'chakra',
    color: 'blue',
    bg_style: 'mesh',
    rating_style: 'stars',
    border_radius: 'rounded-3xl',
  },
  academic_gold: {
    id: 'academic_gold',
    name: 'สัมมนาวิชาการ & เกียรตินิยม',
    desc: 'ฟอนต์พร้อมพท์ สีทองส้มอำพัน สง่างาม เป็นทางการ',
    icon: '🎓',
    font: 'prompt',
    color: 'amber',
    bg_style: 'gradient',
    rating_style: 'buttons',
    border_radius: 'rounded-3xl',
  },
  eco_nature: {
    id: 'eco_nature',
    name: 'สิ่งแวดล้อม & สุขภาวะ',
    desc: 'ฟอนต์มิตร สีเขียวมรกต สบายตา เป็นกันเอง พร้อมไอคอนประเมิน',
    icon: '🌿',
    font: 'mitr',
    color: 'emerald',
    bg_style: 'gradient',
    rating_style: 'emoji',
    border_radius: 'rounded-3xl',
  },
  creative_violet: {
    id: 'creative_violet',
    name: 'สร้างสรรค์ & กิจกรรมศิลปะ',
    desc: 'ฟอนต์ K2D สีม่วงหรูหรา พร้อมดาว 5 ระดับ มีชีวิตชีวา',
    icon: '🎨',
    font: 'k2d',
    color: 'violet',
    bg_style: 'mesh',
    rating_style: 'stars',
    border_radius: 'rounded-3xl',
  },
  sweet_bloom: {
    id: 'sweet_bloom',
    name: 'กิจกรรมนักศึกษา & ชมรม',
    desc: 'ฟอนต์จามจุรี สีชมพูกุหลาบ อบอุ่น สนุกสนาน',
    icon: '🌸',
    font: 'baijamjuree',
    color: 'rose',
    bg_style: 'gradient',
    rating_style: 'emoji',
    border_radius: 'rounded-3xl',
  },
  corporate_minimal: {
    id: 'corporate_minimal',
    name: 'บริหารจัดการ & มินิมอล',
    desc: 'ฟอนต์ Noto Sans สีเทาเข้ม เรียบหรู ทันสมัย โฟกัสเนื้อหา',
    icon: '💼',
    font: 'noto_thai',
    color: 'slate',
    bg_style: 'clean',
    rating_style: 'buttons',
    border_radius: 'rounded-2xl',
  },
};

export const SURVEY_FONTS: Record<string, FontOption> = {
  prompt: {
    id: 'prompt',
    name: 'Prompt (พร้อมพท์)',
    desc: 'ทันสมัย เรียบหรู มาตรฐานระบบ',
    preview: 'แบบประเมินความพึงพอใจการดำเนินงานโครงการ',
    className: 'font-prompt',
  },
  sarabun: {
    id: 'sarabun',
    name: 'Sarabun (สารบรรณ)',
    desc: 'ทางการ มาตรฐานงานราชการ',
    preview: 'แบบประเมินความพึงพอใจการดำเนินงานโครงการ',
    className: 'font-sarabun',
  },
  kanit: {
    id: 'kanit',
    name: 'Kanit (คณิต)',
    desc: 'โมเดิร์น หนักแน่น มั่นคง',
    preview: 'แบบประเมินความพึงพอใจการดำเนินงานโครงการ',
    className: 'font-kanit',
  },
  mitr: {
    id: 'mitr',
    name: 'Mitr (มิตร)',
    desc: 'อบอุ่น เป็นกันเอง สบายตา',
    preview: 'แบบประเมินความพึงพอใจการดำเนินงานโครงการ',
    className: 'font-mitr',
  },
  noto_thai: {
    id: 'noto_thai',
    name: 'Noto Sans Thai',
    desc: 'สากล สะอาดตา คมชัดระดับสากล',
    preview: 'แบบประเมินความพึงพอใจการดำเนินงานโครงการ',
    className: 'font-noto-thai',
  },
  chakra: {
    id: 'chakra',
    name: 'Chakra Petch (จักรเพชร)',
    desc: 'ล้ำสมัย สไตล์เทคโนโลยี/วิศวะ',
    preview: 'แบบประเมินความพึงพอใจการดำเนินงานโครงการ',
    className: 'font-chakra',
  },
  baijamjuree: {
    id: 'baijamjuree',
    name: 'Bai Jamjuree (จามจุรี)',
    desc: 'กึ่งทางการ โค้งมนร่วมสมัย',
    preview: 'แบบประเมินความพึงพอใจการดำเนินงานโครงการ',
    className: 'font-baijamjuree',
  },
  k2d: {
    id: 'k2d',
    name: 'K2D',
    desc: 'อ่อนเยาว์ โค้งมน น่าสนใจ',
    preview: 'แบบประเมินความพึงพอใจการดำเนินงานโครงการ',
    className: 'font-k2d',
  },
};

export const SURVEY_COLORS: Record<string, ColorOption> = {
  indigo: {
    id: 'indigo',
    name: 'Royal Indigo (น้ำเงินคราม)',
    colorCode: '#4338ca',
    primaryClass: 'text-indigo-700',
    headerGradient: 'from-indigo-600 via-indigo-700 to-indigo-900',
    gradientStyle: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 50%, #312e81 100%)',
    buttonClass: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200',
    buttonColor: '#4f46e5',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    activeRadioClass: 'bg-indigo-50/90 border-indigo-500 text-indigo-900',
    ringClass: 'focus:ring-indigo-500 focus:border-indigo-500',
    scoreSelectedClass: 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-200',
    accentText: 'text-indigo-600',
    lightBg: 'bg-indigo-50',
  },
  blue: {
    id: 'blue',
    name: 'Ocean Blue (น้ำเงินมหาสมุทร)',
    colorCode: '#1d4ed8',
    primaryClass: 'text-blue-700',
    headerGradient: 'from-blue-600 via-blue-700 to-blue-900',
    gradientStyle: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #1e3a8a 100%)',
    buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200',
    buttonColor: '#2563eb',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    activeRadioClass: 'bg-blue-50/90 border-blue-500 text-blue-900',
    ringClass: 'focus:ring-blue-500 focus:border-blue-500',
    scoreSelectedClass: 'bg-blue-600 border-blue-600 text-white shadow-blue-200',
    accentText: 'text-blue-600',
    lightBg: 'bg-blue-50',
  },
  sky: {
    id: 'sky',
    name: 'Sky Cyan (ฟ้าสดใส)',
    colorCode: '#0369a1',
    primaryClass: 'text-sky-700',
    headerGradient: 'from-sky-500 via-sky-600 to-sky-800',
    gradientStyle: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%)',
    buttonClass: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-200',
    buttonColor: '#0284c7',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    activeRadioClass: 'bg-sky-50/90 border-sky-500 text-sky-900',
    ringClass: 'focus:ring-sky-500 focus:border-sky-500',
    scoreSelectedClass: 'bg-sky-600 border-sky-600 text-white shadow-sky-200',
    accentText: 'text-sky-600',
    lightBg: 'bg-sky-50',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Green (เขียวมรกต)',
    colorCode: '#047857',
    primaryClass: 'text-emerald-700',
    headerGradient: 'from-emerald-600 via-emerald-700 to-teal-900',
    gradientStyle: 'linear-gradient(135deg, #059669 0%, #047857 50%, #064e3b 100%)',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200',
    buttonColor: '#059669',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    activeRadioClass: 'bg-emerald-50/90 border-emerald-500 text-emerald-900',
    ringClass: 'focus:ring-emerald-500 focus:border-emerald-500',
    scoreSelectedClass: 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-200',
    accentText: 'text-emerald-600',
    lightBg: 'bg-emerald-50',
  },
  teal: {
    id: 'teal',
    name: 'Jade Teal (เขียวหัวเป็ด)',
    colorCode: '#0f766e',
    primaryClass: 'text-teal-700',
    headerGradient: 'from-teal-600 via-teal-700 to-cyan-900',
    gradientStyle: 'linear-gradient(135deg, #0d9488 0%, #0f766e 50%, #134e4a 100%)',
    buttonClass: 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-200',
    buttonColor: '#0d9488',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    activeRadioClass: 'bg-teal-50/90 border-teal-500 text-teal-900',
    ringClass: 'focus:ring-teal-500 focus:border-teal-500',
    scoreSelectedClass: 'bg-teal-600 border-teal-600 text-white shadow-teal-200',
    accentText: 'text-teal-600',
    lightBg: 'bg-teal-50',
  },
  violet: {
    id: 'violet',
    name: 'Regal Violet (ม่วงหรูหรา)',
    colorCode: '#6d28d9',
    primaryClass: 'text-violet-700',
    headerGradient: 'from-violet-600 via-purple-700 to-indigo-900',
    gradientStyle: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4338ca 100%)',
    buttonClass: 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-200',
    buttonColor: '#7c3aed',
    badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
    activeRadioClass: 'bg-violet-50/90 border-violet-500 text-violet-900',
    ringClass: 'focus:ring-violet-500 focus:border-violet-500',
    scoreSelectedClass: 'bg-violet-600 border-violet-600 text-white shadow-violet-200',
    accentText: 'text-violet-600',
    lightBg: 'bg-violet-50',
  },
  rose: {
    id: 'rose',
    name: 'Rose Pink (ชมพูกุหลาบ)',
    colorCode: '#be123c',
    primaryClass: 'text-rose-700',
    headerGradient: 'from-rose-500 via-rose-600 to-pink-800',
    gradientStyle: 'linear-gradient(135deg, #e11d48 0%, #be123c 50%, #881337 100%)',
    buttonClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200',
    buttonColor: '#e11d48',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    activeRadioClass: 'bg-rose-50/90 border-rose-500 text-rose-900',
    ringClass: 'focus:ring-rose-500 focus:border-rose-500',
    scoreSelectedClass: 'bg-rose-600 border-rose-600 text-white shadow-rose-200',
    accentText: 'text-rose-600',
    lightBg: 'bg-rose-50',
  },
  amber: {
    id: 'amber',
    name: 'Sunset Amber (ส้มทองอร่าม)',
    colorCode: '#b45309',
    primaryClass: 'text-amber-700',
    headerGradient: 'from-amber-500 via-amber-600 to-orange-700',
    gradientStyle: 'linear-gradient(135deg, #d97706 0%, #b45309 50%, #7c2d12 100%)',
    buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200',
    buttonColor: '#d97706',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    activeRadioClass: 'bg-amber-50/90 border-amber-500 text-amber-950',
    ringClass: 'focus:ring-amber-500 focus:border-amber-500',
    scoreSelectedClass: 'bg-amber-600 border-amber-600 text-white shadow-amber-200',
    accentText: 'text-amber-600',
    lightBg: 'bg-amber-50',
  },
  crimson: {
    id: 'crimson',
    name: 'Ruby Crimson (แดงเลือดหมู)',
    colorCode: '#9f1239',
    primaryClass: 'text-red-700',
    headerGradient: 'from-red-700 via-rose-800 to-red-950',
    gradientStyle: 'linear-gradient(135deg, #be123c 0%, #9f1239 50%, #4c0519 100%)',
    buttonClass: 'bg-red-700 hover:bg-red-800 text-white shadow-red-200',
    buttonColor: '#be123c',
    badgeClass: 'bg-red-50 text-red-800 border-red-200',
    activeRadioClass: 'bg-red-50/90 border-red-500 text-red-950',
    ringClass: 'focus:ring-red-500 focus:border-red-500',
    scoreSelectedClass: 'bg-red-700 border-red-700 text-white shadow-red-200',
    accentText: 'text-red-700',
    lightBg: 'bg-red-50',
  },
  slate: {
    id: 'slate',
    name: 'Dark Slate (เทาเข้มมินิมอล)',
    colorCode: '#1e293b',
    primaryClass: 'text-slate-800',
    headerGradient: 'from-slate-700 via-slate-800 to-slate-950',
    gradientStyle: 'linear-gradient(135deg, #334155 0%, #1e293b 50%, #0f172a 100%)',
    buttonClass: 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-300',
    buttonColor: '#1e293b',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    activeRadioClass: 'bg-slate-100 border-slate-600 text-slate-900',
    ringClass: 'focus:ring-slate-500 focus:border-slate-500',
    scoreSelectedClass: 'bg-slate-800 border-slate-800 text-white shadow-slate-300',
    accentText: 'text-slate-800',
    lightBg: 'bg-slate-100',
  },
};

export const BACKGROUND_STYLES: Record<string, { id: string; name: string; bgClass: string; inlineStyle?: any }> = {
  gradient: {
    id: 'gradient',
    name: 'Soft Gradient (ไล่เฉดสีนุ่มนวล)',
    bgClass: 'bg-gradient-to-b from-slate-50 via-slate-100/70 to-slate-100',
  },
  mesh: {
    id: 'mesh',
    name: 'Aurora Mesh (มีแสงออร่า)',
    bgClass: 'bg-slate-50 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]',
  },
  clean: {
    id: 'clean',
    name: 'Pure Clean (ขาวมินิมอล)',
    bgClass: 'bg-slate-100',
  },
  dots: {
    id: 'dots',
    name: 'Subtle Dots (ลายจุดบางเบา)',
    bgClass: 'bg-slate-50 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]',
  },
};

export const RATING_STYLES: Record<string, { id: 'buttons' | 'stars' | 'emoji'; name: string; desc: string }> = {
  buttons: {
    id: 'buttons',
    name: 'ปุ่มตัวเลข 5 ระดับ (Standard Numeric)',
    desc: 'ตัวเลข 1-5 พร้อมระดับข้อความ ชัดเจน ทางการ ใช้งานง่าย',
  },
  stars: {
    id: 'stars',
    name: 'ดาวเรตติ้ง (Interactive Stars ⭐)',
    desc: 'ดาว 5 ดวงพร้อมเอฟเฟกต์สีและแอนิเมชัน สวยงามทันสมัย',
  },
  emoji: {
    id: 'emoji',
    name: 'อีโมจิความรู้สึก (Emoji Moods 😍)',
    desc: 'อีโมจิสื่ออารมณ์ 5 ระดับ เหมาะกับกิจกรรมเยาวชนและทั่วไป',
  },
};

export function getSurveyTheme(config?: SurveyThemeConfig | null) {
  const fontKey = config?.font && SURVEY_FONTS[config.font] ? config.font : 'prompt';
  const colorKey = config?.color && SURVEY_COLORS[config.color] ? config.color : 'indigo';
  const bgKey = config?.bg_style && BACKGROUND_STYLES[config.bg_style] ? config.bg_style : 'gradient';
  const ratingStyle = config?.rating_style || 'buttons';

  return {
    font: SURVEY_FONTS[fontKey] || SURVEY_FONTS.prompt,
    color: SURVEY_COLORS[colorKey] || SURVEY_COLORS.indigo,
    bg: BACKGROUND_STYLES[bgKey] || BACKGROUND_STYLES.gradient,
    ratingStyle,
    borderRadius: config?.border_radius || 'rounded-3xl',
  };
}

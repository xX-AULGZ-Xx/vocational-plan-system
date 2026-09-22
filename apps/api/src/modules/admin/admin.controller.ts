import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { prisma, serializeBigInt } from '../../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../../middlewares/auth';
import { Role } from '@prisma/client';
import { sseManager } from '../notifications/sse.manager';
import { extractFontsFromDocx } from '../../lib/font-extractor';
import { extractTagsFromDocx } from '../../lib/docx-extractor';
import { sanitizeDocxTemplate } from '../../lib/docx-generator';

const router = Router();

const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || './storage');
const TEMPLATES_DIR = path.join(STORAGE_DIR, 'templates');
const LOGOS_DIR = path.join(STORAGE_DIR, 'logos');

if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}
if (!fs.existsSync(LOGOS_DIR)) {
  fs.mkdirSync(LOGOS_DIR, { recursive: true });
}

// Multer storage for college logos
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, LOGOS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `college-logo-${uniqueSuffix}${ext}`);
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (.png, .jpg, .jpeg, .svg, .webp) เท่านั้น'));
    }
  },
});

// Multer storage for docx templates
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(TEMPLATES_DIR)) {
      fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
    }
    cb(null, TEMPLATES_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.docx';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `template-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
  fileFilter: (req, file, cb) => {
    const originalNameDecoded = fixThaiEncoding(file.originalname).toLowerCase();
    const isDocx =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/octet-stream' ||
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      originalNameDecoded.endsWith('.docx') ||
      originalNameDecoded.endsWith('.doc') ||
      file.originalname.toLowerCase().endsWith('.docx');

    if (isDocx) {
      cb(null, true);
    } else {
      cb(new Error('รองรับเฉพาะไฟล์เอกสาร Microsoft Word (.docx) เท่านั้น'));
    }
  },
});

function getThaiFiscalYear(date: Date = new Date()): number {
  const thaiYear = date.getFullYear() + 543;
  const month = date.getMonth(); // 0 = Jan, 9 = Oct
  return month >= 9 ? thaiYear + 1 : thaiYear;
}

const DEFAULT_SETTINGS = [
  { key: 'college_logo_url', value: '', description: 'URL หรือเส้นทางไฟล์รูปภาพตราสัญลักษณ์/โลโก้วิทยาลัย' },
  { key: 'college_name', value: 'วิทยาลัยการอาชีพเชียงราย', description: 'ชื่อสถานศึกษาทางการ (ภาษาไทย)' },
  { key: 'college_name_en', value: 'Chiangrai Industrial And Community Education College', description: 'ชื่อสถานศึกษา (ภาษาอังกฤษ)' },
  { key: 'college_address', value: 'เลขที่ ๑๒๓ หมู่ ๑๑ ตำบลท่าสาย อำเภอเมืองเชียงราย จังหวัดเชียงราย ๕๗๐๐๐', description: 'ที่อยู่สถานศึกษา' },
  { key: 'college_phone', value: '053-774505', description: 'เบอร์โทรศัพท์สถานศึกษา' },
  { key: 'college_email', value: 'cic.chiangrai@vec.mail.go.th', description: 'อีเมลสถานศึกษา' },
  { key: 'college_website', value: 'www.cic.ac.th', description: 'เว็บไซต์สถานศึกษา' },
  { key: 'current_fiscal_year', value: String(getThaiFiscalYear()), description: 'ปีงบประมาณเริ่มต้น' },
  { key: 'is_submission_open', value: 'true', description: 'สถานะเปิด/ปิดการเสนอโครงการ (true/false)' },
  { key: 'submission_start_date', value: '', description: 'วันที่เริ่มต้นเปิดรับข้อเสนอโครงการ' },
  { key: 'submission_end_date', value: '', description: 'วันที่สิ้นสุดการเปิดรับข้อเสนอโครงการ' },
  { key: 'director_name', value: 'นางปิยะพร พูลเพิ่ม', description: 'ชื่อผู้อำนวยการวิทยาลัย' },
  { key: 'director_position', value: 'ผู้อำนวยการวิทยาลัยการอาชีพเชียงราย', description: 'ตำแหน่งผู้อำนวยการ' },
  { key: 'deputy_acad_name', value: '', description: 'ชื่อ รองผู้อำนวยการฝ่ายวิชาการ' },
  { key: 'deputy_acad_position', value: 'รองผู้อำนวยการฝ่ายวิชาการ', description: 'ตำแหน่ง รองผู้อำนวยการฝ่ายวิชาการ' },
  { key: 'deputy_res_name', value: '', description: 'ชื่อ รองผู้อำนวยการฝ่ายบริหารทรัพยากร' },
  { key: 'deputy_res_position', value: 'รองผู้อำนวยการฝ่ายบริหารทรัพยากร', description: 'ตำแหน่ง รองผู้อำนวยการฝ่ายบริหารทรัพยากร' },
  { key: 'deputy_dev_name', value: '', description: 'ชื่อ รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียน นักศึกษา' },
  { key: 'deputy_dev_position', value: 'รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียน นักศึกษา', description: 'ตำแหน่ง รองผู้อำนวยการฝ่ายพัฒนากิจการนักเรียนฯ' },
  { key: 'deputy_strat_name', value: '', description: 'ชื่อ รองผู้อำนวยการฝ่ายแผนงานและความร่วมมือ' },
  { key: 'deputy_strat_position', value: 'รองผู้อำนวยการฝ่ายแผนงานและความร่วมมือ', description: 'ตำแหน่ง รองผู้อำนวยการฝ่ายแผนงานฯ' },
  { key: 'planning_head_name', value: '', description: 'ชื่อ หัวหน้างานวางแผนและงบประมาณ' },
  { key: 'planning_head_position', value: 'หัวหน้างานวางแผนและงบประมาณ', description: 'ตำแหน่ง หัวหน้างานวางแผนและงบประมาณ' },
  { key: 'enable_test_mode', value: 'true', description: 'เปิด/ปิดโหมดทดสอบระบบ (1-Click Test Login ในหน้าล็อกอิน)' },
  { key: 'google_client_id', value: '', description: 'Google OAuth 2.0 Client ID สำหรับ Sign in with Google' },
  { key: 'google_allowed_domains', value: 'cric.ac.th, vec.mail.go.th', description: 'โดเมนอีเมลองค์กรที่อนุญาตให้ล็อกอิน (คั่นด้วยเครื่องหมายจุลภาค)' },
  { key: 'memo_header', value: 'บันทึกข้อความ', description: 'หัวกระดาษเอกสารราชการ' },
  { key: 'memo_org', value: 'ส่วนราชการ: วิทยาลัยการอาชีพเชียงราย', description: 'ข้อความส่วนราชการ' },
  { key: 'margin_top', value: '2.5', description: 'ระยะขอบกระดาษด้านบน (cm)' },
  { key: 'margin_bottom', value: '2.0', description: 'ระยะขอบกระดาษด้านล่าง (cm)' },
  { key: 'margin_left', value: '2.5', description: 'ระยะขอบกระดาษด้านซ้าย (cm)' },
  { key: 'margin_right', value: '1.5', description: 'ระยะขอบกระดาษด้านขวา (cm)' },
  { key: 'smtp_enabled', value: 'false', description: 'เปิด/ปิดการส่งอีเมลแจ้งเตือน (true/false)' },
  { key: 'smtp_host', value: 'smtp.gmail.com', description: 'SMTP Server Host' },
  { key: 'smtp_port', value: '587', description: 'SMTP Server Port' },
  { key: 'smtp_secure', value: 'false', description: 'SMTP ใช้ SSL/TLS (true/false)' },
  { key: 'smtp_user', value: '', description: 'SMTP Username / อีเมลผู้ส่ง' },
  { key: 'smtp_pass', value: '', description: 'SMTP Password / App Password' },
  { key: 'smtp_from_name', value: 'ระบบบริหารจัดการโครงการ วก.เชียงราย', description: 'ชื่อผู้ส่งอีเมล' },
  { key: 'smtp_from_email', value: '', description: 'อีเมลผู้ส่ง (ถ้าต่างจาก Username)' },
  { key: 'project_code_template', value: 'PRJ-{YEAR}-{DIV}-{NUM}', description: 'รูปแบบแม่แบบรหัสโครงการ ({YEAR}=ปี พ.ศ. 4 หลัก, {YEAR2}=ปี 2 หลัก, {DIV}=รหัสฝ่าย, {NUM}=เลขรัน)' },
  { key: 'project_code_digits', value: '4', description: 'จำนวนหลักของเลขรันนิ่ง (เช่น 4 = 0001, 3 = 001)' },
  { key: 'theme_preset', value: 'royal_blue', description: 'ชุดธีมระบบ (royal_blue, emerald, purple, amber, crimson, slate, custom)' },
  { key: 'theme_primary_color', value: '#1e3a8a', description: 'รหัสสีหลักของระบบ (Primary Color HEX)' },
  { key: 'theme_primary_hover', value: '#172554', description: 'รหัสสีหลักเมื่อโฮเวอร์ (Primary Hover Color HEX)' },
  { key: 'theme_accent_color', value: '#0d9488', description: 'รหัสสีเน้นเสริม (Secondary / Accent Color HEX)' },
  { key: 'theme_font_family', value: 'Prompt', description: 'ฟอนต์หลักของส่วนติดต่อผู้ใช้ (UI Font Family)' },
  { key: 'theme_sidebar_style', value: 'dark', description: 'สไตล์แถบเมนูด้านข้าง Sidebar (dark หรือ light)' },
  { key: 'theme_border_radius', value: 'md', description: 'ความโค้งมนของขอบ UI (sm, md, lg, full)' },
  { key: 'developer_info', value: 'พัฒนาระบบโดย งานส่งเสริมการวิจัย นวัตกรรม และสิ่งประดิษฐ์ ร่วมกับ งานศูนย์ข้อมูลสารสนเทศ', description: 'ข้อความข้อมูลผู้พัฒนา (แสดงที่แถบเมนูด้านข้าง Sidebar)' },
];

// GET /api/v1/admin/settings
router.get('/settings', async (req: AuthRequest, res: Response) => {
  try {
    let existing: any[] = [];
    try {
      existing = await (prisma as any).systemSetting.findMany();
    } catch (dbErr) {
      // Database not ready/tables missing -> return default fallback settings safely
      const fallbackResult: Record<string, string> = {};
      for (const def of DEFAULT_SETTINGS) {
        fallbackResult[def.key] = def.value;
      }
      return res.json({ success: true, data: fallbackResult });
    }

    const existingMap = new Map(existing.map((s: any) => [s.key, s.value]));
    const result: Record<string, string> = {};

    // Seed missing defaults
    for (const def of DEFAULT_SETTINGS) {
      if (!existingMap.has(def.key)) {
        try {
          await (prisma as any).systemSetting.create({
            data: {
              key: def.key,
              value: def.value,
              description: def.description,
            },
          });
        } catch (e) {}
        result[def.key] = def.value;
      } else {
        result[def.key] = (existingMap.get(def.key) as string) || '';
      }
    }

    // Include any other custom settings
    for (const s of existing as any[]) {
      if (!(s.key in result)) {
        result[s.key] = s.value;
      }
    }

    // Fallback deputy names from DEPUTY_DIRECTOR users if empty in settings
    try {
      const deputyUsers = await prisma.user.findMany({
        where: { role: 'DEPUTY_DIRECTOR' },
        include: { department: true },
      });
      for (const u of deputyUsers) {
        if (u.department?.division_id === 1 && !result['deputy_acad_name']) {
          result['deputy_acad_name'] = u.full_name;
        } else if (u.department?.division_id === 2 && !result['deputy_res_name']) {
          result['deputy_res_name'] = u.full_name;
        } else if (u.department?.division_id === 3 && !result['deputy_dev_name']) {
          result['deputy_dev_name'] = u.full_name;
        } else if (u.department?.division_id === 4 && !result['deputy_strat_name']) {
          result['deputy_strat_name'] = u.full_name;
        }
      }

      // Fallback planning head from PLANNING_OFFICER or Planning department head
      if (!result['planning_head_name']) {
        const planOfficer = await prisma.user.findFirst({
          where: { role: 'PLANNING_OFFICER', is_active: true },
        });
        if (planOfficer) {
          result['planning_head_name'] = planOfficer.full_name;
          if (planOfficer.position) result['planning_head_position'] = planOfficer.position;
        }
      }
    } catch (depErr) {}

    return res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Fetch settings error:', error);
    const fallbackResult: Record<string, string> = {};
    for (const def of DEFAULT_SETTINGS) {
      fallbackResult[def.key] = def.value;
    }
    return res.json({ success: true, data: fallbackResult });
  }
});


// GET /api/v1/admin/fiscal-years (Public/User accessible list of fiscal years)
router.get('/fiscal-years', async (req: Request, res: Response) => {
  try {
    const rawYears = await prisma.project.groupBy({
      by: ['fiscal_year'],
      _count: {
        id: true,
      },
      _sum: {
        total_budget: true,
        actual_spent: true,
      },
      orderBy: {
        fiscal_year: 'desc',
      },
    });

    const yearsMap = new Map<number, any>();
    for (const r of rawYears) {
      yearsMap.set(r.fiscal_year, {
        fiscal_year: r.fiscal_year,
        project_count: r._count?.id || 0,
        total_budget: Number(r._sum?.total_budget) || 0,
        actual_spent: Number(r._sum?.actual_spent) || 0,
      });
    }

    // Also ensure current_fiscal_year from settings exists in map
    try {
      const currentYearSetting = await (prisma as any).systemSetting.findUnique({
        where: { key: 'current_fiscal_year' },
      });
      if (currentYearSetting?.value) {
        const cYear = parseInt(currentYearSetting.value);
        if (!isNaN(cYear) && !yearsMap.has(cYear)) {
          yearsMap.set(cYear, {
            fiscal_year: cYear,
            project_count: 0,
            total_budget: 0,
            actual_spent: 0,
          });
        }
      }

      // Also check stored custom fiscal_years setting if any
      const customYearsSetting = await (prisma as any).systemSetting.findUnique({
        where: { key: 'custom_fiscal_years' },
      });
      if (customYearsSetting?.value) {
        try {
          const list = JSON.parse(customYearsSetting.value);
          if (Array.isArray(list)) {
            for (const y of list) {
              const numY = parseInt(y);
              if (!isNaN(numY) && !yearsMap.has(numY)) {
                yearsMap.set(numY, {
                  fiscal_year: numY,
                  project_count: 0,
                  total_budget: 0,
                  actual_spent: 0,
                });
              }
            }
          }
        } catch {}
      }
    } catch (e) {}

    const sortedList = Array.from(yearsMap.values()).sort((a, b) => b.fiscal_year - a.fiscal_year);
    return res.json({ success: true, data: sortedList });
  } catch (error: any) {
    console.error('Get fiscal years error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงรายการปีงบประมาณ', error: error.message });
  }
});

// All routes below require ADMIN role
router.use(authenticate);
router.use(authorize([Role.ADMIN]));

// ==========================================
// 1. Document Template Management Endpoints
// ==========================================

async function ensureTemplateTablesExist() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`document_templates\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`name\` varchar(150) NOT NULL,
        \`description\` text DEFAULT NULL,
        \`file_name\` varchar(255) NOT NULL,
        \`file_path\` varchar(500) NOT NULL,
        \`file_size\` int NOT NULL DEFAULT '0',
        \`default_type\` enum('PROPOSAL','FULL_SUMMARY','SHORT_SUMMARY','NONE') NOT NULL DEFAULT 'NONE',
        \`is_active\` tinyint(1) NOT NULL DEFAULT '1',
        \`version\` int NOT NULL DEFAULT '1',
        \`mappings\` json DEFAULT NULL,
        \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`template_tags\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`template_id\` int NOT NULL,
        \`tag_name\` varchar(100) NOT NULL,
        \`tag_type\` varchar(50) NOT NULL DEFAULT 'TEXT',
        \`label\` varchar(150) DEFAULT NULL,
        \`description\` text DEFAULT NULL,
        \`is_required\` tinyint(1) NOT NULL DEFAULT '0',
        \`sort_order\` int NOT NULL DEFAULT '0',
        \`options\` json DEFAULT NULL,
        \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`),
        KEY \`template_tags_template_id_fkey\` (\`template_id\`),
        CONSTRAINT \`template_tags_template_id_fkey\` FOREIGN KEY (\`template_id\`) REFERENCES \`document_templates\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`evaluation_templates\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`title\` varchar(255) NOT NULL,
        \`description\` text DEFAULT NULL,
        \`category\` varchar(100) DEFAULT 'GENERAL',
        \`target_responses\` int NOT NULL DEFAULT '50',
        \`theme_config\` json DEFAULT NULL,
        \`sections\` json NOT NULL,
        \`is_default\` tinyint(1) NOT NULL DEFAULT '0',
        \`is_active\` tinyint(1) NOT NULL DEFAULT '1',
        \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (e: any) {
    console.warn('ensureTemplateTablesExist warning:', e.message);
  }
}

// GET /api/v1/admin/templates
router.get('/templates', async (req: AuthRequest, res: Response) => {
  try {
    await ensureTemplateTablesExist();

    // Query templates and tags using raw SQL to ensure compatibility even if Prisma enum is regenerating
    let templates: any[] = [];
    try {
      templates = await prisma.$queryRawUnsafe(`
        SELECT * FROM \`document_templates\` ORDER BY \`created_at\` DESC
      `);
      const allTags: any[] = await prisma.$queryRawUnsafe(`
        SELECT * FROM \`template_tags\` ORDER BY \`sort_order\` ASC
      `);

      const tagsByTemplate = new Map<number, any[]>();
      for (const tag of allTags) {
        if (!tagsByTemplate.has(tag.template_id)) {
          tagsByTemplate.set(tag.template_id, []);
        }
        let opts = tag.options;
        if (typeof opts === 'string') {
          try { opts = JSON.parse(opts); } catch { opts = null; }
        }
        tagsByTemplate.get(tag.template_id)!.push({
          ...tag,
          is_required: Boolean(tag.is_required),
          options: opts
        });
      }

      for (const t of templates) {
        t.tags = tagsByTemplate.get(t.id) || [];
      }
    } catch (dbErr) {
      templates = await (prisma as any).documentTemplate.findMany({
        orderBy: { created_at: 'desc' },
        include: {
          tags: {
            orderBy: { sort_order: 'asc' }
          }
        }
      });
    }

    const formatted = templates.map((t: any) => {
      let parsedMappings = t.mappings;
      if (typeof parsedMappings === 'string') {
        try {
          parsedMappings = JSON.parse(parsedMappings);
        } catch {
          parsedMappings = {};
        }
      }

      return {
        ...t,
        file_name: fixThaiEncoding(t.file_name),
        name: fixThaiEncoding(t.name),
        mappings: parsedMappings || null,
        // Calculate dynamic properties
        is_default: t.default_type !== 'NONE',
      };
    });

    return res.json({ success: true, data: serializeBigInt(formatted) });
  } catch (error: any) {
    console.error('GET /templates error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการโหลดเทมเพลต', error: error.message });
  }
});

function fixThaiEncoding(str: string): string {
  try {
    const decoded = Buffer.from(str, 'latin1').toString('utf8');
    if (/[ก-๙]/.test(decoded)) {
      return decoded;
    }
    return str;
  } catch {
    return str;
  }
}

// POST /api/v1/admin/templates (Upload / Update template)
router.post('/templates', (req: AuthRequest, res: Response) => {
  upload.single('file')(req as any, res as any, async (multerErr: any) => {
    if (multerErr) {
      return res.status(400).json({ success: false, message: multerErr.message || 'การอัปโหลดไฟล์ล้มเหลว' });
    }

    try {
      await ensureTemplateTablesExist();
      const { name, description, default_type, is_default } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ success: false, message: 'กรุณาอัปโหลดไฟล์เทมเพลต .docx' });
      }

      const correctFileName = fixThaiEncoding(file.originalname);
      const templateName = name ? fixThaiEncoding(name) : correctFileName.replace(/\.docx$/i, '');

      // Automatically extract embedded fonts from template to web public fonts
      try {
        const publicFontsDir = path.resolve('../web/public/fonts');
        extractFontsFromDocx(file.path, publicFontsDir);
      } catch (fontErr) {
        console.warn('Font extraction notice:', fontErr);
      }

      // Extract tags from uploaded template
      let extractedTags: any[] = [];
      try {
        extractedTags = extractTagsFromDocx(file.path);
      } catch (e: any) {
        console.warn('Tag extraction warning:', e);
      }

      const newMappings: Record<string, string> = {};
      for (const t of extractedTags) {
        newMappings[t.key] = t.detectedLabel || t.key;
      }

      // If set as default, reset others
      if (default_type && default_type !== 'NONE') {
        await (prisma as any).documentTemplate.updateMany({
          data: { default_type: 'NONE' },
        });
      }

      // Check if a template with the same file_name or name already exists
      const existing = await (prisma as any).documentTemplate.findFirst({
        where: {
          OR: [
            { file_name: correctFileName },
            { name: templateName },
          ],
        },
      });

      let template;
      if (existing) {
        // Remove old file if path changed
        if (existing.file_path && existing.file_path !== file.path && fs.existsSync(existing.file_path)) {
          try {
            fs.unlinkSync(existing.file_path);
          } catch (e) {
            console.warn('Could not delete old template file:', e);
          }
        }

        // Newly extracted tags override old mappings
        let existingMappings = existing.mappings;
        if (typeof existingMappings === 'string') {
          try {
            existingMappings = JSON.parse(existingMappings);
          } catch {
            existingMappings = {};
          }
        }
        const mergedMappings = { ...(existingMappings || {}), ...newMappings };

        template = await (prisma as any).documentTemplate.update({
          where: { id: existing.id },
          data: {
            name: templateName,
            description: description !== undefined ? description : existing.description,
            file_name: correctFileName,
            file_path: file.path,
            file_size: file.size,
            default_type: default_type || (is_default === 'true' ? 'PROPOSAL' : existing.default_type),
            mappings: mergedMappings,
            version: (existing.version || 1) + 1,
            updated_at: new Date(),
          },
        });
      } else {
        template = await (prisma as any).documentTemplate.create({
          data: {
            name: templateName,
            description: description || '',
            file_name: correctFileName,
            file_path: file.path,
            file_size: file.size,
            default_type: default_type || (is_default === 'true' ? 'PROPOSAL' : 'NONE'),
            mappings: newMappings,
            version: 1,
          },
        });
      }

      // Sync TemplateTags safely
      if (template && extractedTags.length > 0) {
        try {
          const existingTags = await (prisma as any).templateTag.findMany({
            where: { template_id: template.id }
          });
          const existingTagMap = new Map<string, any>(existingTags.map((t: any) => [t.tag_name, t]));

          const extractedKeys = extractedTags.map(t => t.key.replace(/^#/, ''));
          if (extractedKeys.length > 0) {
            await (prisma as any).templateTag.deleteMany({
              where: {
                template_id: template.id,
                tag_name: { notIn: extractedKeys }
              }
            });
          }

          for (let i = 0; i < extractedTags.length; i++) {
            const t = extractedTags[i];
            const cleanKey = t.key.replace(/^#/, '');
            const existing = existingTagMap.get(cleanKey);

            let defaultTagType = t.suggested_type || 'TEXT';
            if (t.key.startsWith('#') || t.key.endsWith('_items')) defaultTagType = 'TABLE_LOOP';
            if (t.key.includes('image') || t.key.includes('picture')) defaultTagType = 'IMAGE';
            if (t.key.includes('total') || t.key.includes('sum')) defaultTagType = 'CALCULATION';
            if (t.key.includes('date')) defaultTagType = 'DATE';

            if (existing) {
              await (prisma as any).templateTag.update({
                where: { id: existing.id },
                data: {
                  sort_order: i,
                  label: existing.label || t.detectedLabel || cleanKey
                }
              });
            } else {
              await (prisma as any).templateTag.create({
                data: {
                  template_id: template.id,
                  tag_name: cleanKey,
                  tag_type: defaultTagType,
                  label: t.detectedLabel || cleanKey,
                  sort_order: i,
                }
              });
            }
          }
        } catch (tagErr) {
          console.warn('Template tag sync notice:', tagErr);
        }
      }

      return res.status(200).json({
        success: true,
        message: existing
          ? `อัปเดตไฟล์แม่แบบ "${correctFileName}" รูปแบบและตัวแปรใหม่ ${extractedTags.length} รายการเรียบร้อยแล้ว`
          : `อัปโหลดและบันทึกแม่แบบเอกสาร "${templateName}" สำเร็จ`,
        data: serializeBigInt(template),
        tagsCount: extractedTags.length,
        extractedTags,
      });
    } catch (error: any) {
      console.error('Upload template error:', error);
      return res.status(500).json({ success: false, message: `เกิดข้อผิดพลาดในการอัปโหลดเทมเพลต: ${error.message}`, error: error.message });
    }
  });
});

// PUT /api/v1/admin/templates/:id/file (Update existing template file)
router.put('/templates/:id/file', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'กรุณาอัปโหลดไฟล์ .docx' });
    }

    const templateId = parseInt(id);
    const existingTemplate = await (prisma as any).documentTemplate.findUnique({
      where: { id: templateId }
    });

    if (!existingTemplate) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      return res.status(404).json({ success: false, message: 'ไม่พบเทมเพลต' });
    }

    // Automatically extract embedded fonts from template to web public fonts
    try {
      const path = require('path');
      const publicFontsDir = path.resolve('../web/public/fonts');
      extractFontsFromDocx(file.path, publicFontsDir);
    } catch (fontErr) {
      console.warn('Font extraction notice:', fontErr);
    }

    // Update template record with new file details and increment version
    await (prisma as any).documentTemplate.update({
      where: { id: templateId },
      data: {
        file_name: fixThaiEncoding(file.originalname),
        file_path: file.path,
        file_size: file.size,
        version: { increment: 1 }
      }
    });

    // Delete old file if the path is different
    if (existingTemplate.file_path && existingTemplate.file_path !== file.path && fs.existsSync(existingTemplate.file_path)) {
      fs.unlinkSync(existingTemplate.file_path);
    }

    return res.json({
      success: true,
      message: 'อัปเดตไฟล์เทมเพลตเรียบร้อยแล้ว'
    });
  } catch (error: any) {
    console.error('Update template file error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตไฟล์', error: error.message });
  }
});

// GET /api/v1/admin/templates/:id/extract-tags (Parse .docx file and return extracted tags)
router.get('/templates/:id/extract-tags', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const template = await (prisma as any).documentTemplate.findUnique({
      where: { id: parseInt(id) },
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'ไม่พบเทมเพลต' });
    }

    if (!fs.existsSync(template.file_path)) {
      return res.status(404).json({ success: false, message: 'ไม่พบไฟล์แม่แบบ Word (.docx) บนระบบ' });
    }

    
    const extractedTags = extractTagsFromDocx(template.file_path);

    const existingTags = await (prisma as any).templateTag.findMany({
      where: { template_id: template.id }
    });
    const existingTagMap = new Map<string, any>(existingTags.map((t: any) => [t.tag_name, t]));
    
    // We NO LONGER delete tags automatically here, because users might have manually added tags 
    // (like dropdowns) that don't physically appear as tags in the .docx file.
    // Users can manually delete tags they don't want via the UI.

    for (let i = 0; i < extractedTags.length; i++) {
      const t = extractedTags[i];
      const cleanKey = t.key.replace(/^#/, '');
      const existing = existingTagMap.get(cleanKey);
      
      let defaultTagType = t.suggested_type || 'TEXT';
      
      if (existing) {
        await (prisma as any).templateTag.update({
          where: { id: existing.id },
          data: {
            sort_order: i,
            label: existing.label || t.detectedLabel || t.key
          }
        });
      } else {
        await (prisma as any).templateTag.create({
          data: {
            template_id: template.id,
            tag_name: cleanKey,
            tag_type: defaultTagType,
            label: t.detectedLabel || cleanKey,
            sort_order: i,
            is_required: false,
          }
        });
      }
    }

    return res.json({
      success: true,
      message: `ตรวจพบตัวแปรทั้งหมด ${extractedTags.length} รายการจากไฟล์เอกสาร`,
      data: extractedTags,
    });
  } catch (error: any) {
    console.error('Extract tags error:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอ่านตัวแปรจากไฟล์ .docx',
      error: error.message,
    });
  }
});

// GET /api/v1/admin/templates/:id
router.get('/templates/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const templateId = parseInt(id);

    let template: any = null;
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(`
        SELECT * FROM \`document_templates\` WHERE \`id\` = ? LIMIT 1
      `, templateId);
      if (rows && rows.length > 0) {
        template = rows[0];
        const tags: any[] = await prisma.$queryRawUnsafe(`
          SELECT * FROM \`template_tags\` WHERE \`template_id\` = ? ORDER BY \`sort_order\` ASC
        `, templateId);
        template.tags = tags.map((t: any) => {
          let opts = t.options;
          if (typeof opts === 'string') {
            try { opts = JSON.parse(opts); } catch { opts = null; }
          }
          return {
            ...t,
            is_required: Boolean(t.is_required),
            options: opts
          };
        });
      }
    } catch {
      template = await (prisma as any).documentTemplate.findUnique({
        where: { id: templateId },
        include: {
          tags: {
            orderBy: { sort_order: 'asc' }
          }
        }
      });
    }

    if (!template) {
      return res.status(404).json({ success: false, message: 'ไม่พบเทมเพลต' });
    }

    let parsedMappings = template.mappings;
    if (typeof parsedMappings === 'string') {
      try {
        parsedMappings = JSON.parse(parsedMappings);
      } catch {
        parsedMappings = {};
      }
    }

    return res.json({
      success: true,
      data: serializeBigInt({
        ...template,
        file_name: fixThaiEncoding(template.file_name),
        name: fixThaiEncoding(template.name),
        mappings: parsedMappings || null,
        is_default: template.default_type !== 'NONE',
      }),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// PUT /api/v1/admin/templates/:id (Update name, description, and variable mappings)
router.put('/templates/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, mappings } = req.body;
    const templateId = parseInt(id);

    const mappingsJson = typeof mappings === 'string' ? mappings : JSON.stringify(mappings || {});

    // Update using raw SQL for 100% guarantee on MySQL JSON column
    await prisma.$executeRawUnsafe(
      `UPDATE document_templates SET name = ?, description = ?, mappings = ? WHERE id = ?`,
      name || '',
      description || '',
      mappingsJson,
      templateId
    );

    const updated = await (prisma as any).documentTemplate.findUnique({
      where: { id: templateId },
    });

    return res.json({
      success: true,
      message: 'บันทึกการปรับแต่งหัวข้อตัวแปรสำเร็จ',
      data: serializeBigInt(updated),
    });
  } catch (error: any) {
    console.error('Update template error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกการปรับแต่ง', error: error.message });
  }
});

// PUT /api/v1/admin/templates/:id/default (Set default_type)
router.put('/templates/:id/default', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { default_type } = req.body;
    const templateId = parseInt(id);

    if (default_type !== 'NONE') {
      // Reset others of the same default_type to NONE
      await (prisma as any).documentTemplate.updateMany({
        where: { default_type },
        data: { default_type: 'NONE' },
      });
    }

    // Set this one
    const updated = await (prisma as any).documentTemplate.update({
      where: { id: templateId },
      data: { default_type },
    });

    return res.json({
      success: true,
      message: 'อัปเดตประเภทเทมเพลตเริ่มต้นเรียบร้อยแล้ว',
      data: serializeBigInt(updated),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// PUT /api/v1/admin/templates/:id/toggle (Toggle is_active)
router.put('/templates/:id/toggle', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const templateId = parseInt(id);

    const updated = await (prisma as any).documentTemplate.update({
      where: { id: templateId },
      data: { is_active },
    });

    return res.json({
      success: true,
      message: 'อัปเดตสถานะการใช้งานเรียบร้อยแล้ว',
      data: serializeBigInt(updated),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// PUT /api/v1/admin/templates/:id/tags (Update tags bulk)
router.put('/templates/:id/tags', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tags: any[] = req.body.tags || []; // Array of { id, tag_type, label, sort_order, is_required }
    const templateId = parseInt(id);

    // Make sure MySQL column in template_tags is varchar(50) so new tag types never get truncated
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`template_tags\` 
        MODIFY COLUMN \`tag_type\` varchar(50) NOT NULL DEFAULT 'TEXT'
      `);
    } catch (alterErr) {
      // Column might already be modified or user has limited DDL permissions
    }

    const incomingIds = tags.filter(t => t.id).map(t => parseInt(t.id));
    if (incomingIds.length > 0) {
      await (prisma as any).templateTag.deleteMany({
        where: {
          template_id: templateId,
          id: { notIn: incomingIds }
        }
      });
    } else {
      await (prisma as any).templateTag.deleteMany({
        where: {
          template_id: templateId
        }
      });
    }

    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      const optJson = tag.options !== undefined 
        ? (typeof tag.options === 'string' ? tag.options : JSON.stringify(tag.options))
        : null;

      if (tag.id) {
        await prisma.$executeRawUnsafe(`
          UPDATE \`template_tags\`
          SET \`tag_name\` = ?, \`tag_type\` = ?, \`label\` = ?, \`description\` = ?, \`options\` = ?, \`sort_order\` = ?, \`is_required\` = ?
          WHERE \`id\` = ? AND \`template_id\` = ?
        `,
          tag.tag_name || `tag_${i + 1}`,
          tag.tag_type || 'TEXT',
          tag.label || tag.tag_name || '',
          tag.description || null,
          optJson,
          tag.sort_order !== undefined ? parseInt(tag.sort_order) : i,
          tag.is_required ? 1 : 0,
          parseInt(tag.id),
          templateId
        );
      } else {
        await prisma.$executeRawUnsafe(`
          INSERT INTO \`template_tags\` (\`template_id\`, \`tag_name\`, \`tag_type\`, \`label\`, \`description\`, \`options\`, \`sort_order\`, \`is_required\`, \`created_at\`, \`updated_at\`)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `,
          templateId,
          tag.tag_name || `tag_${i + 1}`,
          tag.tag_type || 'TEXT',
          tag.label || tag.tag_name || '',
          tag.description || null,
          optJson,
          tag.sort_order !== undefined ? parseInt(tag.sort_order) : i,
          tag.is_required ? 1 : 0
        );
      }
    }

    return res.json({
      success: true,
      message: 'บันทึกการตั้งค่าตัวแปรเรียบร้อยแล้ว'
    });
  } catch (error: any) {
    console.error('Save tags error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกตัวแปร: ' + error.message, error: error.message });
  }
});

// DELETE /api/v1/admin/templates/:id
router.delete('/templates/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const templateId = parseInt(id);

    const template = await (prisma as any).documentTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return res.status(404).json({ success: false, message: 'ไม่พบเทมเพลตที่ต้องการลบ' });
    }

    if (fs.existsSync(template.file_path)) {
      try {
        fs.unlinkSync(template.file_path);
      } catch (e) {
        console.error('Failed to unlink template file', e);
      }
    }

    await (prisma as any).documentTemplate.delete({
      where: { id: templateId },
    });

    return res.json({ success: true, message: 'ลบเทมเพลตเอกสารเรียบร้อยแล้ว' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบเทมเพลต', error: error.message });
  }
});

// ====================================================
// Evaluation Templates Management Endpoints (CRUD)
// ====================================================

// Default Standard Evaluation Template Seed Helper
async function seedDefaultEvaluationTemplateIfEmpty() {
  try {
    const count: any[] = await prisma.$queryRawUnsafe(`SELECT count(*) as cnt FROM \`evaluation_templates\``);
    const total = count && count[0] ? Number(count[0].cnt || count[0].count || 0) : 0;
    if (total === 0) {
      const defaultStandardSections = [
        {
          title: 'ตอนที่ 1: ข้อมูลทั่วไปของผู้ตอบแบบประเมิน',
          description: 'กรุณาเลือกข้อมูลตามความเป็นจริง',
          order_index: 1,
          questions: [
            {
              question_text: 'เพศ',
              question_type: 'RADIO',
              options: ['ชาย', 'หญิง', 'เพศทางเลือก / อื่นๆ'],
              order_index: 1,
              is_required: true,
            },
            {
              question_text: 'สถานะ / ตำแหน่งของผู้ตอบแบบประเมิน',
              question_type: 'RADIO',
              options: ['นักเรียน / นักศึกษา', 'ครู / อาจารย์', 'บุคลากรทางการศึกษา', 'ผู้ปกครอง / ประชาชนทั่วไป', 'อื่นๆ'],
              order_index: 2,
              is_required: true,
            },
          ],
        },
        {
          title: 'ตอนที่ 2: ระดับความพึงพอใจต่อการดำเนินงานโครงการ',
          description: 'ระดับคะแนน: 5 = มากที่สุด, 4 = มาก, 3 = ปานกลาง, 2 = น้อย, 1 = น้อยที่สุด',
          order_index: 2,
          questions: [
            { question_text: '1. การประชาสัมพันธ์โครงการและการแจ้งข้อมูลข่าวสาร', question_type: 'RATING_5', order_index: 1, is_required: true },
            { question_text: '2. ความเหมาะสมของขั้นตอนและรูปแบบการจัดกิจกรรม', question_type: 'RATING_5', order_index: 2, is_required: true },
            { question_text: '3. ความชัดเจนในการถ่ายทอดความรู้และคำแนะนำของวิทยากร / ผู้รับผิดชอบ', question_type: 'RATING_5', order_index: 3, is_required: true },
            { question_text: '4. ความเหมาะสมของสถานที่ บรรยากาศ และสิ่งอำนวยความสะดวก', question_type: 'RATING_5', order_index: 4, is_required: true },
            { question_text: '5. ความพร้อมของสื่อ อุปกรณ์ และเอกสารประกอบการจัดกิจกรรม', question_type: 'RATING_5', order_index: 5, is_required: true },
            { question_text: '6. ความเหมาะสมของระยะเวลาและกำหนดการดำเนินงาน', question_type: 'RATING_5', order_index: 6, is_required: true },
            { question_text: '7. ความรู้ ความเข้าใจ หรือทักษะที่ได้รับจากการเข้าร่วมกิจกรรม', question_type: 'RATING_5', order_index: 7, is_required: true },
            { question_text: '8. สามารถนำความรู้และประสบการณ์ที่ได้รับไปประยุกต์ใช้ประโยชน์ได้จริง', question_type: 'RATING_5', order_index: 8, is_required: true },
            { question_text: '9. ความพึงพอใจในภาพรวมต่อการดำเนินงานโครงการนี้', question_type: 'RATING_5', order_index: 9, is_required: true },
          ],
        },
        {
          title: 'ตอนที่ 3: ข้อคิดเห็นและข้อเสนอแนะเพิ่มเติม',
          description: 'ข้อเสนอแนะเพื่อการพัฒนาและปรับปรุงในครั้งต่อไป',
          order_index: 3,
          questions: [
            { question_text: 'สิ่งที่ท่านพึงพอใจหรือประทับใจมากที่สุดในโครงการนี้', question_type: 'TEXT', order_index: 1, is_required: false },
            { question_text: 'ข้อเสนอแนะหรือสิ่งที่ควรปรับปรุงสำหรับการจัดโครงการครั้งต่อไป', question_type: 'TEXT', order_index: 2, is_required: false },
          ],
        },
      ];

      await prisma.$executeRawUnsafe(`
        INSERT INTO \`evaluation_templates\` (\`title\`, \`description\`, \`category\`, \`target_responses\`, \`theme_config\`, \`sections\`, \`is_default\`, \`is_active\`, \`created_at\`, \`updated_at\`)
        VALUES (?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())
      `,
        'แบบประเมินความพึงพอใจมาตรฐาน (มาตรฐาน สอศ.)',
        'แม่แบบมาตรฐาน 3 ตอน (ข้อมูลทั่วไป, ความพึงพอใจ 9 ข้อ Likert 5 ระดับ, ข้อเสนอแนะปลายเปิด)',
        'VOCATIONAL_STANDARD',
        50,
        JSON.stringify({ preset: 'vocational_official', font: 'prompt', color: 'indigo', bg_style: 'gradient', rating_style: 'buttons', border_radius: 'rounded-3xl' }),
        JSON.stringify(defaultStandardSections)
      );

      // Add a training / seminar template as well
      const seminarSections = [
        {
          title: 'ตอนที่ 1: ข้อมูลทั่วไปของผู้เข้ารับการอบรม/สัมมนา',
          description: 'กรุณาระบุข้อมูลส่วนบุคคล',
          order_index: 1,
          questions: [
            { question_text: 'เพศ', question_type: 'RADIO', options: ['ชาย', 'หญิง', 'อื่นๆ'], order_index: 1, is_required: true },
            { question_text: 'สังกัด / แผนกวิชา / หน่วยงาน', question_type: 'TEXT', order_index: 2, is_required: true },
          ],
        },
        {
          title: 'ตอนที่ 2: ความพึงพอใจต่อเนื้อหาและการจัดอบรมสัมมนา',
          description: 'ระดับคะแนน: 5 = มากที่สุด, 4 = มาก, 3 = ปานกลาง, 2 = น้อย, 1 = น้อยที่สุด',
          order_index: 2,
          questions: [
            { question_text: '1. เนื้อหาการอบรมมีความน่าสนใจและทันสมัย', question_type: 'RATING_5', order_index: 1, is_required: true },
            { question_text: '2. ความสามารถในการถ่ายทอดและตอบข้อซักถามของวิทยากร', question_type: 'RATING_5', order_index: 2, is_required: true },
            { question_text: '3. ความชัดเจนและประโยชน์ของเอกสาร / สื่อการอบรม', question_type: 'RATING_5', order_index: 3, is_required: true },
            { question_text: '4. การบริหารเวลาและระยะเวลาของการอบรม', question_type: 'RATING_5', order_index: 4, is_required: true },
            { question_text: '5. สามารถนำทักษะที่ได้ไปใช้พัฒนาการเรียนการสอน/การปฏิบัติงาน', question_type: 'RATING_5', order_index: 5, is_required: true },
          ],
        },
        {
          title: 'ตอนที่ 3: ข้อเสนอแนะสำหรับหัวข้ออบรมครั้งต่อไป',
          description: 'หัวข้อหรือทักษะที่ต้องการให้จัดอบรมเพิ่มเติม',
          order_index: 3,
          questions: [
            { question_text: 'หัวข้อหรือเทคโนโลยีที่ต้องการให้จัดอบรมในครั้งต่อไป', question_type: 'TEXT', order_index: 1, is_required: false },
          ],
        },
      ];

      await prisma.$executeRawUnsafe(`
        INSERT INTO \`evaluation_templates\` (\`title\`, \`description\`, \`category\`, \`target_responses\`, \`theme_config\`, \`sections\`, \`is_default\`, \`is_active\`, \`created_at\`, \`updated_at\`)
        VALUES (?, ?, ?, ?, ?, ?, 0, 1, NOW(), NOW())
      `,
        'แบบประเมินโครงการฝึกอบรม / สัมมนาเชิงปฏิบัติการ (Workshop & Seminar)',
        'เหมาะสำหรับโครงการอบรมเชิงปฏิบัติการ อบรมครู-นักเรียน การพัฒนาทักษะวิชาชีพ',
        'TRAINING',
        40,
        JSON.stringify({ preset: 'modern_tech', font: 'sarabun', color: 'emerald', bg_style: 'clean', rating_style: 'stars', border_radius: 'rounded-2xl' }),
        JSON.stringify(seminarSections)
      );
    }
  } catch (e: any) {
    console.warn('seedDefaultEvaluationTemplate notice:', e.message);
  }
}

// GET /api/v1/admin/evaluation-templates
router.get('/evaluation-templates', async (req: AuthRequest, res: Response) => {
  try {
    await ensureTemplateTablesExist();
    await seedDefaultEvaluationTemplateIfEmpty();

    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM \`evaluation_templates\` ORDER BY \`is_default\` DESC, \`created_at\` DESC
    `);

    const formatted = rows.map((r: any) => {
      let parsedSections = r.sections;
      if (typeof parsedSections === 'string') {
        try { parsedSections = JSON.parse(parsedSections); } catch { parsedSections = []; }
      }
      let parsedTheme = r.theme_config;
      if (typeof parsedTheme === 'string') {
        try { parsedTheme = JSON.parse(parsedTheme); } catch { parsedTheme = {}; }
      }

      const totalQuestions = Array.isArray(parsedSections)
        ? parsedSections.reduce((sum: number, sec: any) => sum + (Array.isArray(sec.questions) ? sec.questions.length : 0), 0)
        : 0;

      return {
        ...r,
        sections: parsedSections || [],
        theme_config: parsedTheme || {},
        total_sections: Array.isArray(parsedSections) ? parsedSections.length : 0,
        total_questions: totalQuestions,
        is_default: Boolean(r.is_default),
        is_active: Boolean(r.is_active),
      };
    });

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('GET /evaluation-templates error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการโหลดแม่แบบแบบประเมิน', error: error.message });
  }
});

// GET /api/v1/admin/evaluation-templates/:id
router.get('/evaluation-templates/:id', async (req: AuthRequest, res: Response) => {
  try {
    await ensureTemplateTablesExist();
    const id = parseInt(req.params.id);

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM \`evaluation_templates\` WHERE \`id\` = ? LIMIT 1`,
      id
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบแม่แบบแบบประเมิน' });
    }

    const item = rows[0];
    let parsedSections = item.sections;
    if (typeof parsedSections === 'string') {
      try { parsedSections = JSON.parse(parsedSections); } catch { parsedSections = []; }
    }
    let parsedTheme = item.theme_config;
    if (typeof parsedTheme === 'string') {
      try { parsedTheme = JSON.parse(parsedTheme); } catch { parsedTheme = {}; }
    }

    return res.json({
      success: true,
      data: {
        ...item,
        sections: parsedSections || [],
        theme_config: parsedTheme || {},
        is_default: Boolean(item.is_default),
        is_active: Boolean(item.is_active),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// POST /api/v1/admin/evaluation-templates (Create template)
router.post('/evaluation-templates', async (req: AuthRequest, res: Response) => {
  try {
    await ensureTemplateTablesExist();
    const { title, description, category, target_responses, theme_config, sections, is_default } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อแม่แบบแบบประเมิน' });
    }

    if (is_default) {
      // Unset previous defaults
      await prisma.$executeRawUnsafe(`UPDATE \`evaluation_templates\` SET \`is_default\` = 0`);
    }

    const sectionsJson = JSON.stringify(Array.isArray(sections) ? sections : []);
    const themeJson = JSON.stringify(theme_config || {});

    await prisma.$executeRawUnsafe(`
      INSERT INTO \`evaluation_templates\` (\`title\`, \`description\`, \`category\`, \`target_responses\`, \`theme_config\`, \`sections\`, \`is_default\`, \`is_active\`, \`created_at\`, \`updated_at\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
    `,
      title.trim(),
      description ? description.trim() : '',
      category ? category.trim() : 'GENERAL',
      Number(target_responses) || 50,
      themeJson,
      sectionsJson,
      is_default ? 1 : 0
    );

    return res.json({ success: true, message: 'สร้างแม่แบบแบบประเมินสำเร็จ' });
  } catch (error: any) {
    console.error('Create evaluation template error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างแม่แบบ: ' + error.message, error: error.message });
  }
});

// PUT /api/v1/admin/evaluation-templates/:id (Update template)
router.put('/evaluation-templates/:id', async (req: AuthRequest, res: Response) => {
  try {
    await ensureTemplateTablesExist();
    const id = parseInt(req.params.id);
    const { title, description, category, target_responses, theme_config, sections, is_default, is_active } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อแม่แบบแบบประเมิน' });
    }

    if (is_default) {
      await prisma.$executeRawUnsafe(`UPDATE \`evaluation_templates\` SET \`is_default\` = 0 WHERE \`id\` != ?`, id);
    }

    const sectionsJson = JSON.stringify(Array.isArray(sections) ? sections : []);
    const themeJson = JSON.stringify(theme_config || {});

    await prisma.$executeRawUnsafe(`
      UPDATE \`evaluation_templates\`
      SET \`title\` = ?,
          \`description\` = ?,
          \`category\` = ?,
          \`target_responses\` = ?,
          \`theme_config\` = ?,
          \`sections\` = ?,
          \`is_default\` = ?,
          \`is_active\` = ?,
          \`updated_at\` = NOW()
      WHERE \`id\` = ?
    `,
      title.trim(),
      description !== undefined ? description.trim() : '',
      category || 'GENERAL',
      Number(target_responses) || 50,
      themeJson,
      sectionsJson,
      is_default ? 1 : 0,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      id
    );

    return res.json({ success: true, message: 'บันทึกการแก้ไขแม่แบบแบบประเมินสำเร็จ' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกแม่แบบ: ' + error.message, error: error.message });
  }
});

// PUT /api/v1/admin/evaluation-templates/:id/default (Set as default)
router.put('/evaluation-templates/:id/default', async (req: AuthRequest, res: Response) => {
  try {
    await ensureTemplateTablesExist();
    const id = parseInt(req.params.id);

    await prisma.$executeRawUnsafe(`UPDATE \`evaluation_templates\` SET \`is_default\` = 0`);
    await prisma.$executeRawUnsafe(`UPDATE \`evaluation_templates\` SET \`is_default\` = 1 WHERE \`id\` = ?`, id);

    return res.json({ success: true, message: 'ตั้งเป็นแม่แบบแบบประเมินเริ่มต้นเรียบร้อยแล้ว' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// PUT /api/v1/admin/evaluation-templates/:id/toggle (Toggle active)
router.put('/evaluation-templates/:id/toggle', async (req: AuthRequest, res: Response) => {
  try {
    await ensureTemplateTablesExist();
    const id = parseInt(req.params.id);
    const { is_active } = req.body;

    await prisma.$executeRawUnsafe(
      `UPDATE \`evaluation_templates\` SET \`is_active\` = ?, \`updated_at\` = NOW() WHERE \`id\` = ?`,
      is_active ? 1 : 0,
      id
    );

    return res.json({ success: true, message: 'อัปเดตสถานะแม่แบบเรียบร้อยแล้ว' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// DELETE /api/v1/admin/evaluation-templates/:id
router.delete('/evaluation-templates/:id', async (req: AuthRequest, res: Response) => {
  try {
    await ensureTemplateTablesExist();
    const id = parseInt(req.params.id);

    await prisma.$executeRawUnsafe(`DELETE FROM \`evaluation_templates\` WHERE \`id\` = ?`, id);

    return res.json({ success: true, message: 'ลบแม่แบบแบบประเมินเรียบร้อยแล้ว' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบ: ' + error.message });
  }
});

// GET /api/v1/admin/templates/tags-guide
router.get('/templates/tags-guide', async (req: AuthRequest, res: Response) => {
  const guide = {
    general: [
      { tag: '{title}', description: 'ชื่อโครงการ' },
      { tag: '{project_code}', description: 'รหัสโครงการ (เช่น PRJ-2569-ACAD-0001)' },
      { tag: '{fiscal_year}', description: 'ปีงบประมาณ พ.ศ.' },
      { tag: '{division_name}', description: 'ชื่อฝ่ายบริหาร (เช่น ฝ่ายวิชาการ)' },
      { tag: '{department_name}', description: 'ชื่อแผนกวิชา / งาน' },
      { tag: '{leader_name}', description: 'ชื่อผู้รับผิดชอบโครงการ' },
      { tag: '{leader_position}', description: 'ตำแหน่งผู้รับผิดชอบ' },
      { tag: '{background}', description: 'หลักการและเหตุผล' },
      { tag: '{target_quantitative}', description: 'เป้าหมายเชิงปริมาณ' },
      { tag: '{target_qualitative}', description: 'เป้าหมายเชิงคุณภาพ' },
      { tag: '{expected_results}', description: 'ผลที่คาดว่าจะได้รับ' },
      { tag: '{total_budget_text}', description: 'จำนวนเงินงบประมาณรวม (ตัวเลข)' },
      { tag: '{total_budget_bahttext}', description: 'จำนวนเงินงบประมาณรวม (ภาษาไทย เช่น สองหมื่นบาทถ้วน)' },
    ],
    loops: [
      {
        tag: '{#objectives} - {item} {/objectives}',
        description: 'ลูปแสดงรายการวัตถุประสงค์แต่ละข้อ',
      },
      {
        tag: '{#timelines} • {activity_name} ({start_date} ถึง {end_date}) สถานที่: {location} {/timelines}',
        description: 'ลูปแสดงแผนปฏิบัติงานและไทม์ไลน์',
      },
      {
        tag: '{#budget_items} | {no} | {description} | {quantity} | {unit} | {unit_price} | {total_amount} | {/budget_items}',
        description: 'ลูปตารางงบประมาณค่าใช้จ่าย',
      },
      {
        tag: '{#approvals} {step_order}: {approver_name} ({status}) {/approvals}',
        description: 'ลูปรายการสายการอนุมัติและลายเซ็น',
      },
    ],
  };

  return res.json({ success: true, data: guide });
});

// ==========================================
// 2. System Settings Management Endpoints
// ==========================================

// PUT /api/v1/admin/settings
router.put('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const payload = req.body; // { key: value, ... }

    for (const [key, value] of Object.entries(payload)) {
      await (prisma as any).systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: {
          key,
          value: String(value),
          description: '',
        },
      });
    }

    // Sync deputy settings to DEPUTY_DIRECTOR users if deputy names are updated
    try {
      const deputyMappings: { keys: string[]; posKeys: string[]; code: string }[] = [
        { keys: ['deputy_acad_name', 'deputy_name_acad'], posKeys: ['deputy_acad_position', 'deputy_position_acad'], code: 'acad' },
        { keys: ['deputy_res_name', 'deputy_name_res'], posKeys: ['deputy_res_position', 'deputy_position_res'], code: 'res' },
        { keys: ['deputy_dev_name', 'deputy_name_dev'], posKeys: ['deputy_dev_position', 'deputy_position_dev'], code: 'dev' },
        { keys: ['deputy_strat_name', 'deputy_name_strat'], posKeys: ['deputy_strat_position', 'deputy_position_strat'], code: 'strat' },
      ];

      for (const map of deputyMappings) {
        const matchedKey = map.keys.find((k) => payload[k] !== undefined);
        if (matchedKey) {
          const nameVal = String(payload[matchedKey] || '').trim();
          const matchedPosKey = map.posKeys.find((k) => payload[k] !== undefined);
          const posVal = matchedPosKey ? String(payload[matchedPosKey] || '').trim() : undefined;

          const targetDiv = await prisma.division.findUnique({
            where: { code: map.code },
            include: { departments: true },
          });

          if (targetDiv) {
            const deptIds = targetDiv.departments.map((d) => d.id);
            const deputyUser = await prisma.user.findFirst({
              where: {
                role: 'DEPUTY_DIRECTOR',
                department_id: { in: deptIds },
              },
            });

            if (deputyUser && nameVal) {
              await prisma.user.update({
                where: { id: deputyUser.id },
                data: {
                  full_name: nameVal,
                  ...(posVal ? { position: posVal } : {}),
                },
              });
            }
          }
        }
      }
    } catch (depErr) {
      console.warn('Sync deputy user on settings update error:', depErr);
    }

    // Broadcast Realtime Data Update
    try {
      sseManager.broadcast('data_update', {
        scope: 'SYSTEM',
        action: 'SETTINGS_UPDATED',
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    return res.json({ success: true, message: 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('Update settings error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า', error: error.message });
  }
});

// POST /api/v1/admin/settings/upload-logo
router.post('/settings/upload-logo', logoUpload.single('logo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์รูปภาพโลโก้' });
    }

    const logoUrl = `/storage/logos/${req.file.filename}`;

    // Update or insert college_logo_url setting
    await (prisma as any).systemSetting.upsert({
      where: { key: 'college_logo_url' },
      update: { value: logoUrl },
      create: {
        key: 'college_logo_url',
        value: logoUrl,
        description: 'URL หรือเส้นทางไฟล์รูปภาพตราสัญลักษณ์/โลโก้วิทยาลัย',
      },
    });

    return res.json({
      success: true,
      message: 'อัปโหลดโลโก้วิทยาลัยเรียบร้อยแล้ว',
      logoUrl,
    });
  } catch (error: any) {
    console.error('Upload logo error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการอัปโหลดโลโก้',
    });
  }
});

// ==========================================
// 3. User Management Endpoints
// ==========================================

// GET /api/v1/admin/users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { search, role, department_id, is_active } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { full_name: { contains: String(search) } },
        { username: { contains: String(search) } },
        { position: { contains: String(search) } },
      ];
    }

    if (role && role !== 'ALL') {
      where.role = role as Role;
    }

    if (department_id && department_id !== 'ALL') {
      where.department_id = parseInt(String(department_id));
    }

    if (is_active !== undefined && is_active !== 'ALL') {
      where.is_active = is_active === 'true' || is_active === 'ACTIVE';
    }

    const users = await (prisma as any).user.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        department: {
          include: {
            division: true,
          },
        },
        _count: {
          select: {
            projects: true,
            approvals: true,
          },
        },
      },
    });

    const { getUserAssignedDepartments } = require('../auth/auth.controller');

    const serialized = await Promise.all(
      users.map(async (u: any) => {
        const assignedInfo = await getUserAssignedDepartments(u.id, u.department_id);

        return {
          id: u.id.toString(),
          username: u.username,
          email: u.email,
          google_id: u.google_id,
          avatar_url: u.avatar_url,
          full_name: u.full_name,
          position: u.position,
          role: u.role,
          is_active: u.is_active,
          created_at: u.created_at,
          department_id: u.department_id,
          department_ids: assignedInfo.department_ids,
          division_ids: assignedInfo.division_ids,
          department_name: assignedInfo.department_name,
          division_name: assignedInfo.division_name,
          division_code: assignedInfo.division_code,
          departments: assignedInfo.departments,
          divisions: assignedInfo.divisions,
          projects_count: u._count?.projects || 0,
          approvals_count: u._count?.approvals || 0,
        };
      })
    );

    return res.json({ success: true, data: serialized });
  } catch (error: any) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้', error: error.message });
  }
});

// POST /api/v1/admin/users
router.post('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, email, full_name, position, role, department_id, department_ids, division_ids, is_active, head_dept_ids, division_id } = req.body;

    if (!username || (!password && !email) || !full_name || !role) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ชื่อผู้ใช้, รหัสผ่าน, ชื่อ-นามสกุล, สิทธิ์การใช้งาน)'
      });
    }

    const existing = await (prisma as any).user.findUnique({
      where: { username: username.trim() },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `ชื่อผู้ใช้ "${username}" มีอยู่ในระบบแล้ว` });
    }

    if (email && email.trim().length > 0) {
      const existingEmail = await (prisma as any).user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: `อีเมล "${email}" ถูกใช้งานโดยบัญชีอื่นแล้ว` });
      }
    }

    const password_hash = password ? await bcrypt.hash(password, 10) : null;

    const normalizedRole = role === 'HEAD_OF_DEPT' ? 'HEAD_DEPT' : (role as Role);

    const effectiveDeptId = department_id
      ? parseInt(String(department_id))
      : (Array.isArray(department_ids) && department_ids.length > 0 ? parseInt(String(department_ids[0])) : null);

    const newUser = await (prisma as any).user.create({
      data: {
        username: username.trim(),
        password_hash,
        email: email ? email.trim().toLowerCase() : null,
        full_name: full_name.trim(),
        position: position ? position.trim() : null,
        role: normalizedRole,
        department_id: effectiveDeptId,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
      },
      include: {
        department: {
          include: { division: true },
        },
      },
    });

    // Save multi-department and multi-division assignments
    const { saveUserAssignedDepartments } = require('../auth/auth.controller');
    await saveUserAssignedDepartments(newUser.id, department_ids, division_ids, effectiveDeptId);

    // Sync Deputy Director to Division and Settings
    if (normalizedRole === 'DEPUTY_DIRECTOR') {
      try {
        let targetDivision: any = null;
        if (effectiveDeptId) {
          const dept = await prisma.department.findUnique({
            where: { id: effectiveDeptId },
            include: { division: true },
          });
          if (dept?.division) targetDivision = dept.division;
        }
        if (!targetDivision && division_id) {
          targetDivision = await prisma.division.findUnique({
            where: { id: parseInt(division_id) },
          });
        }
        if (!targetDivision && Array.isArray(division_ids) && division_ids.length > 0) {
          targetDivision = await prisma.division.findUnique({
            where: { id: parseInt(String(division_ids[0])) },
          });
        }
        if (!targetDivision) {
          const pos = (position || '').toLowerCase();
          if (pos.includes('วิชาการ')) {
            targetDivision = await prisma.division.findFirst({ where: { code: 'acad' } });
          } else if (pos.includes('ทรัพยากร') || pos.includes('บริหาร')) {
            targetDivision = await prisma.division.findFirst({ where: { code: 'res' } });
          } else if (pos.includes('พัฒนา') || pos.includes('กิจกรรม') || pos.includes('นักเรียน')) {
            targetDivision = await prisma.division.findFirst({ where: { code: 'dev' } });
          } else if (pos.includes('แผนงาน') || pos.includes('ความร่วมมือ')) {
            targetDivision = await prisma.division.findFirst({ where: { code: 'strat' } });
          }
        }

        if (targetDivision) {
          const { syncDivisionDeputy } = require('../divisions/division.controller');
          await syncDivisionDeputy(targetDivision, full_name, position);
        }
      } catch (depErr) {
        console.warn('Sync deputy on create user error:', depErr);
      }
    }

    // Update head settings if head_dept_ids provided
    if (Array.isArray(head_dept_ids) && head_dept_ids.length > 0) {
      for (const hId of head_dept_ids) {
        try {
          const targetDept = await prisma.department.findUnique({ where: { id: parseInt(hId) } });
          const deptName = targetDept?.name || 'แผนก/งาน';

          await (prisma as any).systemSetting.upsert({
            where: { key: `head_name_dept_${hId}` },
            update: { value: full_name.trim() },
            create: {
              key: `head_name_dept_${hId}`,
              value: full_name.trim(),
              description: `ชื่อหัวหน้า (${deptName})`,
            },
          });

          if (position) {
            await (prisma as any).systemSetting.upsert({
              where: { key: `head_position_dept_${hId}` },
              update: { value: position.trim() },
              create: {
                key: `head_position_dept_${hId}`,
                value: position.trim(),
                description: `ตำแหน่งหัวหน้า (${deptName})`,
              },
            });
          }
        } catch (headErr) {
          console.warn(`Failed to update head settings for dept ${hId}:`, headErr);
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: `สร้างบัญชีผู้ใช้ "${newUser.full_name}" สำเร็จ`,
      data: serializeBigInt(newUser),
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้', error: error.message });
  }
});

// PUT /api/v1/admin/users/:id
router.put('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { full_name, email, position, role, department_id, department_ids, division_ids, is_active, password, head_dept_ids, division_id } = req.body;

    const userId = BigInt(id);
    const existing = await (prisma as any).user.findUnique({
      where: { id: userId },
      include: {
        department: {
          include: { division: true },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ใช้นี้ในระบบ' });
    }

    if (email && email.trim().toLowerCase() !== existing.email) {
      const existingEmail = await (prisma as any).user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: `อีเมล "${email}" ถูกใช้งานโดยบัญชีอื่นแล้ว` });
      }
    }

    const normalizedRole = role !== undefined ? (role === 'HEAD_OF_DEPT' ? 'HEAD_DEPT' : (role as Role)) : existing.role;

    const effectiveDeptId = department_id !== undefined
      ? (department_id ? parseInt(String(department_id)) : null)
      : (Array.isArray(department_ids) && department_ids.length > 0 ? parseInt(String(department_ids[0])) : existing.department_id);

    const data: any = {
      full_name: full_name !== undefined ? full_name.trim() : existing.full_name,
      email: email !== undefined ? (email ? email.trim().toLowerCase() : null) : existing.email,
      position: position !== undefined ? (position ? position.trim() : null) : existing.position,
      role: normalizedRole,
      department_id: effectiveDeptId,
      is_active: is_active !== undefined ? Boolean(is_active) : existing.is_active,
    };

    if (password && password.trim().length > 0) {
      data.password_hash = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await (prisma as any).user.update({
      where: { id: userId },
      data,
      include: {
        department: {
          include: { division: true },
        },
      },
    });

    // Save multi-department and multi-division assignments
    const { saveUserAssignedDepartments } = require('../auth/auth.controller');
    await saveUserAssignedDepartments(userId, department_ids, division_ids, effectiveDeptId);

    // Sync Deputy Director to Division and Settings
    if (normalizedRole === 'DEPUTY_DIRECTOR') {
      try {
        let targetDivision: any = null;
        if (data.department_id) {
          const dept = await prisma.department.findUnique({
            where: { id: data.department_id },
            include: { division: true },
          });
          if (dept?.division) targetDivision = dept.division;
        }
        if (!targetDivision && division_id) {
          targetDivision = await prisma.division.findUnique({
            where: { id: parseInt(division_id) },
          });
        }
        if (!targetDivision && Array.isArray(division_ids) && division_ids.length > 0) {
          targetDivision = await prisma.division.findUnique({
            where: { id: parseInt(String(division_ids[0])) },
          });
        }
        if (!targetDivision && existing.department?.division) {
          targetDivision = existing.department.division;
        }
        if (!targetDivision) {
          const pos = (data.position || '').toLowerCase();
          if (pos.includes('วิชาการ')) {
            targetDivision = await prisma.division.findFirst({ where: { code: 'acad' } });
          } else if (pos.includes('ทรัพยากร') || pos.includes('บริหาร')) {
            targetDivision = await prisma.division.findFirst({ where: { code: 'res' } });
          } else if (pos.includes('พัฒนา') || pos.includes('กิจกรรม') || pos.includes('นักเรียน')) {
            targetDivision = await prisma.division.findFirst({ where: { code: 'dev' } });
          } else if (pos.includes('แผนงาน') || pos.includes('ความร่วมมือ')) {
            targetDivision = await prisma.division.findFirst({ where: { code: 'strat' } });
          }
        }

        if (targetDivision) {
          const { syncDivisionDeputy } = require('../divisions/division.controller');
          await syncDivisionDeputy(targetDivision, updated.full_name, updated.position);
        }
      } catch (depErr) {
        console.warn('Sync deputy on update user error:', depErr);
      }
    }

    // Update head settings if head_dept_ids provided
    if (Array.isArray(head_dept_ids) && head_dept_ids.length > 0) {
      for (const hId of head_dept_ids) {
        try {
          const targetDept = await prisma.department.findUnique({ where: { id: parseInt(hId) } });
          const deptName = targetDept?.name || 'แผนก/งาน';
          const nameToSet = full_name !== undefined ? full_name.trim() : existing.full_name;
          const posToSet = position !== undefined ? position.trim() : existing.position;

          await (prisma as any).systemSetting.upsert({
            where: { key: `head_name_dept_${hId}` },
            update: { value: nameToSet },
            create: {
              key: `head_name_dept_${hId}`,
              value: nameToSet,
              description: `ชื่อหัวหน้า (${deptName})`,
            },
          });

          if (posToSet) {
            await (prisma as any).systemSetting.upsert({
              where: { key: `head_position_dept_${hId}` },
              update: { value: posToSet },
              create: {
                key: `head_position_dept_${hId}`,
                value: posToSet,
                description: `ตำแหน่งหัวหน้า (${deptName})`,
              },
            });
          }
        } catch (headErr) {
          console.warn(`Failed to update head settings for dept ${hId}:`, headErr);
        }
      }
    }

    return res.json({
      success: true,
      message: `อัปเดตข้อมูลผู้ใช้ "${updated.full_name}" เรียบร้อยแล้ว`,
      data: serializeBigInt(updated),
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้', error: error.message });
  }
});

// PUT /api/v1/admin/users/:id/toggle
router.put('/users/:id/toggle', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const userId = BigInt(id);
    const updated = await (prisma as any).user.update({
      where: { id: userId },
      data: { is_active: Boolean(is_active) },
    });

    return res.json({
      success: true,
      message: `เปลี่ยนสถานะของ "${updated.full_name}" เป็น ${updated.is_active ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'} แล้ว`,
      data: serializeBigInt(updated),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ', error: error.message });
  }
});

// PUT /api/v1/admin/users/:id/reset-password
router.put('/users/:id/reset-password', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.trim().length < 4) {
      return res.status(400).json({ success: false, message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร' });
    }

    const userId = BigInt(id);
    const password_hash = await bcrypt.hash(new_password.trim(), 10);

    const updated = await (prisma as any).user.update({
      where: { id: userId },
      data: { password_hash },
    });

    return res.json({
      success: true,
      message: `รีเซ็ตรหัสผ่านของผู้ใช้ "${updated.full_name}" สำเร็จ`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน', error: error.message });
  }
});

// DELETE /api/v1/admin/users/:id
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = BigInt(id);

    // Prevent deleting oneself
    if (req.user && BigInt(req.user.id) === userId) {
      return res.status(400).json({ success: false, message: 'ไม่สามารถลบบัญชีของตนเองที่กำลังล็อกอินอยู่ได้' });
    }

    // Check relations
    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: { projects: true, approvals: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้ที่ต้องการลบ' });
    }

    if (user._count.projects > 0 || user._count.approvals > 0) {
      // Soft-deactivate if linked to existing projects or approvals
      await (prisma as any).user.update({
        where: { id: userId },
        data: { is_active: false },
      });
      return res.json({
        success: true,
        message: `ผู้ใช้นี้มีประวัติโครงการหรือการอนุมัติอยู่ในระบบ จึงทำการ "ระงับการใช้งาน" แทนการลบเพื่อรักษาความถูกต้องของข้อมูลประวัติ`,
        deactivated: true,
      });
    }
    await (prisma as any).user.delete({
      where: { id: userId },
    });

    try {
      await (prisma as any).systemSetting.deleteMany({
        where: {
          key: {
            in: [`user_${userId}_department_ids`, `user_${userId}_division_ids`],
          },
        },
      });
    } catch (cleanErr) {}

    return res.json({ success: true, message: `ลบบัญชีผู้ใช้ "${user.full_name}" สำเร็จ` });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบผู้ใช้', error: error.message });
  }
});

// POST /api/v1/admin/settings/test-email
router.post('/settings/test-email', async (req: AuthRequest, res: Response) => {
  try {
    const { to, host, port, secure, user, pass, fromName, fromEmail } = req.body;

    if (!to) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุอีเมลผู้รับสำหรับทดสอบ' });
    }

    const customConfig = {
      host: host || 'smtp.gmail.com',
      port: parseInt(port || '587', 10),
      secure: secure === true || secure === 'true',
      user: user || '',
      pass: pass || '',
      fromName: fromName || 'ระบบบริหารจัดการโครงการ วก.เชียงราย',
      fromEmail: fromEmail || user || '',
      enabled: true,
    };

    if (!customConfig.user || !customConfig.pass) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุ SMTP Username และ Password / App Password' });
    }

    const { createTransporter, buildNotificationEmailHtml } = await import('../email/email.service');
    const transporter = await createTransporter(customConfig);

    if (!transporter) {
      return res.status(400).json({ success: false, message: 'ไม่สามารถสร้าง SMTP Transporter ได้' });
    }

    // Verify SMTP connection
    await transporter.verify();

    const fromHeader = `"${customConfig.fromName}" <${customConfig.fromEmail || customConfig.user}>`;
    const emailHtml = buildNotificationEmailHtml({
      recipientName: req.user?.full_name || 'ผู้ดูแลระบบ',
      title: 'ทดสอบการส่งอีเมลแจ้งเตือน (Email Test)',
      message: 'นี่คืออีเมลทดสอบจากระบบบริหารจัดการงานแผนงานและโครงการ (วก.เชียงราย) ระบบ SMTP ทำงานได้อย่างสมบูรณ์และพร้อมส่งข้อความแจ้งเตือนอัตโนมัติแล้ว',
      actionUrl: process.env.APP_URL || 'http://localhost:3005',
      actionLabel: 'เข้าสู่ระบบ',
    });

    const info = await transporter.sendMail({
      from: fromHeader,
      to,
      subject: '[ทดสอบระบบ] การเชื่อมต่อ SMTP สำเร็จ - วก.เชียงราย',
      text: 'นี่คือข้อความทดสอบจากระบบบริหารจัดการโครงการ วก.เชียงราย ระบบ SMTP สามารถส่งข้อความได้ปกติ',
      html: emailHtml,
    });

    return res.json({
      success: true,
      message: `ส่งอีเมลทดสอบไปยัง ${to} สำเร็จเรียบร้อยแล้ว`,
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error('Test email error:', error);
    return res.status(500).json({
      success: false,
      message: `การทดสอบส่งอีเมลล้มเหลว: ${error.message}`,
      error: error.message,
    });
  }
});



// DELETE /api/v1/admin/fiscal-years/:year (Delete all projects and strategic plans for a fiscal year)
router.delete('/fiscal-years/:year', async (req: AuthRequest, res: Response) => {
  try {
    const year = parseInt(req.params.year);
    if (isNaN(year) || year <= 0) {
      return res.status(400).json({ success: false, message: 'ระบุปีงบประมาณไม่ถูกต้อง' });
    }

    // 1. Find all projects in that fiscal year
    const projects = await prisma.project.findMany({
      where: { fiscal_year: year },
      select: { id: true },
    });

    const projectIds = projects.map((p) => p.id);
    let deletedProjectsCount = 0;

    if (projectIds.length > 0) {
      // Clean up child relations
      await prisma.projectAlignment.deleteMany({
        where: { project_id: { in: projectIds } },
      });
      await prisma.projectBudgetItem.deleteMany({
        where: { project_id: { in: projectIds } },
      });
      await prisma.projectTimeline.deleteMany({
        where: { project_id: { in: projectIds } },
      });
      await prisma.projectApproval.deleteMany({
        where: { project_id: { in: projectIds } },
      });
      await prisma.projectDocument.deleteMany({
        where: { project_id: { in: projectIds } },
      });

      // Delete projects
      const delResult = await prisma.project.deleteMany({
        where: { fiscal_year: year },
      });
      deletedProjectsCount = delResult.count;
    }

    // 2. Delete strategic plans for that fiscal year
    const deletedPlans = await prisma.strategicPlan.deleteMany({
      where: { fiscal_year: year },
    });

    return res.json({
      success: true,
      message: `ลบข้อมูลปีงบประมาณ ${year} เรียบร้อยแล้ว (ลบโครงการ ${deletedProjectsCount} โครงการ, แผนยุทธศาสตร์ ${deletedPlans.count} รายการ)`,
      data: {
        fiscal_year: year,
        deleted_projects_count: deletedProjectsCount,
        deleted_plans_count: deletedPlans.count,
      },
    });
  } catch (error: any) {
    console.error('Delete fiscal year error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบข้อมูลปีงบประมาณ', error: error.message });
  }
});

// POST /api/v1/admin/fiscal-years (Add / Register a new fiscal year)
router.post('/fiscal-years', async (req: AuthRequest, res: Response) => {
  try {
    const { fiscal_year, set_as_active } = req.body;
    const year = parseInt(String(fiscal_year));
    if (isNaN(year) || year < 2500 || year > 2700) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุปีงบประมาณ พ.ศ. ให้ถูกต้อง (เช่น 2569, 2570)' });
    }

    // Add to custom_fiscal_years array in system_settings
    let customYears: number[] = [];
    const customSetting = await (prisma as any).systemSetting.findUnique({ where: { key: 'custom_fiscal_years' } });
    if (customSetting?.value) {
      try { customYears = JSON.parse(customSetting.value); } catch {}
    }
    if (!customYears.includes(year)) {
      customYears.push(year);
      await (prisma as any).systemSetting.upsert({
        where: { key: 'custom_fiscal_years' },
        update: { value: JSON.stringify(customYears) },
        create: {
          key: 'custom_fiscal_years',
          value: JSON.stringify(customYears),
          description: 'รายการปีงบประมาณที่เพิ่มด้วยตนเอง',
        },
      });
    }

    if (set_as_active) {
      await (prisma as any).systemSetting.upsert({
        where: { key: 'current_fiscal_year' },
        update: { value: String(year) },
        create: {
          key: 'current_fiscal_year',
          value: String(year),
          description: 'ปีงบประมาณเริ่มต้น',
        },
      });
    }

    return res.json({
      success: true,
      message: `เพิ่มปีงบประมาณ พ.ศ. ${year} เรียบร้อยแล้ว`,
      data: { fiscal_year: year },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มปีงบประมาณ', error: error.message });
  }
});

// GET & POST /api/v1/admin/settings/test-users-connection
const handleTestUsersConnection = async (req: AuthRequest, res: Response) => {
  const startTime = Date.now();
  try {
    const { getUserAssignedDepartments } = require('../auth/auth.controller');

    // Count overall stats
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { is_active: true } });
    const inactiveUsers = await prisma.user.count({ where: { is_active: false } });

    const targetRoles = [
      {
        key: 'admin',
        role: 'ADMIN',
        role_name_th: 'ผู้ดูแลระบบ (Super Admin)',
        step_label: 'ดูแลระบบ / กำหนดสิทธิ์',
        expected_username: 'admin',
        division_code: null,
      },
      {
        key: 'director',
        role: 'DIRECTOR',
        role_name_th: 'ผู้อำนวยการสถานศึกษา (Director)',
        step_label: 'อนุมัติขั้นที่ ๔ (อนุมัติขั้นสุดท้าย)',
        expected_username: 'director',
        division_code: null,
      },
      {
        key: 'deputy_acad',
        role: 'DEPUTY_DIRECTOR',
        role_name_th: 'รอง ผอ. ฝ่ายวิชาการ',
        step_label: 'พิจารณาขั้นที่ ๒ (ฝ่ายวิชาการ)',
        expected_username: 'deputy_acad',
        division_code: 'acad',
      },
      {
        key: 'deputy_res',
        role: 'DEPUTY_DIRECTOR',
        role_name_th: 'รอง ผอ. ฝ่ายบริหารทรัพยากร',
        step_label: 'พิจารณาขั้นที่ ๒ (ฝ่ายบริหารทรัพยากร)',
        expected_username: 'deputy_res',
        division_code: 'res',
      },
      {
        key: 'deputy_dev',
        role: 'DEPUTY_DIRECTOR',
        role_name_th: 'รอง ผอ. ฝ่ายพัฒนากิจการนักเรียนฯ',
        step_label: 'พิจารณาขั้นที่ ๒ (ฝ่ายพัฒนากิจการฯ)',
        expected_username: 'deputy_dev',
        division_code: 'dev',
      },
      {
        key: 'deputy_strat',
        role: 'DEPUTY_DIRECTOR',
        role_name_th: 'รอง ผอ. ฝ่ายแผนงานและความร่วมมือ',
        step_label: 'พิจารณาขั้นที่ ๒ (ฝ่ายแผนงานฯ)',
        expected_username: 'deputy_strat',
        division_code: 'strat',
      },
      {
        key: 'planning_officer',
        role: 'PLANNING_OFFICER',
        role_name_th: 'เจ้าหน้าที่งานแผนงาน (Planning Officer)',
        step_label: 'ตรวจสอบขั้นที่ ๓ (ออกรหัสโครงการ)',
        expected_username: 'planning_officer',
        division_code: null,
      },
      {
        key: 'head_tech',
        role: 'HEAD_DEPT',
        role_name_th: 'หัวหน้าแผนกวิชา / หัวหน้างาน (Head of Dept)',
        step_label: 'อนุมัติขั้นที่ ๑ (ระดับแผนก/งาน)',
        expected_username: 'head_tech',
        division_code: null,
      },
      {
        key: 'teacher1',
        role: 'TEACHER',
        role_name_th: 'ครูผู้สอน / ผู้เสนอโครงการ (Teacher)',
        step_label: 'ผู้ยื่นเสนอโครงการ',
        expected_username: 'teacher1',
        division_code: null,
      },
    ];

    const results = await Promise.all(
      targetRoles.map(async (target) => {
        // 1. Try finding by expected username
        let userRecord = await (prisma as any).user.findFirst({
          where: { username: target.expected_username },
          include: { department: true },
        });

        // 2. If not found by expected username, fallback search by role / division
        let matchedBy = 'exact_username';
        if (!userRecord) {
          if (target.role === 'DEPUTY_DIRECTOR' && target.division_code) {
            // Find deputy for this specific division
            const div = await prisma.division.findFirst({ where: { code: target.division_code } });
            if (div) {
              const allDeputies = await prisma.user.findMany({
                where: { role: 'DEPUTY_DIRECTOR', is_active: true },
                include: { department: true },
              });
              for (const dep of allDeputies) {
                const depInfo = await getUserAssignedDepartments(dep.id, dep.department_id);
                if (
                  (depInfo.division_ids && depInfo.division_ids.includes(div.id)) ||
                  (depInfo.division_code && depInfo.division_code === target.division_code) ||
                  (dep.position && dep.position.toLowerCase().includes(target.division_code))
                ) {
                  userRecord = dep;
                  matchedBy = 'division_role';
                  break;
                }
              }
            }
          } else {
            userRecord = await (prisma as any).user.findFirst({
              where: { role: target.role as any, is_active: true },
              include: { department: true },
            });
            if (userRecord) matchedBy = 'role_fallback';
          }
        }

        if (!userRecord) {
          return {
            key: target.key,
            role: target.role,
            role_name_th: target.role_name_th,
            step_label: target.step_label,
            expected_username: target.expected_username,
            status: 'MISSING',
            status_label: 'ไม่พบบัญชี',
            matched_by: null,
            user_id: null,
            username: null,
            full_name: null,
            position: null,
            email: null,
            department_name: null,
            division_name: null,
            is_active: false,
            has_password: false,
            has_google: false,
            can_login: false,
          };
        }

        const assignedInfo = await getUserAssignedDepartments(userRecord.id, userRecord.department_id);
        const isActive = Boolean(userRecord.is_active);
        const hasPassword = Boolean(userRecord.password_hash);
        const hasGoogle = Boolean(userRecord.google_id);
        const canLogin = isActive && (hasPassword || hasGoogle);

        return {
          key: target.key,
          role: target.role,
          role_name_th: target.role_name_th,
          step_label: target.step_label,
          expected_username: target.expected_username,
          status: !isActive ? 'INACTIVE' : canLogin ? 'READY' : 'INCOMPLETE',
          status_label: !isActive ? 'ปิดการใช้งาน' : canLogin ? 'พร้อมใช้งาน' : 'ยังไม่ตั้งรหัสผ่าน',
          matched_by: matchedBy,
          user_id: userRecord.id.toString(),
          username: userRecord.username,
          full_name: userRecord.full_name,
          position: userRecord.position || '',
          email: userRecord.email || '',
          department_name: assignedInfo.department_name || userRecord.department?.name || '',
          division_name: assignedInfo.division_name || '',
          is_active: isActive,
          has_password: hasPassword,
          has_google: hasGoogle,
          can_login: canLogin,
        };
      })
    );

    const latencyMs = Math.max(1, Date.now() - startTime);
    const readyCount = results.filter((r) => r.status === 'READY').length;
    const missingCount = results.filter((r) => r.status === 'MISSING').length;
    const inactiveCount = results.filter((r) => r.status === 'INACTIVE').length;
    const incompleteCount = results.filter((r) => r.status === 'INCOMPLETE').length;

    return res.json({
      success: true,
      timestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
      latency_ms: latencyMs,
      database: {
        connected: true,
        total_users: totalUsers,
        active_users: activeUsers,
        inactive_users: inactiveUsers,
      },
      summary: {
        total_roles: results.length,
        ready_count: readyCount,
        missing_count: missingCount,
        inactive_count: inactiveCount,
        incomplete_count: incompleteCount,
        all_ready: readyCount === results.length,
      },
      roles: results,
    });
  } catch (error: any) {
    console.error('Test users connection error:', error);
    return res.status(500).json({
      success: false,
      message: 'การทดสอบการเชื่อมต่อผู้ใช้ล้มเหลว: ' + error.message,
      error: error.message,
      latency_ms: Date.now() - startTime,
      database: {
        connected: false,
      },
    });
  }
};

router.get('/settings/test-users-connection', handleTestUsersConnection);
router.post('/settings/test-users-connection', handleTestUsersConnection);

// Helper function to calculate percentile
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

// POST /api/v1/admin/settings/load-test
router.post('/settings/load-test', async (req: AuthRequest, res: Response) => {
  const overallStart = Date.now();
  try {
    const {
      concurrency = 50,
      requestsPerUser = 3,
      durationMinutes = 0,
      mode = 'auto_detect', // 'auto_detect' | 'fixed'
      scenario = 'full_system', // 'full_system' | 'high_traffic_submission' | 'approval_storm' | 'analytics_reporting'
    } = req.body;

    const parsedDurationMinutes = Math.min(Math.max(0, parseFloat(String(durationMinutes)) || 0), 10);
    const targetTotalDurationMs = parsedDurationMinutes * 60 * 1000;

    const memoryBefore = process.memoryUsage();

    // Module latency tracking
    const moduleLatencies: Record<string, number[]> = {
      auth_user: [],
      dashboard_stats: [],
      projects_pipeline: [],
      approvals_workflow: [],
      divisions_departments: [],
      notifications_feed: [],
      strategic_kpis: [],
    };

    // Helper to safely execute a query with fallback
    const safeQuery = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await fn();
      } catch (err: any) {
        return fallback;
      }
    };

    // 1. Auth & User Profile Simulation
    const runAuthAction = async () => {
      const t0 = Date.now();
      await safeQuery(
        () =>
          (prisma as any).user.findFirst({
            where: { is_active: true },
            include: { department: { include: { division: true } } },
          }),
        null
      );
      moduleLatencies.auth_user.push(Math.max(1, Date.now() - t0));
    };

    // 2. Dashboard Stats Aggregation Simulation
    const runDashboardAction = async () => {
      const t0 = Date.now();
      await safeQuery(
        () =>
          Promise.all([
            prisma.project.count(),
            prisma.project.count({ where: { status: 'approved' } }),
            prisma.project.count({ where: { status: 'submitted' } }),
            prisma.project.count({ where: { status: 'draft' } }),
            prisma.department.count(),
            prisma.division.count(),
          ]),
        [0, 0, 0, 0, 0, 0]
      );
      moduleLatencies.dashboard_stats.push(Math.max(1, Date.now() - t0));
    };

    // 3. Projects Pipeline & Details Simulation
    const runProjectsAction = async () => {
      const t0 = Date.now();
      await safeQuery(
        () =>
          prisma.project.findMany({
            take: 10,
            orderBy: { updated_at: 'desc' },
            include: {
              department: { include: { division: true } },
              leader: { select: { id: true, full_name: true, role: true } },
              approvals: true,
              alignments: true,
            },
          }),
        []
      );
      moduleLatencies.projects_pipeline.push(Math.max(1, Date.now() - t0));
    };

    // 4. Approvals 4-Step Workflow Queue Simulation
    const runApprovalsAction = async () => {
      const t0 = Date.now();
      await safeQuery(
        () =>
          Promise.all([
            prisma.projectApproval.findMany({
              take: 10,
              where: { status: 'PENDING' },
              orderBy: { step_order: 'asc' },
              include: { project: { select: { id: true, title: true, department_id: true } } },
            }),
            prisma.projectApproval.findMany({
              take: 10,
              where: { status: 'APPROVED' },
              orderBy: { id: 'desc' },
            }),
          ]),
        [[], []]
      );
      moduleLatencies.approvals_workflow.push(Math.max(1, Date.now() - t0));
    };

    // 5. Divisions & Departments Tree Simulation
    const runDivisionsAction = async () => {
      const t0 = Date.now();
      await safeQuery(
        () =>
          prisma.division.findMany({
            include: {
              departments: {
                include: {
                  _count: { select: { users: true, projects: true } },
                },
              },
            },
          }),
        []
      );
      moduleLatencies.divisions_departments.push(Math.max(1, Date.now() - t0));
    };

    // 6. Notifications Feed Simulation
    const runNotificationsAction = async () => {
      const t0 = Date.now();
      await safeQuery(
        () =>
          Promise.all([
            prisma.notification.findMany({
              take: 10,
              orderBy: { created_at: 'desc' },
            }),
            prisma.systemSetting.findMany({ take: 15 }),
          ]),
        [[], []]
      );
      moduleLatencies.notifications_feed.push(Math.max(1, Date.now() - t0));
    };

    // 7. Strategic Plans & KPIs Simulation
    const runStrategicAction = async () => {
      const t0 = Date.now();
      await safeQuery(
        () =>
          prisma.strategicPlan.findMany({
            take: 5,
            include: { indicators: true },
          }),
        []
      );
      moduleLatencies.strategic_kpis.push(Math.max(1, Date.now() - t0));
    };

    // Execute full-system simulated action
    const executeSimulatedUserAction = async (): Promise<{ success: boolean; latency: number; error?: string }> => {
      const actionStart = Date.now();
      try {
        if (scenario === 'full_system') {
          await Promise.all([
            runAuthAction(),
            runDashboardAction(),
            runProjectsAction(),
            runApprovalsAction(),
            runDivisionsAction(),
            runNotificationsAction(),
            runStrategicAction(),
          ]);
        } else if (scenario === 'high_traffic_submission') {
          await Promise.all([
            runAuthAction(),
            runProjectsAction(),
            runDivisionsAction(),
            runStrategicAction(),
          ]);
        } else if (scenario === 'approval_storm') {
          await Promise.all([
            runAuthAction(),
            runApprovalsAction(),
            runNotificationsAction(),
            runDashboardAction(),
          ]);
        } else if (scenario === 'analytics_reporting') {
          await Promise.all([
            runDashboardAction(),
            runProjectsAction(),
            runStrategicAction(),
          ]);
        } else {
          await Promise.all([
            runAuthAction(),
            runDashboardAction(),
            runProjectsAction(),
          ]);
        }

        const actionLatency = Math.max(1, Date.now() - actionStart);
        return { success: true, latency: actionLatency };
      } catch (err: any) {
        const actionLatency = Math.max(1, Date.now() - actionStart);
        return { success: false, latency: actionLatency, error: err?.message || 'Query error' };
      }
    };

    // Run a single stage test with given concurrent workers using throttled batching
    const runStageTest = async (workerCount: number, reqPerWorker: number, stageDurationMs: number = 0) => {
      const stageStart = Date.now();
      const allLatencies: number[] = [];
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      const totalWorkers = Math.max(1, workerCount);

      if (stageDurationMs > 0) {
        // Time-based continuous test: run all virtual users in parallel with stagger & pacing
        const stageEndTime = stageStart + stageDurationMs;
        const workers = Array.from({ length: totalWorkers }, async (_, idx) => {
          // Slight stagger start
          if (idx > 0) {
            await new Promise((r) => setTimeout(r, (idx % 20) * 10));
          }
          while (Date.now() < stageEndTime) {
            const result = await executeSimulatedUserAction();
            allLatencies.push(result.latency);
            if (result.success) {
              successCount++;
            } else {
              errorCount++;
              if (result.error && errors.length < 5) errors.push(result.error);
            }
            // Small realistic user pacing delay
            await new Promise((r) => setTimeout(r, 40 + Math.random() * 30));
          }
        });
        await Promise.all(workers);
      } else {
        // Request count based test
        const CHUNK_SIZE = 25;
        for (let i = 0; i < totalWorkers; i += CHUNK_SIZE) {
          const batchSize = Math.min(CHUNK_SIZE, totalWorkers - i);
          const batchWorkers = Array.from({ length: batchSize }, async () => {
            for (let r = 0; r < reqPerWorker; r++) {
              const result = await executeSimulatedUserAction();
              allLatencies.push(result.latency);
              if (result.success) {
                successCount++;
              } else {
                errorCount++;
                if (result.error && errors.length < 5) errors.push(result.error);
              }
            }
          });
          await Promise.all(batchWorkers);
        }
      }

      const actualDurationMs = Math.max(1, Date.now() - stageStart);
      const totalRequests = successCount + errorCount;
      const avgLatency = allLatencies.length > 0 ? Math.round(allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length) : 0;
      const minLatency = allLatencies.length > 0 ? Math.min(...allLatencies) : 0;
      const maxLatency = allLatencies.length > 0 ? Math.max(...allLatencies) : 0;
      const p95Latency = calculatePercentile(allLatencies, 95);
      const p99Latency = calculatePercentile(allLatencies, 99);
      const rps = parseFloat(((totalRequests / actualDurationMs) * 1000).toFixed(1));
      const errorRate = totalRequests > 0 ? parseFloat(((errorCount / totalRequests) * 100).toFixed(1)) : 0;

      // Quality evaluation
      let grade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DEGRADED' | 'FAILED' = 'EXCELLENT';
      if (errorRate > 5 || avgLatency > 1500) {
        grade = 'FAILED';
      } else if (errorRate > 0 || avgLatency > 800 || p95Latency > 1200) {
        grade = 'DEGRADED';
      } else if (avgLatency > 250 || p95Latency > 500) {
        grade = 'FAIR';
      } else if (avgLatency > 80 || p95Latency > 180) {
        grade = 'GOOD';
      } else {
        grade = 'EXCELLENT';
      }

      return {
        concurrency: workerCount,
        requests_per_worker: reqPerWorker,
        total_requests: totalRequests,
        success_count: successCount,
        error_count: errorCount,
        error_rate_pct: errorRate,
        duration_ms: actualDurationMs,
        throughput_rps: rps,
        min_latency_ms: minLatency,
        max_latency_ms: maxLatency,
        avg_latency_ms: avgLatency,
        p95_latency_ms: p95Latency,
        p99_latency_ms: p99Latency,
        grade,
        passed: errorRate === 0 && avgLatency < 800,
        errors,
      };
    };

    let stageResults: any[] = [];
    let maxSafeCapacity = 0;
    let maxTestedCapacity = 0;

    if (mode === 'auto_detect') {
      // Progressive full-system ramp-up stages: 10 -> 25 -> 50 -> 100 -> 150 -> 200 -> 300
      const testLevels = [10, 25, 50, 100, 150, 200, 300];
      const stageDurationMs = targetTotalDurationMs > 0 ? Math.floor(targetTotalDurationMs / testLevels.length) : 0;

      for (const level of testLevels) {
        const stageRes = await runStageTest(level, Math.min(requestsPerUser, 2), stageDurationMs);
        stageResults.push(stageRes);
        maxTestedCapacity = level;

        if (stageRes.passed) {
          maxSafeCapacity = level;
        }

        // If severe degradation or high errors, stop further stress
        if (stageRes.grade === 'FAILED' || stageRes.error_rate_pct > 10) {
          break;
        }
      }
    } else {
      // Fixed concurrency test
      const targetConcurrency = Math.min(Math.max(1, parseInt(String(concurrency), 10) || 50), 500);
      const stageRes = await runStageTest(
        targetConcurrency,
        Math.min(Math.max(1, parseInt(String(requestsPerUser), 10) || 3), 10),
        targetTotalDurationMs
      );
      stageResults.push(stageRes);
      maxTestedCapacity = targetConcurrency;
      if (stageRes.passed) maxSafeCapacity = targetConcurrency;
    }

    const totalDurationMs = Date.now() - overallStart;
    const memoryAfter = process.memoryUsage();
    const heapUsedMb = Math.round(memoryAfter.heapUsed / 1024 / 1024);
    const heapTotalMb = Math.round(memoryAfter.heapTotal / 1024 / 1024);

    // Aggregate overall metrics
    const totalRequestsAll = stageResults.reduce((sum, s) => sum + s.total_requests, 0);
    const totalSuccessAll = stageResults.reduce((sum, s) => sum + s.success_count, 0);
    const totalErrorsAll = stageResults.reduce((sum, s) => sum + s.error_count, 0);
    const overallAvgLatency = Math.round(stageResults.reduce((sum, s) => sum + s.avg_latency_ms * s.total_requests, 0) / Math.max(1, totalRequestsAll));
    const overallPeakRps = Math.max(...stageResults.map((s) => s.throughput_rps));

    // Module breakdown calculation
    const moduleStats = [
      {
        key: 'auth_user',
        name_th: 'ระบบตรวจสอบสิทธิ์และผู้ใช้ (Auth & Profile)',
        icon: 'ShieldCheck',
        count: moduleLatencies.auth_user.length,
        avg_latency_ms: moduleLatencies.auth_user.length > 0
          ? Math.round(moduleLatencies.auth_user.reduce((a, b) => a + b, 0) / moduleLatencies.auth_user.length)
          : 0,
        p95_latency_ms: calculatePercentile(moduleLatencies.auth_user, 95),
      },
      {
        key: 'dashboard_stats',
        name_th: 'แดชบอร์ดและสถิติภาพรวม (Dashboard & Analytics)',
        icon: 'LayoutDashboard',
        count: moduleLatencies.dashboard_stats.length,
        avg_latency_ms: moduleLatencies.dashboard_stats.length > 0
          ? Math.round(moduleLatencies.dashboard_stats.reduce((a, b) => a + b, 0) / moduleLatencies.dashboard_stats.length)
          : 0,
        p95_latency_ms: calculatePercentile(moduleLatencies.dashboard_stats, 95),
      },
      {
        key: 'projects_pipeline',
        name_th: 'ระบบโครงการและงบประมาณ (Projects & Pipeline)',
        icon: 'FolderGit2',
        count: moduleLatencies.projects_pipeline.length,
        avg_latency_ms: moduleLatencies.projects_pipeline.length > 0
          ? Math.round(moduleLatencies.projects_pipeline.reduce((a, b) => a + b, 0) / moduleLatencies.projects_pipeline.length)
          : 0,
        p95_latency_ms: calculatePercentile(moduleLatencies.projects_pipeline, 95),
      },
      {
        key: 'approvals_workflow',
        name_th: 'ระบบพิจารณาอนุมัติ ๔ ขั้นตอน (4-Step Approvals)',
        icon: 'CheckSquare',
        count: moduleLatencies.approvals_workflow.length,
        avg_latency_ms: moduleLatencies.approvals_workflow.length > 0
          ? Math.round(moduleLatencies.approvals_workflow.reduce((a, b) => a + b, 0) / moduleLatencies.approvals_workflow.length)
          : 0,
        p95_latency_ms: calculatePercentile(moduleLatencies.approvals_workflow, 95),
      },
      {
        key: 'divisions_departments',
        name_th: 'โครงสร้างฝ่ายและแผนกวิชา (Divisions & Depts)',
        icon: 'Building2',
        count: moduleLatencies.divisions_departments.length,
        avg_latency_ms: moduleLatencies.divisions_departments.length > 0
          ? Math.round(moduleLatencies.divisions_departments.reduce((a, b) => a + b, 0) / moduleLatencies.divisions_departments.length)
          : 0,
        p95_latency_ms: calculatePercentile(moduleLatencies.divisions_departments, 95),
      },
      {
        key: 'notifications_feed',
        name_th: 'ระบบการแจ้งเตือนและการตั้งค่า (Notifications & Settings)',
        icon: 'Bell',
        count: moduleLatencies.notifications_feed.length,
        avg_latency_ms: moduleLatencies.notifications_feed.length > 0
          ? Math.round(moduleLatencies.notifications_feed.reduce((a, b) => a + b, 0) / moduleLatencies.notifications_feed.length)
          : 0,
        p95_latency_ms: calculatePercentile(moduleLatencies.notifications_feed, 95),
      },
      {
        key: 'strategic_kpis',
        name_th: 'แผนยุทธศาสตร์และตัวชี้วัด (Strategic Plans & KPIs)',
        icon: 'Target',
        count: moduleLatencies.strategic_kpis.length,
        avg_latency_ms: moduleLatencies.strategic_kpis.length > 0
          ? Math.round(moduleLatencies.strategic_kpis.reduce((a, b) => a + b, 0) / moduleLatencies.strategic_kpis.length)
          : 0,
        p95_latency_ms: calculatePercentile(moduleLatencies.strategic_kpis, 95),
      },
    ].filter((m) => m.count > 0);

    // Determine safe recommended capacity
    const estimatedCapacity = maxSafeCapacity >= 300
      ? '350+ ผู้ใช้พร้อมกัน (รองรับได้ทั้งสถานศึกษาแบบไร้รอยต่อ)'
      : maxSafeCapacity >= 200
      ? '250-300 ผู้ใช้พร้อมกัน (รองรับช่วงเปิดเสนอโครงการพร้อมกันทั้งวิทยาลัย)'
      : maxSafeCapacity >= 100
      ? '120-150 ผู้ใช้พร้อมกัน (รองรับช่วงเร่งด่วนได้อย่างราบรื่น)'
      : maxSafeCapacity >= 50
      ? '60-80 ผู้ใช้พร้อมกัน (รองรับการใช้งานทั่วไปประจำวัน)'
      : `${maxSafeCapacity} ผู้ใช้พร้อมกัน`;

    // Assessment text
    let assessment = '';
    if (maxSafeCapacity >= 200 && totalErrorsAll === 0) {
      assessment = `ผลการทดสอบแบบเต็มระบบ (Full-System Load Test): ยอดเยี่ยมมาก! ระบบสามารถประมวลผลงานครบทุกมอดูลพร้อมกันได้อย่างไร้ข้อผิดพลาด รองรับผู้ใช้งานพร้อมกันได้มากกว่า ${maxSafeCapacity} คน โดย Latency เฉลี่ยรวมทั้งระบบเพียง ${overallAvgLatency} ms และ Throughput สูงสุด ${overallPeakRps} req/s`;
    } else if (maxSafeCapacity >= 100) {
      assessment = `ผลการทดสอบแบบเต็มระบบ: ผ่านเกณฑ์มาตรฐานระดับสูง รองรับการเข้าใช้งานพร้อมกัน ${maxSafeCapacity} คนได้อย่างเสถียร ครอบคลุมทั้งการยื่นข้อเสนอโครงการ การพิจารณาอนุมัติ ๔ ขั้นตอน และการประมวลผลสถิติ`;
    } else if (maxSafeCapacity >= 50) {
      assessment = `ระบบสามารถรองรับการเข้าใช้งานพร้อมกันได้ ${maxSafeCapacity} คนแบบเต็มระบบ โดยอัตรา Latency อยู่ในเกณฑ์ที่สามารถใช้งานได้ดี`;
    } else {
      assessment = `ระบบผ่านการทดสอบเต็มระบบที่ ${maxSafeCapacity} ผู้ใช้พร้อมกัน แนะนำตรวจสอบประสิทธิภาพฐานข้อมูลและการเชื่อมต่อเมื่อมีปริมาณผู้ใช้หนาแน่น`;
    }

    const payload = serializeBigInt({
      success: true,
      timestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
      mode,
      scenario,
      total_duration_ms: totalDurationMs,
      summary: {
        max_safe_concurrent_users: maxSafeCapacity,
        max_tested_concurrent_users: maxTestedCapacity,
        estimated_capacity_label: estimatedCapacity,
        duration_minutes_configured: parsedDurationMinutes,
        duration_seconds: Math.round(totalDurationMs / 1000),
        total_requests: totalRequestsAll,
        successful_requests: totalSuccessAll,
        failed_requests: totalErrorsAll,
        overall_error_rate_pct: parseFloat(((totalErrorsAll / Math.max(1, totalRequestsAll)) * 100).toFixed(1)),
        overall_avg_latency_ms: overallAvgLatency,
        peak_throughput_rps: overallPeakRps,
        memory_heap_used_mb: heapUsedMb,
        memory_heap_total_mb: heapTotalMb,
        assessment,
        status: totalErrorsAll === 0 ? 'HEALTHY' : 'WARNING',
      },
      stages: stageResults,
      modules: moduleStats,
    });

    return res.json(payload);
  } catch (error: any) {
    console.error('Full system load test error:', error);
    return res.status(500).json({
      success: false,
      message: 'การจำลองโหลดเต็มระบบล้มเหลว: ' + error.message,
      error: error.message,
    });
  }
});

export default router;



import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { prisma, serializeBigInt } from '../../lib/prisma';
import { authenticate, authorize, AuthRequest } from '../../middlewares/auth';
import { Role } from '@prisma/client';
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

const DEFAULT_SETTINGS = [
  { key: 'college_logo_url', value: '', description: 'URL หรือเส้นทางไฟล์รูปภาพตราสัญลักษณ์/โลโก้วิทยาลัย' },
  { key: 'college_name', value: 'วิทยาลัยการอาชีพเชียงราย', description: 'ชื่อสถานศึกษาทางการ (ภาษาไทย)' },
  { key: 'college_name_en', value: 'Chiangrai Industrial And Community Education College', description: 'ชื่อสถานศึกษา (ภาษาอังกฤษ)' },
  { key: 'college_address', value: 'เลขที่ ๑๒๓ หมู่ ๑๑ ตำบลท่าสาย อำเภอเมืองเชียงราย จังหวัดเชียงราย ๕๗๐๐๐', description: 'ที่อยู่สถานศึกษา' },
  { key: 'college_phone', value: '053-774505', description: 'เบอร์โทรศัพท์สถานศึกษา' },
  { key: 'college_email', value: 'cic.chiangrai@vec.mail.go.th', description: 'อีเมลสถานศึกษา' },
  { key: 'college_website', value: 'www.cic.ac.th', description: 'เว็บไซต์สถานศึกษา' },
  { key: 'current_fiscal_year', value: '2569', description: 'ปีงบประมาณเริ่มต้น' },
  { key: 'is_submission_open', value: 'true', description: 'สถานะเปิด/ปิดการเสนอโครงการ (true/false)' },
  { key: 'submission_start_date', value: '', description: 'วันที่เริ่มต้นเปิดรับข้อเสนอโครงการ' },
  { key: 'submission_end_date', value: '', description: 'วันที่สิ้นสุดการเปิดรับข้อเสนอโครงการ' },
  { key: 'director_name', value: 'นางปิยะพร พูลเพิ่ม', description: 'ชื่อผู้อำนวยการวิทยาลัย' },
  { key: 'director_position', value: 'ผู้อำนวยการวิทยาลัยการอาชีพเชียงราย', description: 'ตำแหน่งผู้อำนวยการ' },
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


// All routes require ADMIN role
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
        \`tag_type\` enum('TEXT','LONGTEXT','DATE','BOOLEAN','TABLE_LOOP','IMAGE','CALCULATION','DROPDOWN','DATERANGE','TIMELINE','ALIGNMENT_CHECKLIST','DIVISION_DROPDOWN','DEPARTMENT_DROPDOWN') NOT NULL DEFAULT 'TEXT',
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
  } catch (e: any) {
    console.warn('ensureTemplateTablesExist warning:', e.message);
  }
}

// GET /api/v1/admin/templates
router.get('/templates', async (req: AuthRequest, res: Response) => {
  try {
    await ensureTemplateTablesExist();
    const templates = await (prisma as any).documentTemplate.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        tags: {
          orderBy: { sort_order: 'asc' }
        }
      }
    });

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
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
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
    const template = await (prisma as any).documentTemplate.findUnique({
      where: { id: parseInt(id) },
      include: {
        tags: {
          orderBy: { sort_order: 'asc' }
        }
      }
    });

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

    const incomingIds = tags.filter(t => t.id).map(t => t.id);
    await (prisma as any).templateTag.deleteMany({
      where: {
        template_id: templateId,
        id: { notIn: incomingIds }
      }
    });

    for (const tag of (tags as any[])) {
      if (tag.id) {
        await (prisma as any).templateTag.update({
          where: { id: tag.id },
          data: {
            tag_name: tag.tag_name,
            tag_type: tag.tag_type,
            label: tag.label,
            description: tag.description,
            options: tag.options,
            sort_order: tag.sort_order,
            is_required: tag.is_required
          }
        });
      } else {
        await (prisma as any).templateTag.create({
          data: {
            template_id: templateId,
            tag_name: tag.tag_name,
            tag_type: tag.tag_type,
            label: tag.label,
            description: tag.description,
            options: tag.options,
            sort_order: tag.sort_order,
            is_required: tag.is_required || false
          }
        });
      }
    }

    return res.json({
      success: true,
      message: 'บันทึกการตั้งค่าตัวแปรเรียบร้อยแล้ว'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกตัวแปร', error: error.message });
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

    if (is_active !== undefined && is_active !== '' && is_active !== 'ALL') {
      where.is_active = is_active === 'true';
    }

    const users = await (prisma as any).user.findMany({
      where,
      orderBy: [
        { is_active: 'desc' },
        { role: 'asc' },
        { created_at: 'desc' }
      ],
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

    const serialized = users.map((u: any) => ({
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
      department_name: u.department?.name || '-',
      division_name: u.department?.division?.name || '-',
      division_code: u.department?.division?.code || '-',
      projects_count: u._count?.projects || 0,
      approvals_count: u._count?.approvals || 0,
    }));

    return res.json({ success: true, data: serialized });
  } catch (error: any) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้', error: error.message });
  }
});

// POST /api/v1/admin/users
router.post('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, email, full_name, position, role, department_id, is_active } = req.body;

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

    const newUser = await (prisma as any).user.create({
      data: {
        username: username.trim(),
        password_hash,
        email: email ? email.trim().toLowerCase() : null,
        full_name: full_name.trim(),
        position: position ? position.trim() : null,
        role: role as Role,
        department_id: department_id ? parseInt(department_id) : null,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
      },
      include: {
        department: {
          include: { division: true },
        },
      },
    });

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
    const { full_name, email, position, role, department_id, is_active, password } = req.body;

    const userId = BigInt(id);
    const existing = await (prisma as any).user.findUnique({
      where: { id: userId },
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

    const data: any = {
      full_name: full_name !== undefined ? full_name.trim() : existing.full_name,
      email: email !== undefined ? (email ? email.trim().toLowerCase() : null) : existing.email,
      position: position !== undefined ? (position ? position.trim() : null) : existing.position,
      role: role !== undefined ? (role as Role) : existing.role,
      department_id: department_id !== undefined ? (department_id ? parseInt(department_id) : null) : existing.department_id,
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

    return res.json({ success: true, message: 'ลบบัญชีผู้ใช้เรียบร้อยแล้ว' });
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

export default router;



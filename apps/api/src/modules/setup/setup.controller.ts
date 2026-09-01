import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { prisma, serializeBigInt } from '../../lib/prisma';
import { Role, SourceType } from '@prisma/client';

const router = Router();

const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || './storage');

// Helper to check writable directory
function isDirectoryWritable(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const testFile = path.join(dirPath, `.write_test_${Date.now()}`);
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return true;
  } catch (err) {
    return false;
  }
}

// 1. GET /api/v1/setup/status
// Check if the system has already been setup
router.get('/status', async (req: Request, res: Response) => {
  try {
    let isSetup = false;
    let adminCount = 0;

    try {
      const setupSetting = await (prisma as any).systemSetting.findUnique({
        where: { key: 'is_system_setup' },
      });
      isSetup = setupSetting?.value === 'true';

      adminCount = await prisma.user.count({
        where: { role: Role.ADMIN },
      });
    } catch (dbError) {
      // Database not created or tables missing yet -> definitely needs setup
      isSetup = false;
      adminCount = 0;
    }

    return res.json({
      success: true,
      is_setup: isSetup && adminCount > 0,
      admin_count: adminCount,
    });
  } catch (error: any) {
    return res.json({
      success: true,
      is_setup: false,
      admin_count: 0,
    });
  }
});

// 2. GET /api/v1/setup/health
// Check system requirements, database connection, storage directories
router.get('/health', async (req: Request, res: Response) => {
  const checks = {
    database: false,
    storage: false,
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    directories: {} as Record<string, boolean>,
  };

  try {
    // Check DB
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (dbErr) {
    checks.database = false;
  }

  // Check Storage Dirs
  const requiredDirs = [
    STORAGE_DIR,
    path.join(STORAGE_DIR, 'templates'),
    path.join(STORAGE_DIR, 'exports'),
    path.join(STORAGE_DIR, 'logos'),
    path.join(STORAGE_DIR, 'uploads'),
  ];

  let allDirsOk = true;
  for (const dir of requiredDirs) {
    const isOk = isDirectoryWritable(dir);
    checks.directories[path.basename(dir) || 'storage'] = isOk;
    if (!isOk) allDirsOk = false;
  }
  checks.storage = allDirsOk;

  return res.json({
    success: true,
    all_passed: checks.database && checks.storage,
    checks,
    database_url_configured: Boolean(process.env.DATABASE_URL),
  });
});

// 2.1 POST /api/v1/setup/test-db
// Test MySQL connection with provided host, port, user, pass, database
router.post('/test-db', async (req: Request, res: Response) => {
  let testClient: any = null;
  try {
    const { host, port, user, password, database } = req.body;
    if (!host || !user || !database) {
      return res.status(400).json({
        success: false,
        message: 'กรุณาระบุ Host, User และ Database ให้ครบถ้วน',
      });
    }

    const hostClean = host.trim();
    const portClean = port ? String(port).trim() : '3306';
    const userClean = encodeURIComponent(user.trim());
    const passClean = password ? encodeURIComponent(password) : '';
    const dbClean = database.trim();

    // Construct connection URL
    const url = passClean
      ? `mysql://${userClean}:${passClean}@${hostClean}:${portClean}/${dbClean}`
      : `mysql://${userClean}@${hostClean}:${portClean}/${dbClean}`;

    const { PrismaClient: DynamicPrismaClient } = require('@prisma/client');
    testClient = new DynamicPrismaClient({
      datasources: {
        db: { url },
      },
    });

    // Test ping
    await testClient.$queryRaw`SELECT 1`;
    await testClient.$disconnect();

    return res.json({
      success: true,
      message: 'เชื่อมต่อ MySQL Database สำเร็จเรียบร้อย!',
    });
  } catch (error: any) {
    if (testClient) {
      try {
        await testClient.$disconnect();
      } catch (e) {}
    }
    const errMsg = error.message || '';
    let userMsg = 'ไม่สามารถเชื่อมต่อ MySQL ได้';
    if (errMsg.includes('P1000') || errMsg.includes('Authentication failed')) {
      userMsg = 'รหัสผ่าน MySQL หรือ Username ไม่ถูกต้อง (Authentication failed)';
    } else if (errMsg.includes('P1001') || errMsg.includes('Can\'t reach database server')) {
      userMsg = 'ไม่สามารถติดต่อ MySQL Server ได้ (ตรวจสอบ Host/Port หรือ Firewall 3306)';
    } else if (errMsg.includes('P1003') || errMsg.includes('database') && errMsg.includes('does not exist')) {
      userMsg = 'ไม่พบชื่อ Database นี้ใน MySQL (กรุณาสร้าง Database ใน aaPanel ก่อน)';
    } else {
      userMsg = `ข้อผิดพลาด: ${errMsg.substring(0, 150)}`;
    }

    return res.json({
      success: false,
      message: userMsg,
      error: errMsg,
    });
  }
});

// 3. POST /api/v1/setup/install
// Execute first-time installation and seed default data
router.post('/install', async (req: Request, res: Response) => {
  let dbClient = prisma;
  try {
    const {
      admin_name,
      admin_username,
      admin_password,
      admin_email,
      college_name,
      college_name_en,
      college_address,
      college_phone,
      college_email,
      college_website,
      director_name,
      director_position,
      current_fiscal_year,
      theme_preset,
      theme_primary_color,
      theme_primary_hover,
      theme_accent_color,
      theme_font_family,
      db_config,
      seed_departments = true,
      seed_budget_categories = true,
      seed_strategic_plans = true,
      seed_demo_accounts = false,
      enable_test_mode = false,
    } = req.body;

    if (!admin_username || !admin_password || !admin_name) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลผู้ดูแลระบบให้ครบถ้วน (ชื่อ, ชื่อผู้ใช้, รหัสผ่าน)',
      });
    }

    // 1. Calculate Database URL from db_config if provided
    let calculatedDbUrl = process.env.DATABASE_URL || '';
    if (db_config && db_config.host && db_config.user) {
      const hostClean = db_config.host.trim();
      const portClean = db_config.port ? String(db_config.port).trim() : '3306';
      const userClean = encodeURIComponent(db_config.user.trim());
      const passClean = db_config.password ? encodeURIComponent(db_config.password) : '';
      const dbClean = (db_config.database || 'vocational_plan_db').trim();
      calculatedDbUrl = passClean
        ? `mysql://${userClean}:${passClean}@${hostClean}:${portClean}/${dbClean}`
        : `mysql://${userClean}@${hostClean}:${portClean}/${dbClean}`;

      // Update current process env
      process.env.DATABASE_URL = calculatedDbUrl;

      // Create dynamic client instance for setup execution
      const { PrismaClient: DynamicPrismaClient } = require('@prisma/client');
      dbClient = new DynamicPrismaClient({
        datasources: {
          db: { url: calculatedDbUrl },
        },
      });

      // Persist DATABASE_URL to .env on disk across possible paths so container and host remember it
      const envLocations = [
        '/app/host_config/.env',
        '/app/host_config/apps/api/.env',
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), 'apps/api/.env'),
        '/app/.env',
        '/app/apps/api/.env',
      ];

      for (const envPath of envLocations) {
        try {
          let currentEnvContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
          if (currentEnvContent.includes('DATABASE_URL=')) {
            currentEnvContent = currentEnvContent.replace(/DATABASE_URL=.*/g, `DATABASE_URL="${calculatedDbUrl}"`);
          } else {
            currentEnvContent += `\nDATABASE_URL="${calculatedDbUrl}"\n`;
          }
          if (!currentEnvContent.includes('JWT_SECRET=')) {
            currentEnvContent += `JWT_SECRET="super-secret-jwt-key-chiangrai-vocational-2026"\n`;
          }
          fs.writeFileSync(envPath, currentEnvContent, 'utf8');
        } catch (envErr) {}
      }
    }

    // 2. Security check: Check if system is already initialized
    let isAlreadySetup = false;
    try {
      const existingSetup = await (dbClient as any).systemSetting.findUnique({
        where: { key: 'is_system_setup' },
      });
      const adminCount = await dbClient.user.count({ where: { role: Role.ADMIN } });
      if (existingSetup?.value === 'true' && adminCount > 0) {
        isAlreadySetup = true;
      }
    } catch (e) {}

    if (isAlreadySetup) {
      return res.status(403).json({
        success: false,
        message: 'ระบบได้รับการติดตั้งและตั้งค่าไปแล้ว ไม่อนุญาตให้ดำเนินการซ้ำ',
      });
    }

    // 4. Create or update Super Admin User
    const passwordHash = await bcrypt.hash(admin_password, 10);
    const superAdmin = await dbClient.user.upsert({
      where: { username: admin_username },
      update: {
        full_name: admin_name,
        email: admin_email || null,
        password_hash: passwordHash,
        role: Role.ADMIN,
        position: 'ผู้ดูแลระบบสูงสุด (Super Admin)',
        is_active: true,
      },
      create: {
        username: admin_username,
        full_name: admin_name,
        email: admin_email || null,
        password_hash: passwordHash,
        role: Role.ADMIN,
        position: 'ผู้ดูแลระบบสูงสุด (Super Admin)',
        is_active: true,
      },
    });

    // 2. Save System Settings
    const settingsToSave: Record<string, string> = {
      is_system_setup: 'true',
      setup_completed_at: new Date().toISOString(),
      college_name: college_name || 'วิทยาลัยการอาชีพเชียงราย',
      college_name_en: college_name_en || 'Chiangrai Industrial And Community Education College',
      college_address: college_address || '',
      college_phone: college_phone || '',
      college_email: college_email || '',
      college_website: college_website || '',
      director_name: director_name || '',
      director_position: director_position || `ผู้อำนวยการ${college_name || 'สถานศึกษา'}`,
      current_fiscal_year: String(current_fiscal_year || '2569'),
      theme_preset: theme_preset || 'royal_blue',
      theme_primary_color: theme_primary_color || '#1e3a8a',
      theme_primary_hover: theme_primary_hover || '#172554',
      theme_accent_color: theme_accent_color || '#0d9488',
      theme_font_family: theme_font_family || 'Prompt',
      enable_test_mode: enable_test_mode ? 'true' : 'false',
    };

    for (const [key, value] of Object.entries(settingsToSave)) {
      await (dbClient as any).systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), description: '' },
      });
    }

    // 3. Seed Default Divisions & Departments (4 ฝ่ายมาตรฐาน สอศ.)
    let deptTechId: number | null = null;
    let deptPlanId: number | null = null;

    if (seed_departments) {
      const acad = await dbClient.division.upsert({
        where: { code: 'ACAD' },
        update: {},
        create: { name: 'ฝ่ายวิชาการ', code: 'ACAD' },
      });

      const resDiv = await dbClient.division.upsert({
        where: { code: 'RES' },
        update: {},
        create: { name: 'ฝ่ายบริหารทรัพยากร', code: 'RES' },
      });

      const dev = await dbClient.division.upsert({
        where: { code: 'DEV' },
        update: {},
        create: { name: 'ฝ่ายพัฒนากิจการนักเรียน นักศึกษา', code: 'DEV' },
      });

      const strat = await dbClient.division.upsert({
        where: { code: 'STRAT' },
        update: {},
        create: { name: 'ฝ่ายแผนงานและความร่วมมือ', code: 'STRAT' },
      });

      // Sample Departments (Idempotent upsert)
      const existingD1 = await dbClient.department.findFirst({
        where: { name: 'แผนกวิชาเทคโนโลยีสารสนเทศ', division_id: acad.id },
      });
      if (existingD1) {
        deptTechId = existingD1.id;
      } else {
        const d1 = await dbClient.department.create({
          data: { name: 'แผนกวิชาเทคโนโลยีสารสนเทศ', division_id: acad.id },
        });
        deptTechId = d1.id;
      }

      const otherDepts = [
        { name: 'แผนกวิชาการบัญชี', division_id: acad.id },
        { name: 'งานการเงินและบัญชี', division_id: resDiv.id },
        { name: 'งานกิจกรรมนักเรียนนักศึกษา', division_id: dev.id },
      ];
      for (const d of otherDepts) {
        const exists = await dbClient.department.findFirst({ where: { name: d.name, division_id: d.division_id } });
        if (!exists) {
          await dbClient.department.create({ data: d });
        }
      }

      const existingPlan = await dbClient.department.findFirst({
        where: { name: 'งานวางแผนและงบประมาณ', division_id: strat.id },
      });
      if (existingPlan) {
        deptPlanId = existingPlan.id;
      } else {
        const d5 = await dbClient.department.create({
          data: { name: 'งานวางแผนและงบประมาณ', division_id: strat.id },
        });
        deptPlanId = d5.id;
      }
    }

    // 4. Seed Budget Categories (Idempotent)
    if (seed_budget_categories) {
      const defaultCats = [
        { name: 'ค่าตอบแทน (วิทยากร / คณะกรรมการ)', source_type: SourceType.SUBSIDY },
        { name: 'ค่าใช้สอย (ค่าอาหารว่าง / ค่าสถานที่ / ค่าจ้างเหมา)', source_type: SourceType.SUBSIDY },
        { name: 'ค่าวัสดุ (เอกสาร / อุปกรณ์อบรม / วัสดุฝึก)', source_type: SourceType.SUBSIDY },
      ];
      for (const cat of defaultCats) {
        const exists = await dbClient.budgetCategory.findFirst({ where: { name: cat.name } });
        if (!exists) {
          await dbClient.budgetCategory.create({ data: cat });
        }
      }
    }

    // 5. Seed Strategic Plans (Idempotent)
    if (seed_strategic_plans) {
      const year = parseInt(current_fiscal_year || '2569');
      const existingStrat = await dbClient.strategicPlan.findFirst({ where: { fiscal_year: year } });
      if (!existingStrat) {
        await dbClient.strategicPlan.create({
          data: {
            fiscal_year: year,
            title: `แผนปฏิบัติราชการประจำปีงบประมาณ พ.ศ. ${year} ${college_name || 'สถานศึกษา'}`,
            indicators: {
              create: [
                { code: 'STRAT-1.1', description: 'ยุทธศาสตร์ที่ 1: พัฒนาคุณภาพและมาตรฐานการจัดการศึกษาอาชีวศึกษาสู่สากล' },
                { code: 'STRAT-1.2', description: 'ยุทธศาสตร์ที่ 1 (ตัวชี้วัด): ร้อยละของผู้สำเร็จการศึกษาที่มีงานทำหรือประกอบอาชีพอิสระ' },
                { code: 'STRAT-2.1', description: 'ยุทธศาสตร์ที่ 2: พัฒนาครูและบุคลากรทางการศึกษาให้มีความเชี่ยวชาญด้านวิชาชีพและเทคโนโลยีดิจิทัล' },
                { code: 'STRAT-3.1', description: 'ยุทธศาสตร์ที่ 3: ขยายโอกาสทางการศึกษาวิชาชีพและฝึกอบรมทักษะอาชีพแก่ชุมชนท้องถิ่น' },
                { code: 'STRAT-4.1', description: 'ยุทธศาสตร์ที่ 4: พัฒนาระบบบริหารจัดการด้วยเทคโนโลยีดิจิทัลและหลักธรรมาภิบาล' },
              ],
            },
          },
        });
      }
    }

    // 6. Optional: Seed Demo Accounts for Testing
    if (seed_demo_accounts && deptTechId && deptPlanId) {
      const defaultDemoPassword = await bcrypt.hash('password123', 10);
      const demoUsers = [
        { username: 'teacher1', password_hash: defaultDemoPassword, full_name: 'อาจารย์สมชาย ใจดี', position: 'ครูผู้สอน', role: Role.TEACHER, department_id: deptTechId },
        { username: 'head_tech', password_hash: defaultDemoPassword, full_name: 'นายประสิทธิ์ วิชาการ', position: 'หัวหน้าแผนกวิชา', role: Role.HEAD_DEPT, department_id: deptTechId },
        { username: 'deputy_acad', password_hash: defaultDemoPassword, full_name: 'ดร.สมศักดิ์ ภักดี', position: 'รองผู้อำนวยการฝ่ายวิชาการ', role: Role.DEPUTY_DIRECTOR, department_id: deptTechId },
        { username: 'planning_officer', password_hash: defaultDemoPassword, full_name: 'น.ส.อารีย์ แผนงานดี', position: 'เจ้าหน้าที่งานวางแผนและงบประมาณ', role: Role.PLANNING_OFFICER, department_id: deptPlanId },
        { username: 'director', password_hash: defaultDemoPassword, full_name: director_name || 'นายชูชาติ วงศ์สว่าง', position: director_position || 'ผู้อำนวยการสถานศึกษา', role: Role.DIRECTOR, department_id: null },
      ];

      for (const u of demoUsers) {
        await dbClient.user.upsert({
          where: { username: u.username },
          update: {},
          create: u,
        });
      }
    }

    return res.json({
      success: true,
      message: 'ติดตั้งและตั้งค่าเริ่มต้นระบบเรียบร้อยแล้ว',
      user: serializeBigInt(superAdmin),
    });
  } catch (error: any) {
    console.error('Setup install error:', error);
    return res.json({
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการติดตั้งระบบ',
      error: error.message,
    });
  }
});

export default router;

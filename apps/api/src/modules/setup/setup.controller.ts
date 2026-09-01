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

      // Update global prisma client with live connection
      const { refreshPrismaClient } = require('../../lib/prisma');
      dbClient = refreshPrismaClient(calculatedDbUrl);

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

    // 2. Ensure all core tables exist in the database (Native SQL DDL, zero CLI dependencies)
    try {
      await dbClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`system_settings\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`key\` varchar(100) NOT NULL,
          \`value\` text NOT NULL,
          \`description\` varchar(255) DEFAULT NULL,
          \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`system_settings_key_key\` (\`key\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await dbClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`divisions\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`name\` varchar(100) NOT NULL,
          \`code\` varchar(20) NOT NULL,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`divisions_code_key\` (\`code\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await dbClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`departments\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`division_id\` int NOT NULL,
          \`name\` varchar(150) NOT NULL,
          PRIMARY KEY (\`id\`),
          KEY \`departments_division_id_fkey\` (\`division_id\`),
          CONSTRAINT \`departments_division_id_fkey\` FOREIGN KEY (\`division_id\`) REFERENCES \`divisions\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await dbClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`users\` (
          \`id\` bigint NOT NULL AUTO_INCREMENT,
          \`department_id\` int DEFAULT NULL,
          \`username\` varchar(50) NOT NULL,
          \`password_hash\` varchar(255) DEFAULT NULL,
          \`email\` varchar(100) DEFAULT NULL,
          \`google_id\` varchar(100) DEFAULT NULL,
          \`avatar_url\` varchar(500) DEFAULT NULL,
          \`full_name\` varchar(150) NOT NULL,
          \`position\` varchar(100) DEFAULT NULL,
          \`signature_img\` varchar(255) DEFAULT NULL,
          \`role\` enum('TEACHER','HEAD_DEPT','DEPUTY_DIRECTOR','PLANNING_OFFICER','DIRECTOR','ADMIN') NOT NULL DEFAULT 'TEACHER',
          \`is_active\` tinyint(1) NOT NULL DEFAULT '1',
          \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`users_username_key\` (\`username\`),
          UNIQUE KEY \`users_email_key\` (\`email\`),
          UNIQUE KEY \`users_google_id_key\` (\`google_id\`),
          KEY \`users_department_id_fkey\` (\`department_id\`),
          CONSTRAINT \`users_department_id_fkey\` FOREIGN KEY (\`department_id\`) REFERENCES \`departments\` (\`id\`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await dbClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`budget_categories\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`name\` varchar(100) NOT NULL,
          \`source_type\` enum('GOVERNMENT','SUBSIDY','REVENUE') NOT NULL,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await dbClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`strategic_plans\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`fiscal_year\` int NOT NULL,
          \`title\` varchar(255) NOT NULL,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await dbClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`strategic_indicators\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`plan_id\` int NOT NULL,
          \`code\` varchar(50) NOT NULL,
          \`description\` text NOT NULL,
          PRIMARY KEY (\`id\`),
          KEY \`strategic_indicators_plan_id_fkey\` (\`plan_id\`),
          CONSTRAINT \`strategic_indicators_plan_id_fkey\` FOREIGN KEY (\`plan_id\`) REFERENCES \`strategic_plans\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      await dbClient.$executeRawUnsafe(`
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

      await dbClient.$executeRawUnsafe(`
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

      await dbClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`projects\` (
          \`id\` bigint NOT NULL AUTO_INCREMENT,
          \`project_code\` varchar(50) DEFAULT NULL,
          \`fiscal_year\` int NOT NULL,
          \`title\` varchar(255) NOT NULL,
          \`department_id\` int NOT NULL,
          \`leader_id\` bigint NOT NULL,
          \`template_id\` int DEFAULT NULL,
          \`background\` text DEFAULT NULL,
          \`objectives\` json DEFAULT NULL,
          \`target_groups\` json DEFAULT NULL,
          \`expected_results\` text DEFAULT NULL,
          \`dynamic_data\` json DEFAULT NULL,
          \`status\` enum('draft','submitted','dept_approved','deputy_approved','planning_approved','approved','rejected','in_progress','completed','cancelled') NOT NULL DEFAULT 'draft',
          \`total_budget\` decimal(12,2) NOT NULL DEFAULT '0.00',
          \`actual_spent\` decimal(12,2) NOT NULL DEFAULT '0.00',
          \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`projects_project_code_key\` (\`project_code\`),
          KEY \`projects_department_id_fkey\` (\`department_id\`),
          KEY \`projects_leader_id_fkey\` (\`leader_id\`),
          CONSTRAINT \`projects_department_id_fkey\` FOREIGN KEY (\`department_id\`) REFERENCES \`departments\` (\`id\`),
          CONSTRAINT \`projects_leader_id_fkey\` FOREIGN KEY (\`leader_id\`) REFERENCES \`users\` (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await dbClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`project_alignments\` (
          \`id\` bigint NOT NULL AUTO_INCREMENT,
          \`project_id\` bigint NOT NULL,
          \`indicator_id\` int NOT NULL,
          PRIMARY KEY (\`id\`),
          KEY \`project_alignments_project_id_fkey\` (\`project_id\`),
          KEY \`project_alignments_indicator_id_fkey\` (\`indicator_id\`),
          CONSTRAINT \`project_alignments_indicator_id_fkey\` FOREIGN KEY (\`indicator_id\`) REFERENCES \`strategic_indicators\` (\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`project_alignments_project_id_fkey\` FOREIGN KEY (\`project_id\`) REFERENCES \`projects\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await dbClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`project_budget_items\` (
          \`id\` bigint NOT NULL AUTO_INCREMENT,
          \`project_id\` bigint NOT NULL,
          \`category_id\` int NOT NULL,
          \`description\` varchar(255) NOT NULL,
          \`quantity\` decimal(10,2) NOT NULL,
          \`unit\` varchar(50) NOT NULL,
          \`unit_price\` decimal(10,2) NOT NULL,
          \`total_amount\` decimal(12,2) NOT NULL,
          PRIMARY KEY (\`id\`),
          KEY \`project_budget_items_project_id_fkey\` (\`project_id\`),
          KEY \`project_budget_items_category_id_fkey\` (\`category_id\`),
          CONSTRAINT \`project_budget_items_category_id_fkey\` FOREIGN KEY (\`category_id\`) REFERENCES \`budget_categories\` (\`id\`),
          CONSTRAINT \`project_budget_items_project_id_fkey\` FOREIGN KEY (\`project_id\`) REFERENCES \`projects\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await dbClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`project_timelines\` (
          \`id\` bigint NOT NULL AUTO_INCREMENT,
          \`project_id\` bigint NOT NULL,
          \`activity_name\` varchar(255) NOT NULL,
          \`start_date\` date NOT NULL,
          \`end_date\` date NOT NULL,
          \`location\` varchar(255) DEFAULT NULL,
          \`is_milestone\` tinyint(1) NOT NULL DEFAULT '0',
          PRIMARY KEY (\`id\`),
          KEY \`project_timelines_project_id_fkey\` (\`project_id\`),
          CONSTRAINT \`project_timelines_project_id_fkey\` FOREIGN KEY (\`project_id\`) REFERENCES \`projects\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await dbClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`project_approvals\` (
          \`id\` bigint NOT NULL AUTO_INCREMENT,
          \`project_id\` bigint NOT NULL,
          \`step_order\` int NOT NULL,
          \`approver_id\` bigint NOT NULL,
          \`status\` enum('PENDING','APPROVED','REJECTED','REVISION_REQUESTED') NOT NULL DEFAULT 'PENDING',
          \`comment\` text DEFAULT NULL,
          \`signed_at\` timestamp NULL DEFAULT NULL,
          PRIMARY KEY (\`id\`),
          KEY \`project_approvals_project_id_fkey\` (\`project_id\`),
          KEY \`project_approvals_approver_id_fkey\` (\`approver_id\`),
          CONSTRAINT \`project_approvals_approver_id_fkey\` FOREIGN KEY (\`approver_id\`) REFERENCES \`users\` (\`id\`),
          CONSTRAINT \`project_approvals_project_id_fkey\` FOREIGN KEY (\`project_id\`) REFERENCES \`projects\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await dbClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`project_documents\` (
          \`id\` bigint NOT NULL AUTO_INCREMENT,
          \`project_id\` bigint NOT NULL,
          \`file_name\` varchar(255) NOT NULL,
          \`file_path\` varchar(500) NOT NULL,
          \`file_type\` varchar(50) NOT NULL,
          \`version\` int NOT NULL DEFAULT '1',
          \`is_generated\` tinyint(1) NOT NULL DEFAULT '1',
          \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          KEY \`project_documents_project_id_fkey\` (\`project_id\`),
          CONSTRAINT \`project_documents_project_id_fkey\` FOREIGN KEY (\`project_id\`) REFERENCES \`projects\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await dbClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`project_evaluation_forms\` (
          \`id\` bigint NOT NULL AUTO_INCREMENT,
          \`project_id\` bigint NOT NULL,
          \`title\` varchar(255) NOT NULL,
          \`description\` text DEFAULT NULL,
          \`theme_config\` json DEFAULT NULL,
          \`is_active\` tinyint(1) NOT NULL DEFAULT '1',
          \`target_responses\` int NOT NULL DEFAULT '0',
          \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updated_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`project_evaluation_forms_project_id_key\` (\`project_id\`),
          CONSTRAINT \`project_evaluation_forms_project_id_fkey\` FOREIGN KEY (\`project_id\`) REFERENCES \`projects\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await dbClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`evaluation_sections\` (
          \`id\` bigint NOT NULL AUTO_INCREMENT,
          \`form_id\` bigint NOT NULL,
          \`title\` varchar(200) NOT NULL,
          \`description\` text DEFAULT NULL,
          \`order_index\` int NOT NULL DEFAULT '0',
          PRIMARY KEY (\`id\`),
          KEY \`evaluation_sections_form_id_fkey\` (\`form_id\`),
          CONSTRAINT \`evaluation_sections_form_id_fkey\` FOREIGN KEY (\`form_id\`) REFERENCES \`project_evaluation_forms\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await dbClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`evaluation_questions\` (
          \`id\` bigint NOT NULL AUTO_INCREMENT,
          \`section_id\` bigint NOT NULL,
          \`question_text\` varchar(500) NOT NULL,
          \`question_type\` enum('RATING_5','TEXT','RADIO','CHECKBOX') NOT NULL DEFAULT 'RATING_5',
          \`options\` json DEFAULT NULL,
          \`order_index\` int NOT NULL DEFAULT '0',
          \`is_required\` tinyint(1) NOT NULL DEFAULT '1',
          PRIMARY KEY (\`id\`),
          KEY \`evaluation_questions_section_id_fkey\` (\`section_id\`),
          CONSTRAINT \`evaluation_questions_section_id_fkey\` FOREIGN KEY (\`section_id\`) REFERENCES \`evaluation_sections\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await dbClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`evaluation_responses\` (
          \`id\` bigint NOT NULL AUTO_INCREMENT,
          \`form_id\` bigint NOT NULL,
          \`respondent_meta\` json DEFAULT NULL,
          \`submitted_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          KEY \`evaluation_responses_form_id_fkey\` (\`form_id\`),
          CONSTRAINT \`evaluation_responses_form_id_fkey\` FOREIGN KEY (\`form_id\`) REFERENCES \`project_evaluation_forms\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await dbClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`evaluation_answers\` (
          \`id\` bigint NOT NULL AUTO_INCREMENT,
          \`response_id\` bigint NOT NULL,
          \`question_id\` bigint NOT NULL,
          \`score\` int DEFAULT NULL,
          \`text_value\` text DEFAULT NULL,
          PRIMARY KEY (\`id\`),
          KEY \`evaluation_answers_response_id_fkey\` (\`response_id\`),
          KEY \`evaluation_answers_question_id_fkey\` (\`question_id\`),
          CONSTRAINT \`evaluation_answers_question_id_fkey\` FOREIGN KEY (\`question_id\`) REFERENCES \`evaluation_questions\` (\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`evaluation_answers_response_id_fkey\` FOREIGN KEY (\`response_id\`) REFERENCES \`evaluation_responses\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await dbClient.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`notifications\` (
          \`id\` bigint NOT NULL AUTO_INCREMENT,
          \`user_id\` bigint NOT NULL,
          \`title\` varchar(255) NOT NULL,
          \`message\` text NOT NULL,
          \`type\` enum('PROJECT_SUBMITTED','APPROVAL_REQUIRED','PROJECT_APPROVED','PROJECT_FINAL_APPROVED','PROJECT_REVISION','PROJECT_REJECTED','SYSTEM_ANNOUNCEMENT') NOT NULL DEFAULT 'PROJECT_APPROVED',
          \`link_url\` varchar(500) DEFAULT NULL,
          \`is_read\` tinyint(1) NOT NULL DEFAULT '0',
          \`read_at\` timestamp NULL DEFAULT NULL,
          \`created_at\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          KEY \`notifications_user_id_is_read_idx\` (\`user_id\`,\`is_read\`),
          CONSTRAINT \`notifications_user_id_fkey\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } catch (schemaCreateErr: any) {
      console.warn('Notice: DDL creation warning:', schemaCreateErr.message);
    }

    // 3. Create or update Super Admin User
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

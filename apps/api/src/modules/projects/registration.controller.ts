import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma, serializeBigInt } from '../../lib/prisma';
import { authenticate, optionalAuthenticate, AuthRequest } from '../../middlewares/auth';
import { sseManager } from '../notifications/sse.manager';

const router = Router();

const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || './storage');
const CERT_BG_DIR = path.join(STORAGE_DIR, 'certificates');

if (!fs.existsSync(CERT_BG_DIR)) {
  fs.mkdirSync(CERT_BG_DIR, { recursive: true });
}

// Multer storage for certificate backgrounds and signature stamps
const certStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, CERT_BG_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `cert-asset-${uniqueSuffix}${ext}`);
  },
});

const uploadCert = multer({
  storage: certStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP, SVG) เท่านั้น'));
    }
  },
});

// Helper to safely parse JSON dynamic_data
function parseDynamicData(dynamicData: any): any {
  if (!dynamicData) return {};
  if (typeof dynamicData === 'object') return dynamicData;
  try {
    return JSON.parse(dynamicData);
  } catch {
    return {};
  }
}

// Helper to generate running certificate number
async function generateNextCertificateNumber(projectId: bigint, prefix?: string): Promise<string> {
  const currentYear = new Date().getFullYear() + 543;
  const basePrefix = prefix && prefix.trim() ? prefix.trim() : `CERT-${currentYear}-${projectId}`;

  const count = await prisma.projectAttendee.count({
    where: {
      project_id: projectId,
      certificate_no: { not: null },
    },
  });

  const nextSeq = count + 1;
  return `${basePrefix}-${String(nextSeq).padStart(4, '0')}`;
}

// ==========================================
// 1. PUBLIC ENDPOINTS (No Login Required)
// ==========================================

// GET /api/v1/projects/:id/registration-info
router.get('/:id/registration-info', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = BigInt(id);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        leader: { select: { id: true, full_name: true, position: true, email: true } },
        department: { select: { id: true, name: true, division: { select: { id: true, name: true, code: true } } } },
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลโครงการ' });
    }

    const dynamicData = parseDynamicData(project.dynamic_data);
    const projectType = dynamicData.project_type || 'GENERAL';
    const regConfig = dynamicData.registration_config || {};
    const certConfig = dynamicData.certificate_config || {};
    const executionDates = dynamicData.execution_dates || [];
    const location = dynamicData.location || (executionDates[0]?.location) || '';

    // Count attendees
    const attendeeStats = await prisma.projectAttendee.groupBy({
      by: ['status'],
      where: { project_id: projectId },
      _count: { id: true },
    });

    let totalRegistered = 0;
    let totalCheckedIn = 0;
    let totalPassed = 0;

    attendeeStats.forEach((stat) => {
      const cnt = stat._count.id;
      if (stat.status === 'registered') totalRegistered += cnt;
      else if (stat.status === 'checked_in') totalCheckedIn += cnt;
      else if (stat.status === 'passed') totalPassed += cnt;
    });

    const totalCount = totalRegistered + totalCheckedIn + totalPassed;

    // Check registration window status
    const now = new Date();
    let isRegOpen = true;
    let regStatusMessage = 'เปิดรับลงทะเบียน';

    if (regConfig.is_active === false) {
      isRegOpen = false;
      regStatusMessage = 'ปิดรับลงทะเบียนชั่วคราวโดยผู้จัดงาน';
    } else {
      if (regConfig.start_at && new Date(regConfig.start_at) > now) {
        isRegOpen = false;
        regStatusMessage = `ระบบลงทะเบียนจะเปิดในวันที่ ${new Date(regConfig.start_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.`;
      } else if (regConfig.end_at && new Date(regConfig.end_at) < now) {
        isRegOpen = false;
        regStatusMessage = `ปิดรับลงทะเบียนแล้วเมื่อ ${new Date(regConfig.end_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.`;
      } else if (regConfig.max_participants && totalCount >= Number(regConfig.max_participants)) {
        isRegOpen = false;
        regStatusMessage = 'ขออภัย จำนวนผู้ลงทะเบียนเต็มจำนวนแล้ว';
      }
    }

    return res.json({
      success: true,
      data: serializeBigInt({
        project_id: project.id.toString(),
        project_code: project.project_code,
        title: project.title,
        fiscal_year: project.fiscal_year,
        department: project.department,
        leader: project.leader,
        project_type: projectType,
        execution_status: dynamicData.execution_sub_status || project.status,
        execution_dates: executionDates,
        location: location,
        registration_config: regConfig,
        certificate_config: {
          template_theme: certConfig.template_theme || 'classic_blue',
          has_background: Boolean(certConfig.background_image),
          background_image: certConfig.background_image ? `/storage/certificates/${path.basename(certConfig.background_image)}` : null,
          title: certConfig.title || 'เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า',
          subtitle: certConfig.subtitle || 'ได้เข้าร่วมและผ่านการอบรมโครงการ',
          course_name: certConfig.course_name || project.title,
          signatory_1_name: certConfig.signatory_1_name || '',
          signatory_1_position: certConfig.signatory_1_position || '',
          signatory_2_name: certConfig.signatory_2_name || '',
          signatory_2_position: certConfig.signatory_2_position || '',
        },
        stats: {
          total: totalCount,
          registered: totalRegistered,
          checked_in: totalCheckedIn,
          passed: totalPassed,
          max_participants: regConfig.max_participants ? Number(regConfig.max_participants) : null,
          remaining_seats: regConfig.max_participants ? Math.max(0, Number(regConfig.max_participants) - totalCount) : null,
        },
        is_registration_open: isRegOpen,
        registration_message: regStatusMessage,
      }),
    });
  } catch (error: any) {
    console.error('Registration info error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลการลงทะเบียน', error: error.message });
  }
});

// POST /api/v1/projects/:id/register (Public attendee self-registration)
router.post('/:id/register', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = BigInt(id);
    const {
      title_name,
      full_name,
      position,
      organization,
      email,
      phone,
      citizen_id,
      custom_data,
    } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อ-นามสกุล' });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลโครงการ' });
    }

    const dynamicData = parseDynamicData(project.dynamic_data);
    const regConfig = dynamicData.registration_config || {};

    // Validate registration timing & capacity
    const now = new Date();
    if (regConfig.is_active === false) {
      return res.status(400).json({ success: false, message: 'ระบบลงทะเบียนปิดรับชั่วคราว' });
    }
    if (regConfig.start_at && new Date(regConfig.start_at) > now) {
      return res.status(400).json({ success: false, message: 'ระบบยังไม่เปิดให้ลงทะเบียน' });
    }
    if (regConfig.end_at && new Date(regConfig.end_at) < now) {
      return res.status(400).json({ success: false, message: 'สิ้นสุดช่วงเวลาลงทะเบียนแล้ว' });
    }

    const currentCount = await prisma.projectAttendee.count({
      where: { project_id: projectId },
    });

    if (regConfig.max_participants && currentCount >= Number(regConfig.max_participants)) {
      return res.status(400).json({ success: false, message: 'ขออภัย จำนวนผู้ลงทะเบียนเต็มตามจำนวนที่กำหนดแล้ว' });
    }

    // Check duplicate registration
    const cleanPhone = phone ? phone.trim().replace(/\D/g, '') : null;
    const cleanCitizen = citizen_id ? citizen_id.trim().replace(/\D/g, '') : null;
    const cleanFullName = full_name.trim();

    const existingConditions: any[] = [{ project_id: projectId, full_name: cleanFullName }];
    if (cleanPhone) existingConditions.push({ project_id: projectId, phone: phone.trim() });
    if (cleanCitizen) existingConditions.push({ project_id: projectId, citizen_id: citizen_id.trim() });

    const existing = await prisma.projectAttendee.findFirst({
      where: {
        OR: existingConditions,
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'ท่านได้ลงทะเบียนเข้าร่วมโครงการนี้แล้วในระบบ',
        data: serializeBigInt(existing),
      });
    }

    const newAttendee = await prisma.projectAttendee.create({
      data: {
        project_id: projectId,
        title_name: title_name?.trim() || null,
        full_name: cleanFullName,
        position: position?.trim() || null,
        organization: organization?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        citizen_id: citizen_id?.trim() || null,
        status: 'registered',
        custom_data: custom_data ? (typeof custom_data === 'object' ? custom_data : JSON.parse(custom_data)) : {},
      },
    });

    // Notify organizers via SSE
    try {
      sseManager.broadcast('data_update', {
        scope: 'ATTENDEES',
        action: 'ATTENDEE_REGISTERED',
        projectId: projectId.toString(),
        attendeeId: newAttendee.id.toString(),
        fullName: newAttendee.full_name,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    return res.json({
      success: true,
      message: 'ลงทะเบียนสำเร็จเรียบร้อยแล้ว',
      data: serializeBigInt(newAttendee),
    });
  } catch (error: any) {
    console.error('Self registration error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลงทะเบียน', error: error.message });
  }
});

// GET /api/v1/projects/:id/certificates/search (Public search for certificate)
router.get('/:id/certificates/search', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { q } = req.query;
    const projectId = BigInt(id);

    if (!q || typeof q !== 'string' || !q.trim()) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อ-นามสกุล หรือเบอร์โทรศัพท์เพื่อค้นหาเกียรติบัตร' });
    }

    const query = q.trim();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        leader: { select: { full_name: true } },
        department: { select: { name: true } },
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'ไม่พบโครงการ' });
    }

    const attendees = await prisma.projectAttendee.findMany({
      where: {
        project_id: projectId,
        OR: [
          { full_name: { contains: query } },
          { phone: { contains: query } },
          { citizen_id: { contains: query } },
          { certificate_no: { contains: query } },
        ],
      },
    });

    const dynamicData = parseDynamicData(project.dynamic_data);
    const certConfig = dynamicData.certificate_config || {};

    const results = attendees.map((att) => {
      const isEligible = att.status === 'passed' || att.status === 'checked_in' || att.status === 'completed';
      return {
        id: att.id.toString(),
        title_name: att.title_name,
        full_name: att.full_name,
        position: att.position,
        organization: att.organization,
        status: att.status,
        checked_in_at: att.checked_in_at,
        certificate_no: att.certificate_no || `CERT-${project.fiscal_year}-${project.id}-${String(att.id).padStart(4, '0')}`,
        is_eligible: isEligible,
        project_title: project.title,
        fiscal_year: project.fiscal_year,
      };
    });

    return res.json({
      success: true,
      data: {
        attendees: results,
        certificate_config: certConfig,
        project_title: project.title,
      },
    });
  } catch (error: any) {
    console.error('Search certificate error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการค้นหาเกียรติบัตร', error: error.message });
  }
});

// GET /api/v1/projects/:id/certificates/:attendeeId (Public lookup single certificate)
router.get('/:id/certificates/:attendeeId', async (req: Request, res: Response) => {
  try {
    const { id, attendeeId } = req.params;
    const projectId = BigInt(id);
    const attId = BigInt(attendeeId);

    const attendee = await prisma.projectAttendee.findFirst({
      where: { id: attId, project_id: projectId },
      include: {
        project: {
          include: {
            leader: { select: { full_name: true, position: true } },
            department: { select: { name: true } },
          },
        },
      },
    });

    if (!attendee) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้เข้าร่วมโครงการ' });
    }

    const dynamicData = parseDynamicData(attendee.project.dynamic_data);
    const certConfig = dynamicData.certificate_config || {};

    // Auto assign certificate number if passed and empty
    let certNo = attendee.certificate_no;
    if (!certNo) {
      certNo = `CERT-${attendee.project.fiscal_year}-${attendee.project.id}-${String(attendee.id).padStart(4, '0')}`;
    }

    return res.json({
      success: true,
      data: {
        attendee: serializeBigInt(attendee),
        certificate_no: certNo,
        certificate_config: certConfig,
        project: {
          id: attendee.project.id.toString(),
          title: attendee.project.title,
          code: attendee.project.project_code,
          fiscal_year: attendee.project.fiscal_year,
        },
      },
    });
  } catch (error: any) {
    console.error('Get certificate error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลเกียรติบัตร', error: error.message });
  }
});

// ==========================================
// 2. AUTHENTICATED MANAGEMENT ENDPOINTS
// ==========================================

// GET /api/v1/projects/:id/attendees (List project attendees)
router.get('/:id/attendees', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = BigInt(id);
    const { status, search, page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = { project_id: projectId };

    if (status && status !== 'all') {
      whereClause.status = String(status);
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      whereClause.OR = [
        { full_name: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
        { organization: { contains: q } },
        { certificate_no: { contains: q } },
      ];
    }

    const [total, attendees, stats] = await Promise.all([
      prisma.projectAttendee.count({ where: whereClause }),
      prisma.projectAttendee.findMany({
        where: whereClause,
        orderBy: [{ created_at: 'desc' }],
        skip,
        take: limitNum,
      }),
      prisma.projectAttendee.groupBy({
        by: ['status'],
        where: { project_id: projectId },
        _count: { id: true },
      }),
    ]);

    const statSummary = {
      total: 0,
      registered: 0,
      checked_in: 0,
      passed: 0,
    };

    stats.forEach((s) => {
      statSummary.total += s._count.id;
      if (s.status === 'registered') statSummary.registered = s._count.id;
      if (s.status === 'checked_in') statSummary.checked_in = s._count.id;
      if (s.status === 'passed') statSummary.passed = s._count.id;
    });

    return res.json({
      success: true,
      data: {
        attendees: serializeBigInt(attendees),
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
        stats: statSummary,
      },
    });
  } catch (error: any) {
    console.error('List attendees error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการโหลดรายชื่อผู้ลงทะเบียน', error: error.message });
  }
});

// POST /api/v1/projects/:id/attendees (Add single or batch attendees manually)
router.post('/:id/attendees', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = BigInt(id);
    const { attendees, attendee } = req.body;

    const listToAdd: any[] = Array.isArray(attendees) ? attendees : attendee ? [attendee] : [];

    if (listToAdd.length === 0) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุข้อมูลผู้เข้าร่วม' });
    }

    const createdRecords = [];

    for (const item of listToAdd) {
      if (!item.full_name || !item.full_name.trim()) continue;

      const newRec = await prisma.projectAttendee.create({
        data: {
          project_id: projectId,
          title_name: item.title_name?.trim() || null,
          full_name: item.full_name.trim(),
          position: item.position?.trim() || null,
          organization: item.organization?.trim() || null,
          email: item.email?.trim() || null,
          phone: item.phone?.trim() || null,
          citizen_id: item.citizen_id?.trim() || null,
          status: item.status || 'registered',
          checked_in_at: item.status === 'checked_in' || item.status === 'passed' ? new Date() : null,
          certificate_no: item.certificate_no?.trim() || null,
          custom_data: item.custom_data ? (typeof item.custom_data === 'object' ? item.custom_data : {}) : {},
        },
      });
      createdRecords.push(newRec);
    }

    return res.json({
      success: true,
      message: `เพิ่มข้อมูลผู้เข้าร่วมสำเร็จ ${createdRecords.length} คน`,
      data: serializeBigInt(createdRecords),
    });
  } catch (error: any) {
    console.error('Add attendee error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มข้อมูลผู้เข้าร่วม', error: error.message });
  }
});

// PATCH /api/v1/projects/:id/attendees/:attendeeId (Update attendee)
router.patch('/:id/attendees/:attendeeId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, attendeeId } = req.params;
    const projectId = BigInt(id);
    const attId = BigInt(attendeeId);
    const { title_name, full_name, position, organization, email, phone, citizen_id, status, certificate_no, custom_data } = req.body;

    const existing = await prisma.projectAttendee.findFirst({
      where: { id: attId, project_id: projectId },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้เข้าร่วม' });
    }

    const updateData: any = {};
    if (title_name !== undefined) updateData.title_name = title_name?.trim() || null;
    if (full_name !== undefined) updateData.full_name = full_name.trim();
    if (position !== undefined) updateData.position = position?.trim() || null;
    if (organization !== undefined) updateData.organization = organization?.trim() || null;
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (citizen_id !== undefined) updateData.citizen_id = citizen_id?.trim() || null;
    if (custom_data !== undefined) updateData.custom_data = typeof custom_data === 'object' ? custom_data : {};

    if (status !== undefined) {
      updateData.status = status;
      if (status === 'checked_in' && !existing.checked_in_at) {
        updateData.checked_in_at = new Date();
      }
      if (status === 'passed' && !existing.certificate_no && !certificate_no) {
        // Auto assign certificate number
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        const dynamicData = parseDynamicData(project?.dynamic_data);
        const prefix = dynamicData.certificate_config?.certificate_no_prefix;
        updateData.certificate_no = await generateNextCertificateNumber(projectId, prefix);
      }
    }

    if (certificate_no !== undefined) {
      updateData.certificate_no = certificate_no?.trim() || null;
    }

    const updated = await prisma.projectAttendee.update({
      where: { id: attId },
      data: updateData,
    });

    return res.json({
      success: true,
      message: 'อัปเดตข้อมูลผู้เข้าร่วมเรียบร้อยแล้ว',
      data: serializeBigInt(updated),
    });
  } catch (error: any) {
    console.error('Update attendee error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้เข้าร่วม', error: error.message });
  }
});

// DELETE /api/v1/projects/:id/attendees/:attendeeId
router.delete('/:id/attendees/:attendeeId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id, attendeeId } = req.params;
    const projectId = BigInt(id);
    const attId = BigInt(attendeeId);

    await prisma.projectAttendee.delete({
      where: { id: attId, project_id: projectId },
    });

    return res.json({
      success: true,
      message: 'ลบข้อมูลผู้เข้าร่วมเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('Delete attendee error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบข้อมูลผู้เข้าร่วม', error: error.message });
  }
});

// POST /api/v1/projects/:id/attendees/batch-status (Batch update status e.g. check in all or pass all)
router.post('/:id/attendees/batch-status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = BigInt(id);
    const { attendee_ids, status } = req.body;

    if (!Array.isArray(attendee_ids) || attendee_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกผู้เข้าร่วมที่ต้องการปรับสถานะ' });
    }

    if (!['registered', 'checked_in', 'passed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
    }

    const ids = attendee_ids.map((i) => BigInt(i));

    if (status === 'passed') {
      // Assign certificate numbers to those who don't have one
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      const dynamicData = parseDynamicData(project?.dynamic_data);
      const prefix = dynamicData.certificate_config?.certificate_no_prefix;

      const targets = await prisma.projectAttendee.findMany({
        where: { id: { in: ids }, project_id: projectId },
      });

      let seq = await prisma.projectAttendee.count({
        where: { project_id: projectId, certificate_no: { not: null } },
      });

      const currentYear = new Date().getFullYear() + 543;
      const basePrefix = prefix && prefix.trim() ? prefix.trim() : `CERT-${currentYear}-${projectId}`;

      for (const t of targets) {
        let certNo = t.certificate_no;
        if (!certNo) {
          seq += 1;
          certNo = `${basePrefix}-${String(seq).padStart(4, '0')}`;
        }
        await prisma.projectAttendee.update({
          where: { id: t.id },
          data: {
            status: 'passed',
            certificate_no: certNo,
            checked_in_at: t.checked_in_at || new Date(),
          },
        });
      }
    } else {
      await prisma.projectAttendee.updateMany({
        where: {
          id: { in: ids },
          project_id: projectId,
        },
        data: {
          status,
          ...(status === 'checked_in' ? { checked_in_at: new Date() } : {}),
        },
      });
    }

    return res.json({
      success: true,
      message: `ปรับสถานะผู้เข้าร่วม ${attendee_ids.length} คน เป็น "${status === 'checked_in' ? 'เช็คอินแล้ว' : status === 'passed' ? 'ผ่านการอบรม/ออกเกียรติบัตร' : 'ลงทะเบียนแล้ว'}" เรียบร้อยแล้ว`,
    });
  } catch (error: any) {
    console.error('Batch status update error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการปรับสถานะกลุ่ม', error: error.message });
  }
});

// POST /api/v1/projects/:id/registration-settings (Update project registration & certificate settings)
router.post('/:id/registration-settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = BigInt(id);
    const {
      project_type,
      registration_config,
      certificate_config,
    } = req.body;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลโครงการ' });
    }

    const dynamicData = parseDynamicData(project.dynamic_data);

    if (project_type !== undefined) {
      dynamicData.project_type = project_type;
    }

    if (registration_config !== undefined) {
      dynamicData.registration_config = {
        ...(dynamicData.registration_config || {}),
        ...registration_config,
      };
    }

    if (certificate_config !== undefined) {
      dynamicData.certificate_config = {
        ...(dynamicData.certificate_config || {}),
        ...certificate_config,
      };
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        dynamic_data: JSON.stringify(dynamicData) as any,
      },
    });

    return res.json({
      success: true,
      message: 'บันทึกการตั้งค่าการลงทะเบียนและเกียรติบัตรเรียบร้อยแล้ว',
      data: {
        project_type: dynamicData.project_type,
        registration_config: dynamicData.registration_config,
        certificate_config: dynamicData.certificate_config,
      },
    });
  } catch (error: any) {
    console.error('Update registration settings error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า', error: error.message });
  }
});

// POST /api/v1/projects/:id/certificate/upload-bg (Upload custom certificate background)
router.post('/:id/certificate/upload-bg', authenticate, uploadCert.single('background_file'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = BigInt(id);

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์รูปภาพพื้นหลังเกียรติบัตร' });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลโครงการ' });
    }

    const dynamicData = parseDynamicData(project.dynamic_data);
    const bgUrl = `/storage/certificates/${req.file.filename}`;

    dynamicData.certificate_config = {
      ...(dynamicData.certificate_config || {}),
      background_image: bgUrl,
      template_theme: 'custom',
    };

    await prisma.project.update({
      where: { id: projectId },
      data: {
        dynamic_data: JSON.stringify(dynamicData) as any,
      },
    });

    return res.json({
      success: true,
      message: 'อัปโหลดภาพพื้นหลังเกียรติบัตรเรียบร้อยแล้ว',
      data: {
        background_image: bgUrl,
      },
    });
  } catch (error: any) {
    console.error('Upload certificate background error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ', error: error.message });
  }
});

// POST /api/v1/projects/:id/certificate/upload-signature (Upload signatory signature stamp)
router.post('/:id/certificate/upload-signature', authenticate, uploadCert.single('signature_file'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { signatory_index = '1' } = req.body;
    const projectId = BigInt(id);

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์รูปภาพลายเซ็น' });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลโครงการ' });
    }

    const dynamicData = parseDynamicData(project.dynamic_data);
    const sigUrl = `/storage/certificates/${req.file.filename}`;
    const sigKey = signatory_index === '2' ? 'signatory_2_image' : 'signatory_1_image';

    dynamicData.certificate_config = {
      ...(dynamicData.certificate_config || {}),
      [sigKey]: sigUrl,
    };

    await prisma.project.update({
      where: { id: projectId },
      data: {
        dynamic_data: JSON.stringify(dynamicData) as any,
      },
    });

    return res.json({
      success: true,
      message: 'อัปโหลดภาพลายเซ็นเรียบร้อยแล้ว',
      data: {
        [sigKey]: sigUrl,
      },
    });
  } catch (error: any) {
    console.error('Upload signature error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลดภาพลายเซ็น', error: error.message });
  }
});

export default router;

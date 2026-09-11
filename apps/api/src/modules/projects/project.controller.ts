import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma, serializeBigInt } from '../../lib/prisma';
import { authenticate, optionalAuthenticate, AuthRequest } from '../../middlewares/auth';
import { ApprovalStatus, ProjectStatus, NotificationType } from '@prisma/client';
import { renderDynamicDocx, resolveTemplateFilePath } from '../../lib/docx-generator';
import { scanDocxTemplate } from '../../lib/docx-scanner';
import { notificationService } from '../notifications/notification.service';
import { sseManager } from '../notifications/sse.manager';
import { convertDocxToPdf } from '../../lib/pdf-converter';

const router = Router();

const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || './storage');
const DOCUMENTS_DIR = path.join(STORAGE_DIR, 'documents');
const EXPORTS_DIR = path.join(STORAGE_DIR, 'exports');

if (!fs.existsSync(DOCUMENTS_DIR)) {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}
if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

// Multer setup for scanned files & project documents (PDF, images, docx)
const docStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DOCUMENTS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

const uploadDoc = multer({
  storage: docStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for high-res scanned PDFs
});

function fixThaiEncoding(str: string): string {
  try {
    const decoded = Buffer.from(str, 'latin1').toString('utf8');
    if (/[\u0E00-\u0E7F]/.test(decoded)) {
      return decoded;
    }
    return str;
  } catch {
    return str;
  }
}

// GET /api/v1/projects/templates (List available templates for project creation)
router.get('/templates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const templates = await (prisma as any).documentTemplate.findMany({
      orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
    });

    const fixedTemplates = templates.map((t: any) => {
      let parsedMappings = t.mappings;
      if (typeof parsedMappings === 'string') {
        try {
          parsedMappings = JSON.parse(parsedMappings);
        } catch {
          parsedMappings = {};
        }
      }
      return {
        id: t.id,
        name: fixThaiEncoding(t.name),
        description: t.description,
        file_name: fixThaiEncoding(t.file_name),
        is_default: t.is_default,
        mappings: parsedMappings || null,
      };
    });

    return res.json({ success: true, data: fixedTemplates });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error', error: error.message });
  }
});


// GET /api/v1/projects/active-proposal-template
router.get('/active-proposal-template', authenticate, async (req: any, res: any) => {
  try {
    let template: any = null;
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(`
        SELECT * FROM \`document_templates\` WHERE \`default_type\` = 'PROPOSAL' AND \`is_active\` = 1 LIMIT 1
      `);
      if (rows && rows.length > 0) {
        template = rows[0];
        const tags: any[] = await prisma.$queryRawUnsafe(`
          SELECT * FROM \`template_tags\` WHERE \`template_id\` = ? ORDER BY \`sort_order\` ASC
        `, template.id);
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
      template = await (prisma as any).documentTemplate.findFirst({
        where: { default_type: 'PROPOSAL', is_active: true },
        include: {
          tags: {
            orderBy: { sort_order: 'asc' }
          }
        }
      });
    }

    if (!template) {
      return res.status(404).json({ success: false, message: 'ไม่พบแม่แบบเริ่มต้นสำหรับการเขียนโครงการ' });
    }

    // Fix Thai encoding for tags if needed, but Prisma usually handles DB strings fine.
    // Return the template directly
    return res.json({ success: true, data: template });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแม่แบบ', error: error.message });
  }
});

router.post('/render-docx-preview', async (req: any, res: any) => {
  try {
    const { template_id, formData } = req.body;
    const { resolveTemplateFilePath, renderDynamicDocx } = require('../../lib/docx-generator');
    
    let template = null;
    if (template_id) {
      template = await (prisma as any).documentTemplate.findUnique({
        where: { id: parseInt(String(template_id)) },
        include: { tags: true },
      });
    }
    if (!template) {
      template = await (prisma as any).documentTemplate.findFirst({
        where: { default_type: 'PROPOSAL', is_active: true },
        include: { tags: true },
      });
    }
    if (!template) {
      template = await (prisma as any).documentTemplate.findFirst({
        where: { is_active: true },
        include: { tags: true },
      });
    }
    
    if (!template) {
       return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    const templatePath = resolveTemplateFilePath(template.file_path);
    const { buffer: docxBuffer } = await renderDynamicDocx(templatePath, formData || {}, template.tags || []);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename="preview.docx"');
    return res.send(docxBuffer);
  } catch (error: any) {
    console.error('Render preview error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างตัวอย่าง', error: error.message });
  }
});

// GET /api/v1/projects
router.get('/', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { fiscal_year, status, division_code, department_id, search, my_projects } = req.query;

    const where: any = {};

    if (fiscal_year) {
      where.fiscal_year = parseInt(fiscal_year as string);
    }
    if (status) {
      where.status = status as ProjectStatus;
    }
    if (department_id) {
      where.department_id = parseInt(department_id as string);
    }
    if (division_code) {
      where.department = {
        division: {
          code: (division_code as string).toUpperCase(),
        },
      };
    }
    if (my_projects === 'true' && req.user) {
      where.leader_id = BigInt(req.user.id);
    }
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { project_code: { contains: search as string } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        department: {
          include: {
            division: true,
          },
        },
        leader: {
          select: {
            id: true,
            full_name: true,
            position: true,
          },
        },
        budget_items: true,
        timelines: true,
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                full_name: true,
                role: true,
                position: true,
              },
            },
          },
          orderBy: { step_order: 'asc' },
        },
      },
      orderBy: { id: 'desc' },
    });

    return res.json({ success: true, data: serializeBigInt(projects) });
  } catch (error: any) {
    console.error('Fetch projects error:', error);  return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโครงการ', error: error.message });
  }
});

// GET /api/v1/projects/execution/tracking (List projects for post-approval tracking)
router.get('/execution/tracking', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { fiscal_year, search, division_id } = req.query;

    const where: any = {
      status: {
        in: [ProjectStatus.approved, ProjectStatus.in_progress, ProjectStatus.completed],
      },
    };

    if (fiscal_year) {
      where.fiscal_year = parseInt(fiscal_year as string);
    }

    if (division_id) {
      where.department = { division_id: parseInt(division_id as string) };
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { title: { contains: q } },
        { project_code: { contains: q } },
        { leader: { full_name: { contains: q } } },
        { department: { name: { contains: q } } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      select: {
        id: true,
        project_code: true,
        fiscal_year: true,
        title: true,
        department_id: true,
        leader_id: true,
        status: true,
        total_budget: true,
        actual_spent: true,
        created_at: true,
        updated_at: true,
        dynamic_data: true,
        department: {
          include: {
            division: true,
          },
        },
        leader: {
          select: {
            id: true,
            full_name: true,
            position: true,
          },
        },
        budget_items: true,
        timelines: true,
      },
      orderBy: { id: 'desc' },
    });

    return res.json({
      success: true,
      data: serializeBigInt(projects),
    });
  } catch (error: any) {
    console.error('Execution tracking list error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการติดตามโครงการ', error: error.message });
  }
});

// GET /api/v1/projects/:id

router.get('/:id', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id: BigInt(id) },
      include: {
        department: {
          include: {
            division: true,
          },
        },
        leader: {
          select: {
            id: true,
            username: true,
            full_name: true,
            position: true,
            signature_img: true,
          },
        },
        alignments: {
          include: {
            indicator: {
              include: {
                plan: true,
              },
            },
          },
        },
        budget_items: {
          include: {
            category: true,
          },
        },
        timelines: {
          orderBy: { start_date: 'asc' },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                full_name: true,
                role: true,
                position: true,
                signature_img: true,
              },
            },
          },
          orderBy: { step_order: 'asc' },
        },
        documents: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: '??????????????????' });
    }

    let templateInfo = null;
    let tpl = null;
    
    if (project.template_id) {
      tpl = await (prisma as any).documentTemplate.findUnique({
        where: { id: project.template_id },
        include: { tags: { orderBy: { sort_order: 'asc' } } },
      });
    }
    
    if (!tpl) {
      tpl = await (prisma as any).documentTemplate.findFirst({
        where: { default_type: 'PROPOSAL', is_active: true },
        include: { tags: { orderBy: { sort_order: 'asc' } } },
      });
    }

    if (tpl) {
      let parsedMappings = tpl.mappings;
      if (typeof parsedMappings === 'string') {
        try {
          parsedMappings = JSON.parse(parsedMappings);
        } catch {
          parsedMappings = {};
        }
      }
      templateInfo = {
        id: tpl.id,
        name: tpl.name,
        file_name: tpl.file_name,
        mappings: parsedMappings || {},
        tags: tpl.tags || [],
      };
    }

    return res.json({
      success: true,
      data: serializeBigInt({
        ...project,
        template: templateInfo,
      }),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: '???????????????????????????????????', error: error.message });
  }
});


function extractFiscalYearFromDynamicData(dynamicData: any, fallbackYear?: number): number {
  if (!dynamicData) return fallbackYear || 2568;
  try {
    const parsed = typeof dynamicData === 'string' ? JSON.parse(dynamicData) : dynamicData;
    // 1. Check DATERANGE or objects with start
    for (const [_, val] of Object.entries(parsed)) {
      if (val && typeof val === 'object' && !Array.isArray(val) && (val as any).start) {
        const match = String((val as any).start).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (match) {
          let y = parseInt(match[1], 10);
          const m = parseInt(match[2], 10);
          if (y < 2400) y += 543;
          return m >= 10 ? y + 1 : y;
        }
      }
    }
    // 2. Check DATE fields or start_date keywords
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof val === 'string' && val) {
        const lk = key.toLowerCase();
        if (lk.includes('start') || lk.includes('begin') || lk.includes('period') || lk.includes('duration') || lk.includes('date')) {
          const match = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
          if (match) {
            let y = parseInt(match[1], 10);
            const m = parseInt(match[2], 10);
            if (y < 2400) y += 543;
            return m >= 10 ? y + 1 : y;
          }
        }
      }
    }
    // 3. If explicit fiscal_year inside dynamic_data
    if (parsed.fiscal_year) {
      const parsedFY = parseInt(String(parsed.fiscal_year), 10);
      if (!isNaN(parsedFY) && parsedFY > 2500) return parsedFY;
    }
  } catch {}
  return fallbackYear || 2568;
}

// POST /api/v1/projects (Create project)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      fiscal_year,
      department_id,
      template_id,
      background,
      objectives,
      target_groups,
      expected_results,
      status = 'draft',
      dynamic_data,
      alignments = [],
      timelines = [],
      budget_items = [],
    } = req.body;

    const leaderId = BigInt(req.user!.id);
    let deptId = department_id ? parseInt(department_id) : null;

    if (!deptId && dynamic_data) {
      try {
        const parsed = typeof dynamic_data === 'string' ? JSON.parse(dynamic_data) : dynamic_data;
        if (parsed.leader_department_id) {
          deptId = parseInt(parsed.leader_department_id);
        } else if (parsed.leader_department_name) {
          const d = await prisma.department.findFirst({ where: { name: parsed.leader_department_name } });
          if (d) deptId = d.id;
        } else if (parsed.leader_position) {
          const posStr = String(parsed.leader_position);
          const allDepts = await prisma.department.findMany();
          const matched = allDepts.find((d: any) => posStr.includes(d.name));
          if (matched) deptId = matched.id;
        } else if (parsed.approver_division_id) {
          const d = await prisma.department.findFirst({ where: { division_id: parseInt(parsed.approver_division_id) } });
          if (d) deptId = d.id;
        }
      } catch {
        // ignore parse error
      }
    }

    if (!deptId) {
      const firstDept = await prisma.department.findFirst();
      deptId = firstDept ? firstDept.id : 1;
    }

    // Determine final fiscal year from start date / dynamic_data or payload
    let finalFiscalYear = fiscal_year ? parseInt(fiscal_year) : null;
    if (dynamic_data) {
      finalFiscalYear = extractFiscalYearFromDynamicData(dynamic_data, finalFiscalYear || undefined);
    }
    if (!finalFiscalYear || isNaN(finalFiscalYear)) {
      finalFiscalYear = 2568;
    }

    // Calculate total budget
    const totalBudget = budget_items.reduce((sum: number, item: any) => {
      const q = parseFloat(item.quantity) || 0;
      const p = parseFloat(item.unit_price) || 0;
      return sum + q * p;
    }, 0);

    const project = await prisma.project.create({
      data: {
        title,
        fiscal_year: finalFiscalYear,
        department_id: deptId,
        leader_id: leaderId,
        template_id: template_id ? parseInt(template_id) : null,
        background,
        objectives,
        target_groups,
        expected_results,
        dynamic_data: dynamic_data !== undefined ? (typeof dynamic_data === 'string' ? dynamic_data : JSON.stringify(dynamic_data)) : undefined,
        status: status === 'submitted' ? ProjectStatus.submitted : ProjectStatus.draft,
        total_budget: totalBudget,
        alignments: {
          create: alignments.map((indicatorId: number) => ({
            indicator_id: indicatorId,
          })),
        },
        timelines: {
          create: timelines.map((t: any) => ({
            activity_name: t.activity_name,
            start_date: new Date(t.start_date),
            end_date: new Date(t.end_date),
            location: t.location || '',
            is_milestone: Boolean(t.is_milestone),
          })),
        },
        budget_items: {
          create: budget_items.map((b: any) => {
            const q = parseFloat(b.quantity) || 0;
            const p = parseFloat(b.unit_price) || 0;
            return {
              category_id: parseInt(b.category_id),
              description: b.description,
              quantity: q,
              unit: b.unit,
              unit_price: p,
              total_amount: q * p,
            };
          }),
        },
      },
    });

    // If submitted, create Step 1 approval queue (Head of Dept)
    if (status === 'submitted') {
      const headOfDept =
        (await prisma.user.findFirst({
          where: {
            department_id: deptId,
            role: 'HEAD_DEPT',
          },
        })) ||
        (await prisma.user.findFirst({

          where: { role: 'HEAD_DEPT' },
        })) ||
        (await prisma.user.findFirst({
          where: { role: 'ADMIN' },
        }));

      if (headOfDept) {
        await prisma.projectApproval.create({
          data: {
            project_id: project.id,
            step_order: 1,
            approver_id: headOfDept.id,
            status: ApprovalStatus.PENDING,
            comment: 'เสนอขออนุมัติโครงการ รอหัวหน้าแผนก/งานพิจารณา',
          },
        });

        // Send notification to Head of Department
        notificationService.createNotification({
          userId: headOfDept.id,
          title: 'มีโครงการใหม่รอพิจารณาอนุมัติ (ขั้นที่ 1)',
          message: `โครงการ "${project.title}" ถูกเสนอโดย ${req.user!.full_name} รอการพิจารณาเห็นชอบจากท่าน`,
          type: NotificationType.PROJECT_SUBMITTED,
          linkUrl: `/approvals`,
        }).catch(err => console.error('Notification dispatch error:', err));
      }
    }

    // Broadcast Realtime Data Update to all connected clients
    try {
      sseManager.broadcast('data_update', {
        scope: 'PROJECTS',
        action: 'CREATED',
        projectId: project.id.toString(),
        status: project.status,
        leaderId: project.leader_id.toString(),
        departmentId: project.department_id,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    return res.status(201).json({
      success: true,
      message: 'สร้างโครงการเรียบร้อยแล้ว',
      data: serializeBigInt(project),
    });
  } catch (error: any) {
    console.error('Create project error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างโครงการ', error: error.message });
  }
});

// PUT /api/v1/projects/:id (Update project)

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = BigInt(id);

    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existingProject) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลโครงการ' });
    }

    // Permission check: leader, head dept, deputy, planner, admin can edit/save summary
    const isLeader = existingProject.leader_id === BigInt(req.user!.id);
    const userRole = String(req.user?.role || '');
    const isAdmin = userRole === 'ADMIN' || userRole === 'PLANNING_OFFICER' || userRole === 'DIRECTOR';
    if (!isLeader && !isAdmin && userRole !== 'HEAD_DEPT' && userRole !== 'DEPUTY_DIRECTOR') {
      return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์แก้ไขข้อมูลโครงการนี้' });
    }

    const {
      title,
      fiscal_year,
      department_id,
      template_id,
      background,
      objectives,
      target_groups,
      expected_results,
      status,
      dynamic_data,
      actual_spent,
      alignments,
      timelines,
      budget_items,
    } = req.body;

    const hasBudgetItems = Array.isArray(budget_items);
    const hasTimelines = Array.isArray(timelines);
    const hasAlignments = Array.isArray(alignments);

    const totalBudget = hasBudgetItems
      ? budget_items.reduce((sum: number, item: any) => {
          const q = parseFloat(item.quantity) || 0;
          const p = parseFloat(item.unit_price) || 0;
          return sum + q * p;
        }, 0)
      : existingProject.total_budget;

    // Wrap in transaction to prevent partial updates
    const updatedProject = await prisma.$transaction(async (tx) => {
      // Only delete and recreate relations if they were explicitly provided in request
      if (hasAlignments) {
        await tx.projectAlignment.deleteMany({ where: { project_id: projectId } });
      }
      if (hasTimelines) {
        await tx.projectTimeline.deleteMany({ where: { project_id: projectId } });
      }
      if (hasBudgetItems) {
        await tx.projectBudgetItem.deleteMany({ where: { project_id: projectId } });
      }

      return await tx.project.update({
        where: { id: projectId },
        data: {
          title: title !== undefined ? title : existingProject.title,
          fiscal_year: dynamic_data !== undefined
            ? extractFiscalYearFromDynamicData(dynamic_data, fiscal_year !== undefined ? parseInt(fiscal_year) : existingProject.fiscal_year)
            : (fiscal_year !== undefined ? parseInt(fiscal_year) : existingProject.fiscal_year),
          department_id: department_id !== undefined ? parseInt(department_id) : existingProject.department_id,
          template_id: template_id !== undefined ? (template_id ? parseInt(template_id) : null) : existingProject.template_id,
          background: background !== undefined ? background : existingProject.background,
          objectives: objectives !== undefined ? objectives : existingProject.objectives,
          target_groups: target_groups !== undefined ? target_groups : existingProject.target_groups,
          expected_results: expected_results !== undefined ? expected_results : existingProject.expected_results,
          status: status ? (status as ProjectStatus) : existingProject.status,
          dynamic_data: (dynamic_data !== undefined ? (typeof dynamic_data === 'string' ? dynamic_data : JSON.stringify(dynamic_data)) : existingProject.dynamic_data) as any,
          total_budget: totalBudget,
          actual_spent: actual_spent !== undefined ? Number(actual_spent) : existingProject.actual_spent,
          ...(hasAlignments
            ? {
                alignments: {
                  create: alignments.map((indicatorId: number) => ({
                    indicator_id: indicatorId,
                  })),
                },
              }
            : {}),
          ...(hasTimelines
            ? {
                timelines: {
                  create: timelines.map((t: any) => ({
                    activity_name: t.activity_name,
                    start_date: new Date(t.start_date),
                    end_date: new Date(t.end_date),
                    location: t.location || '',
                    is_milestone: Boolean(t.is_milestone),
                  })),
                },
              }
            : {}),
          ...(hasBudgetItems
            ? {
                budget_items: {
                  create: budget_items.map((b: any) => {
                    const q = parseFloat(b.quantity) || 0;
                    const p = parseFloat(b.unit_price) || 0;
                    return {
                      category_id: parseInt(b.category_id),
                      description: b.description,
                      quantity: q,
                      unit: b.unit,
                      unit_price: p,
                      total_amount: q * p,
                    };
                  }),
                },
              }
            : {}),
        },
      });
    });

    // If submitted via PUT (e.g. from edit page or resubmission), ensure Step 1 approval is created/pending
    if (status === 'submitted') {
      const deptId = updatedProject.department_id;
      const headOfDept =
        (await prisma.user.findFirst({
          where: {
            department_id: deptId,
            role: 'HEAD_DEPT',
          },
        })) ||
        (await prisma.user.findFirst({
          where: { role: 'HEAD_DEPT' },
        })) ||
        (await prisma.user.findFirst({
          where: { role: 'ADMIN' },
        }));

      if (headOfDept) {
        // Clean up any subsequent steps (step 2, 3, 4) from previous approval cycles to reset flow cleanly
        await prisma.projectApproval.deleteMany({
          where: {
            project_id: projectId,
            step_order: { gt: 1 },
          },
        });

        // Find if there is an existing Step 1 approval
        const existingStep1 = await prisma.projectApproval.findFirst({
          where: { project_id: projectId, step_order: 1 },
        });

        if (existingStep1) {
          await prisma.projectApproval.update({
            where: { id: existingStep1.id },
            data: {
              status: ApprovalStatus.PENDING,
              approver_id: headOfDept.id,
              comment: 'ยื่นเสนอโครงการใหม่หลังการแก้ไข รอหัวหน้าแผนก/งานพิจารณา',
              signed_at: null,
            },
          });
        } else {
          await prisma.projectApproval.create({
            data: {
              project_id: projectId,
              step_order: 1,
              approver_id: headOfDept.id,
              status: ApprovalStatus.PENDING,
              comment: 'เสนอขออนุมัติโครงการ รอหัวหน้าแผนก/งานพิจารณา',
            },
          });
        }

        // Send notification to Head of Department
        notificationService.createNotification({
          userId: headOfDept.id,
          title: 'มีโครงการใหม่รอพิจารณาอนุมัติ (ขั้นที่ 1)',
          message: `โครงการ "${updatedProject.title}" ถูกเสนอโดย ${req.user!.full_name} รอการพิจารณาเห็นชอบจากท่าน`,
          type: NotificationType.PROJECT_SUBMITTED,
          linkUrl: `/approvals`,
        }).catch(err => console.error('Notification dispatch error:', err));
      }
    }

    // Broadcast Realtime Data Update to all connected clients
    try {
      sseManager.broadcast('data_update', {
        scope: 'PROJECTS',
        action: 'UPDATED',
        projectId: updatedProject.id.toString(),
        status: updatedProject.status,
        leaderId: updatedProject.leader_id.toString(),
        departmentId: updatedProject.department_id,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    return res.json({
      success: true,
      message: 'บันทึกการแก้ไขเรียบร้อยแล้ว',
      data: serializeBigInt(updatedProject),
    });
  } catch (error: any) {
    console.error('Update project error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการแก้ไขโครงการ', error: error.message });
  }
});

// PATCH /api/v1/projects/:id/summary (Direct save for summary data)
router.patch('/:id/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = BigInt(id);

    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existingProject) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลโครงการ' });
    }

    const { dynamic_data, actual_spent } = req.body;

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        dynamic_data: (dynamic_data !== undefined ? (typeof dynamic_data === 'string' ? dynamic_data : JSON.stringify(dynamic_data)) : existingProject.dynamic_data) as any,
        actual_spent: actual_spent !== undefined ? Number(actual_spent) : existingProject.actual_spent,
      },
    });

    return res.json({
      success: true,
      message: 'บันทึกข้อมูลสรุปโครงการเรียบร้อยแล้ว',
      data: serializeBigInt(updated),
    });
  } catch (error: any) {
    console.error('Save summary error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลสรุป', error: error.message });
  }
});

// DELETE /api/v1/projects/:id (Delete draft project)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = BigInt(id);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        documents: true,
        approvals: {
          orderBy: { step_order: 'asc' },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลโครงการ' });
    }

    // Check if project has reached or passed Director stage (step 4 / planning_approved or later)
    const isAtOrPastDirectorStage =
      project.status === 'planning_approved' ||
      project.status === 'approved' ||
      project.status === 'in_progress' ||
      project.status === 'completed' ||
      project.approvals?.some((a: any) => a.step_order === 4 && (a.status === 'APPROVED' || a.status === 'PENDING'));

    if (isAtOrPastDirectorStage) {
      return res.status(400).json({
        success: false,
        message: 'ไม่สามารถลบโครงการที่อยู่ในหรือผ่านขั้นตอนการพิจารณาของผู้อำนวยการแล้วได้',
      });
    }

    // Permission check: only leader or admin can delete
    const isAdmin = req.user!.role === 'ADMIN';
    if (project.leader_id !== BigInt(req.user!.id) && !isAdmin) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ในการลบโครงการนี้' });
    }

    // Status check: non-admin can only delete draft and rejected status; admin can delete any status (except Director stage and beyond, blocked above)
    if (!isAdmin && project.status !== 'draft' && project.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'สามารถลบได้เฉพาะโครงการที่เป็นแบบร่าง (Draft) หรือไม่ได้รับการอนุมัติ (Rejected) เท่านั้น',
      });
    }

    // Clean up uploaded documents files on disk
    if (project.documents && project.documents.length > 0) {
      for (const doc of project.documents) {
        if (doc.file_path && fs.existsSync(doc.file_path)) {
          try {
            fs.unlinkSync(doc.file_path);
          } catch (err) {
            console.warn('Cannot delete document file from disk:', err);
          }
        }
      }
    }

    // Delete project (cascades to alignments, timelines, budget_items, approvals, documents)
    await prisma.project.delete({
      where: { id: projectId },
    });

    // Broadcast Realtime Data Update to all connected clients
    try {
      sseManager.broadcast('data_update', {
        scope: 'PROJECTS',
        action: 'DELETED',
        projectId: projectId.toString(),
        leaderId: project.leader_id.toString(),
        departmentId: project.department_id,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    return res.json({
      success: true,
      message: 'ลบโครงการเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    console.error('Delete project error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบโครงการ', error: error.message });
  }
});

// POST /api/v1/projects/:id/submit
router.post('/:id/submit', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = BigInt(id);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { department: true },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลโครงการ' });
    }

    // Check if there was an approval step that requested revision
    const revisionStep = await prisma.projectApproval.findFirst({
      where: {
        project_id: projectId,
        status: ApprovalStatus.REVISION_REQUESTED,
      },
      orderBy: { step_order: 'desc' },
      include: { approver: true },
    });

    let targetStepOrder = 1;
    let targetApproverId: bigint | null = null;
    let targetApproverName = '';
    let targetNotificationTitle = '';
    let newProjectStatus: ProjectStatus = ProjectStatus.submitted;

    if (revisionStep) {
      // If revision was requested by a specific step, route back to that step!
      targetStepOrder = revisionStep.step_order;
      targetApproverId = revisionStep.approver_id;
      targetApproverName = revisionStep.approver?.full_name || '';

      if (targetStepOrder === 1) {
        newProjectStatus = ProjectStatus.submitted;
        targetNotificationTitle = 'โครงการได้รับการแก้ไขแล้ว รอพิจารณาเห็นชอบ (ขั้นที่ 1 - หัวหน้าแผนก)';
      } else if (targetStepOrder === 2) {
        newProjectStatus = ProjectStatus.dept_approved;
        targetNotificationTitle = 'โครงการได้รับการแก้ไขแล้ว รอพิจารณาเห็นชอบ (ขั้นที่ 2 - รอง ผอ.)';
      } else if (targetStepOrder === 3) {
        newProjectStatus = ProjectStatus.deputy_approved;
        targetNotificationTitle = 'โครงการได้รับการแก้ไขแล้ว รอตรวจสอบงบประมาณ (ขั้นที่ 3 - งานแผนงาน)';
      } else if (targetStepOrder === 4) {
        newProjectStatus = ProjectStatus.planning_approved;
        targetNotificationTitle = 'โครงการได้รับการแก้ไขแล้ว รอผู้อำนวยการอนุมัติ (ขั้นที่ 4 - ผู้อำนวยการ)';
      }
    } else {
      // First-time submission: find Head of Department (Step 1)
      const head =
        (await prisma.user.findFirst({
          where: {
            department_id: project.department_id,
            role: 'HEAD_DEPT',
          },
        })) ||
        (await prisma.user.findFirst({
          where: { role: 'HEAD_DEPT' },
        })) ||
        (await prisma.user.findFirst({
          where: { role: 'ADMIN' },
        }));

      if (head) {
        targetApproverId = head.id;
        targetApproverName = head.full_name;
      }
      targetNotificationTitle = 'มีโครงการใหม่รอพิจารณาอนุมัติ (ขั้นที่ 1 - หัวหน้าแผนก)';
    }

    if (!targetApproverId) {
      const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      targetApproverId = admin ? admin.id : project.leader_id;
    }

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: newProjectStatus },
    });

    // Reset target step approval to PENDING
    const existingTargetStep = await prisma.projectApproval.findFirst({
      where: { project_id: projectId, step_order: targetStepOrder },
    });

    if (existingTargetStep) {
      await prisma.projectApproval.update({
        where: { id: existingTargetStep.id },
        data: {
          status: ApprovalStatus.PENDING,
          approver_id: targetApproverId,
          comment: revisionStep
            ? `ผู้เสนอโครงการได้แก้ไขและส่งกลับมาให้พิจารณาอีกครั้ง (รอบแก้ไข)`
            : `ยื่นเสนอขออนุมัติโครงการใหม่ รอการพิจารณาเห็นชอบ`,
          signed_at: null,
        },
      });
    } else {
      await prisma.projectApproval.create({
        data: {
          project_id: projectId,
          step_order: targetStepOrder,
          approver_id: targetApproverId,
          status: ApprovalStatus.PENDING,
          comment: `เสนอขออนุมัติโครงการตามสายการบังคับบัญชา`,
        },
      });
    }

    // Delete any subsequent steps beyond targetStepOrder if any exist in broken state
    await prisma.projectApproval.deleteMany({
      where: {
        project_id: projectId,
        step_order: { gt: targetStepOrder },
      },
    });

    // Send Notification to target approver
    notificationService.createNotification({
      userId: targetApproverId,
      title: targetNotificationTitle,
      message: revisionStep
        ? `โครงการ "${project.title}" ได้รับการปรับปรุงแก้ไขตามข้อเสนอแนะแล้ว และส่งกลับมาให้ท่านพิจารณาอีกครั้ง`
        : `โครงการ "${project.title}" ถูกเสนอโดย ${req.user!.full_name} รอการพิจารณาเห็นชอบจากท่าน`,
      type: NotificationType.APPROVAL_REQUIRED,
      linkUrl: `/approvals`,
    }).catch((err) => console.error('Notification dispatch error:', err));

    // Broadcast Realtime Data Update to all connected clients
    try {
      sseManager.broadcast('data_update', {
        scope: 'PROJECTS',
        action: 'SUBMITTED',
        projectId: projectId.toString(),
        leaderId: project.leader_id.toString(),
        departmentId: project.department_id,
        targetStepOrder,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    const stepLabel = targetStepOrder === 4 ? 'ผู้อำนวยการ' : targetStepOrder === 3 ? 'งานแผนงาน' : targetStepOrder === 2 ? 'รองผู้อำนวยการ' : 'หัวหน้าแผนก';
    return res.json({
      success: true,
      message: revisionStep
        ? `ส่งโครงการที่แก้ไขแล้วกลับไปยัง "${stepLabel}" เรียบร้อยแล้ว`
        : `ส่งเสนอโครงการเข้าสู่สายการอนุมัติเรียบร้อยแล้ว`,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// =========================================================================
// Scanned Files / Attached Documents Management
// =========================================================================

// POST /api/v1/projects/:id/documents (Upload scanned document or attachment)
router.post('/:id/documents', authenticate, uploadDoc.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = BigInt(id);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลโครงการ' });
    }

    // Check permissions to attach documents
    const isOwner = project.leader_id === BigInt(req.user!.id);
    const userRole = String(req.user?.role || '');
    const isAdminOrPlanner = userRole === 'ADMIN' || userRole === 'PLANNING_OFFICER' || userRole === 'DIRECTOR';
    const isApprover = userRole === 'HEAD_DEPT' || userRole === 'DEPUTY_DIRECTOR';

    if (!isOwner && !isAdminOrPlanner && !isApprover) {
      return res.status(403).json({ success: false, message: 'คุณไม่มีสิทธิ์แนบไฟล์ในโครงการนี้' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์ที่ต้องการอัปโหลด' });
    }

    const originalName = fixThaiEncoding(req.file.originalname);
    const filePath = req.file.path;
    const fileType = path.extname(originalName).replace('.', '').toLowerCase();

    const doc = await prisma.projectDocument.create({
      data: {
        project_id: projectId,
        file_name: originalName,
        file_path: filePath,
        file_type: fileType,
        is_generated: false,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'อัปโหลดไฟล์เอกสารแนบเรียบร้อยแล้ว',
      data: serializeBigInt(doc),
    });
  } catch (error: any) {
    console.error('Upload document error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์', error: error.message });
  }
});

// POST /api/v1/projects/:id/cover-image (Upload project summary cover image)
router.post('/:id/cover-image', authenticate, uploadDoc.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = BigInt(id);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลโครงการ' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์ภาพที่ต้องการอัปโหลด' });
    }

    const filename = req.file.filename;
    const relativeUrl = `/storage/documents/${filename}`;

    // Update dynamic_data with cover_image
    let dynamicData: any = {};
    if (project.dynamic_data) {
      try {
        dynamicData = typeof project.dynamic_data === 'string' ? JSON.parse(project.dynamic_data) : project.dynamic_data;
      } catch {
        dynamicData = {};
      }
    }

    dynamicData.cover_image = relativeUrl;

    await prisma.project.update({
      where: { id: projectId },
      data: {
        dynamic_data: JSON.stringify(dynamicData),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'อัปโหลดรูปภาพหน้าปกสำเร็จ',
      data: {
        imageUrl: relativeUrl,
        filename: req.file.filename,
      },
    });
  } catch (error: any) {
    console.error('Upload cover image error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพหน้าปก', error: error.message });
  }
});

// GET /api/v1/projects/:id/documents (List all documents of project)
router.get('/:id/documents', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const docs = await prisma.projectDocument.findMany({
      where: { project_id: BigInt(id) },
      orderBy: { created_at: 'desc' },
    });

    return res.json({ success: true, data: serializeBigInt(docs) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงรายการเอกสาร', error: error.message });
  }
});

// DELETE /api/v1/projects/:id/documents/:docId (Delete document)
router.delete('/:id/documents/:docId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { docId } = req.params;
    const doc = await prisma.projectDocument.findUnique({
      where: { id: BigInt(docId) },
    });

    if (!doc) {
      return res.status(404).json({ success: false, message: 'ไม่พบไฟล์เอกสาร' });
    }

    if (fs.existsSync(doc.file_path)) {
      try {
        fs.unlinkSync(doc.file_path);
      } catch (err) {
        console.warn('Cannot delete file from disk:', err);
      }
    }

    await prisma.projectDocument.delete({
      where: { id: BigInt(docId) },
    });

    return res.json({ success: true, message: 'ลบไฟล์เอกสารเรียบร้อยแล้ว' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบเอกสาร', error: error.message });
  }
});

// GET /api/v1/projects/documents/:docId/download
router.get('/documents/:docId/download', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { docId } = req.params;
    const doc = await prisma.projectDocument.findUnique({
      where: { id: BigInt(docId) },
    });

    if (!doc || !fs.existsSync(doc.file_path)) {
      return res.status(404).json({ success: false, message: 'ไม่พบไฟล์เอกสารบนระบบ' });
    }

    return res.download(doc.file_path, doc.file_name);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดาวน์โหลดเอกสาร', error: error.message });
  }
});

// GET /api/v1/projects/documents/:docId/view (Inline preview for PDF and images)
router.get('/documents/:docId/view', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { docId } = req.params;
    const doc = await prisma.projectDocument.findUnique({
      where: { id: BigInt(docId) },
    });

    if (!doc || !fs.existsSync(doc.file_path)) {
      return res.status(404).json({ success: false, message: 'ไม่พบไฟล์เอกสารบนระบบ' });
    }

    const ext = path.extname(doc.file_path).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === '.doc') contentType = 'application/msword';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.file_name)}"`);
    const stream = fs.createReadStream(doc.file_path);
    return stream.pipe(res);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเปิดดูเอกสาร', error: error.message });
  }
});

// =========================================================================
// Print Summary / Export DOCX from approved project template
// =========================================================================

// GET /api/v1/projects/:id/summary-template-scan (Scan docx template and return AST)
router.get('/:id/summary-template-scan', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id: BigInt(id) },
      include: {
        department: { include: { division: true } },
        leader: true,
        timelines: { orderBy: { start_date: 'asc' } },
        budget_items: true,
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลโครงการ' });
    }

    const templates = await (prisma as any).documentTemplate.findMany({
      where: { is_active: true },
      include: { tags: true },
      orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
    });

    let summaryTpl = templates.find((t: any) =>
      t.default_type === 'FULL_SUMMARY' ||
      t.default_type === 'SUMMARY' ||
      (t.name && (t.name.includes('สรุป') || t.name.includes('เล่ม'))) ||
      (t.file_name && (t.file_name.includes('สรุป') || t.file_name.includes('เล่ม')))
    );

    if (!summaryTpl && templates.length > 0) {
      summaryTpl = templates[0];
    }

    if (!summaryTpl || !fs.existsSync(summaryTpl.file_path)) {
      return res.status(404).json({ success: false, message: 'ไม่พบไฟล์แม่แบบเล่มสรุปโครงการบนระบบ' });
    }

    const buf = fs.readFileSync(summaryTpl.file_path);
    const scanResult = scanDocxTemplate(buf);

    return res.json({
      success: true,
      data: {
        templateId: summaryTpl.id.toString(),
        templateName: summaryTpl.name,
        scanResult,
      },
    });
  } catch (error: any) {
    console.error('Scan summary template error:', error);
    return res.status(500).json({ success: false, message: error.message || 'เกิดข้อผิดพลาดในการสแกนแม่แบบ' });
  }
});

// PATCH /api/v1/projects/:id/summary (Update project summary notes, actual spent, and dynamic_data)
router.patch('/:id/summary', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const projectId = BigInt(id);

    const existingProject = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existingProject) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลโครงการ' });
    }

    const { dynamic_data, actual_spent } = req.body;

    let updatedDynamicData: any = {};
    if (dynamic_data !== undefined) {
      if (typeof dynamic_data === 'string') {
        try {
          updatedDynamicData = JSON.parse(dynamic_data);
        } catch {
          updatedDynamicData = dynamic_data;
        }
      } else {
        updatedDynamicData = dynamic_data;
      }
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dynamic_data !== undefined ? { dynamic_data: typeof dynamic_data === 'string' ? dynamic_data : JSON.stringify(dynamic_data) } : {}),
        ...(actual_spent !== undefined ? { actual_spent: Number(actual_spent) || 0 } : {}),
      },
    });

    return res.json({
      success: true,
      message: 'บันทึกข้อมูลสรุปผลโครงการเรียบร้อยแล้ว',
      data: serializeBigInt(updated),
    });
  } catch (error: any) {
    console.error('Update summary error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกสรุปโครงการ', error: error.message });
  }
});

async function generateProjectSummaryDocx(id: string | bigint, options?: { templateType?: string; templateId?: number | string; dynamicDataOverride?: any }) {
  const projectId = BigInt(id);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      department: { include: { division: true } },
      leader: true,
      timelines: { orderBy: { start_date: 'asc' } },
      budget_items: { include: { category: true } },
      alignments: { include: { indicator: { include: { plan: true } } } },
      approvals: { include: { approver: true }, orderBy: { step_order: 'asc' } },
    },
  });

  if (!project) {
    throw new Error('ไม่พบข้อมูลโครงการ');
  }

  // Parse dynamic_data
  let dynamicData: any = {};
  if (project.dynamic_data) {
    let temp = project.dynamic_data;
    while (typeof temp === 'string') {
      try { temp = JSON.parse(temp); } catch { break; }
    }
    dynamicData = temp || {};
  }

  // Merge override dynamic data if provided
  if (options?.dynamicDataOverride && typeof options.dynamicDataOverride === 'object') {
    dynamicData = {
      ...dynamicData,
      ...options.dynamicDataOverride,
    };
  }

  // Find summary template
  const templates = await (prisma as any).documentTemplate.findMany({
    where: { is_active: true },
    include: { tags: true },
    orderBy: [{ created_at: 'desc' }],
  });

  let summaryTpl: any = null;

  if (options?.templateId) {
    summaryTpl = templates.find((t: any) => String(t.id) === String(options.templateId));
  }

  if (!summaryTpl && options?.templateType === 'SHORT_SUMMARY') {
    summaryTpl = templates.find((t: any) =>
      t.default_type === 'SHORT_SUMMARY' ||
      (t.name && (t.name.includes('แผ่นเดียว') || t.name.toLowerCase().includes('one-page') || t.name.toLowerCase().includes('short_summary'))) ||
      (t.file_name && (t.file_name.includes('แผ่นเดียว') || t.file_name.toLowerCase().includes('one-page') || t.file_name.toLowerCase().includes('short_summary')))
    );
  }

  if (!summaryTpl && options?.templateType === 'FULL_SUMMARY') {
    summaryTpl = templates.find((t: any) =>
      t.default_type === 'FULL_SUMMARY' ||
      (t.name && (t.name.includes('เล่ม') || t.name.includes('รายงานผล') || t.name.toLowerCase().includes('full_summary'))) ||
      (t.file_name && (t.file_name.includes('เล่ม') || t.file_name.includes('รายงานผล') || t.file_name.toLowerCase().includes('full_summary')))
    );
  }

  if (!summaryTpl) {
    summaryTpl = templates.find((t: any) =>
      t.default_type === 'FULL_SUMMARY' ||
      t.default_type === 'SHORT_SUMMARY' ||
      t.default_type === 'SUMMARY' ||
      (t.name && (t.name.includes('สรุป') || t.name.includes('แผ่นเดียว') || t.name.includes('เล่ม'))) ||
      (t.file_name && (t.file_name.includes('สรุป') || t.file_name.includes('แผ่นเดียว') || t.file_name.includes('เล่ม')))
    );
  }

  if (!summaryTpl && templates.length > 0) {
    summaryTpl = templates[0];
  }

  if (!summaryTpl) {
    throw new Error('ไม่พบไฟล์แม่แบบสรุปโครงการบนระบบ');
  }

  const resolvedPath = resolveTemplateFilePath(summaryTpl.file_path);
  if (!resolvedPath || !fs.existsSync(resolvedPath)) {
    throw new Error(`ไม่พบไฟล์แม่แบบเอกสารที่ตำแหน่ง ${summaryTpl.file_path}`);
  }

  // Format helper
  const formatThai = (d: any) => {
    if (!d) return '-';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) {
      return String(d).replace(/พ\.ศ\.\s*/g, '');
    }
    const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    return `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear() + 543}`;
  };

  // Format objectives list
  let rawObjectives: any[] = [];
  if (Array.isArray(dynamicData.objectives) && dynamicData.objectives.length > 0) {
    rawObjectives = dynamicData.objectives;
  } else if (Array.isArray(project.objectives) && project.objectives.length > 0) {
    rawObjectives = project.objectives;
  }
  const extractText = (val: any): string => {
    if (val === null || val === undefined) return '';
    let target = val;
    if (typeof target === 'string' && (target.startsWith('{') || target.startsWith('['))) {
      try { target = JSON.parse(target); } catch {}
    }
    if (typeof target === 'object' && target !== null) {
      return target.description || target.title || target.name || target.item || target.text || Object.values(target)[0] || '';
    }
    return String(target);
  };

  const formattedObjectives = rawObjectives.map((obj: any, idx: number) => {
    const text = extractText(obj);
    return {
      _index: idx + 1,
      index: idx + 1,
      item: text,
      name: text,
      title: text,
      description: text,
    };
  });

  // Determine start / end dates
  let rawStartDate: any = '';
  let rawEndDate: any = '';

  for (const [_, v] of Object.entries(dynamicData)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const obj = v as any;
      if (obj.start && !rawStartDate) rawStartDate = obj.start;
      if (obj.end && !rawEndDate) rawEndDate = obj.end;
      if (obj.startDate && !rawStartDate) rawStartDate = obj.startDate;
      if (obj.endDate && !rawEndDate) rawEndDate = obj.endDate;
    }
  }

  if (Array.isArray(project.timelines) && project.timelines.length > 0) {
    if (!rawStartDate && project.timelines[0].start_date) {
      rawStartDate = project.timelines[0].start_date;
    }
    const lastTimeline = project.timelines[project.timelines.length - 1];
    if (!rawEndDate && (lastTimeline.end_date || lastTimeline.start_date)) {
      rawEndDate = lastTimeline.end_date || lastTimeline.start_date;
    }
  }

  if (!rawStartDate || !rawEndDate) {
    for (const [_, v] of Object.entries(dynamicData)) {
      if (typeof v === 'string' && (v.includes('ถึง') || v.includes(' – ') || v.includes(' - '))) {
        const parts = v.split(/\s+(?:ถึง|–|-)\s+/);
        if (parts.length >= 2) {
          if (!rawStartDate) rawStartDate = parts[0].trim();
          if (!rawEndDate) rawEndDate = parts[1].trim();
          break;
        }
      }
    }
  }

  if (!rawStartDate) {
    rawStartDate = dynamicData.start_date || dynamicData.real_date_start || dynamicData.project_start_date || (project as any).start_date || '';
  }
  if (!rawEndDate) {
    rawEndDate = dynamicData.end_date || dynamicData.real_date_end || dynamicData.project_end_date || (project as any).end_date || rawStartDate;
  }

  const formattedStartDate = formatThai(rawStartDate);
  const formattedEndDate = formatThai(rawEndDate || rawStartDate);

  const totalBudgetNum = Number(project.total_budget || 0);
  const allocatedBudgetNum = Number(dynamicData.allocated_budget || totalBudgetNum);
  const spentBudgetNum = Number(dynamicData.actual_spent || dynamicData.expenditure_performance || project.actual_spent || totalBudgetNum);

  let calculatedDurationText = '';
  if (formattedStartDate && formattedEndDate && formattedStartDate !== '-' && formattedEndDate !== '-') {
    calculatedDurationText = formattedStartDate === formattedEndDate ? formattedStartDate : `${formattedStartDate} ถึง ${formattedEndDate}`;
  } else {
    calculatedDurationText = (formattedStartDate !== '-' ? formattedStartDate : '') || (formattedEndDate !== '-' ? formattedEndDate : '') || formatThai(new Date());
  }

  const finalDurationText = calculatedDurationText || dynamicData.duration_text || '';

  // Resolve System Settings for Deputies & Director
  let settingsMap = new Map<string, string>();
  try {
    const allSettings = await (prisma as any).systemSetting.findMany();
    settingsMap = new Map<string, string>(allSettings.map((s: any) => [s.key, s.value]));
  } catch {}

  const divCode = (project.department?.division?.code || '').toLowerCase();
  const divName = project.department?.division?.name || 'ฝ่ายวิชาการ';
  
  // Resolve Deputy of project's division
  let resolvedDeputyName = dynamicData.deputy_name || settingsMap.get(`deputy_name_${divCode}`) || settingsMap.get(`deputy_${divCode}_name`) || '';
  let resolvedDeputyPosition = dynamicData.deputy_position || settingsMap.get(`deputy_position_${divCode}`) || settingsMap.get(`deputy_${divCode}_position`) || `รองผู้อำนวยการ${divName}`;
  
  // Resolve Deputy of Strategic/Planning
  let resolvedDeputyStratName = dynamicData.deputy_strat_name || settingsMap.get('deputy_name_strat') || settingsMap.get('deputy_strat_name') || '';
  let resolvedDirectorName = dynamicData.director_name || settingsMap.get('director_name') || 'นางปิยะพร พูลเพิ่ม';

  if (!resolvedDeputyName && project.department?.division_id) {
    const deputyUser = await prisma.user.findFirst({
      where: {
        role: 'DEPUTY_DIRECTOR',
        department: { division_id: project.department.division_id },
      },
    });
    if (deputyUser) {
      resolvedDeputyName = deputyUser.full_name;
      if (deputyUser.position) resolvedDeputyPosition = deputyUser.position;
    }
  }

  if (!resolvedDeputyStratName) {
    const stratDiv = await prisma.division.findFirst({ where: { code: 'STRAT' } });
    if (stratDiv) {
      const deputyStratUser = await prisma.user.findFirst({
        where: {
          role: 'DEPUTY_DIRECTOR',
          department: { division_id: stratDiv.id },
        },
      });
      if (deputyStratUser) {
        resolvedDeputyStratName = deputyStratUser.full_name;
      }
    }
  }

  const formDataForDocx: Record<string, any> = {
    ...dynamicData,
    title: project.title,
    project_name: project.title,
    fiscal_year: project.fiscal_year,
    project_code: project.project_code || 'ยังไม่ออกรหัส',
    department_name: dynamicData.department_name || project.department?.name || '',
    division_name: dynamicData.division_name || project.department?.division?.name || 'ฝ่ายวิชาการ',
    leader_name: project.leader?.full_name || '',
    leader_position: project.leader?.position || 'ครู',
    reporter_name: dynamicData.reporter_name || project.leader?.full_name || '',
    reporter_position: dynamicData.reporter_position || project.leader?.position || 'ครู',
    doc_date: formatThai(dynamicData.doc_date || new Date()),
    doc_date_full: formatThai(dynamicData.doc_date || new Date()),
    report_date: formatThai(dynamicData.doc_date || new Date()),
    date: formatThai(dynamicData.doc_date || new Date()),
    today: formatThai(dynamicData.doc_date || new Date()),
    start_date: formattedStartDate,
    end_date: formattedEndDate,
    start_date_thai: formattedStartDate,
    end_date_thai: formattedEndDate,
    duration_text: finalDurationText,
    duration: finalDurationText,
    project_duration: finalDurationText,
    duration_thai: finalDurationText,
    subject: dynamicData.subject || (`รายงานผลการดำเนินงานโครงการ ${project.title}`),
    report_subject: dynamicData.report_subject || (`รายงานผลการดำเนินงานการปฏิบัติการ/${project.title}`),
    memo_dept: dynamicData.memo_dept || project.department?.name || '',
    memo_paragraph1: dynamicData.memo_paragraph1 || (`ตามที่ แผนก/งาน ได้รับอนุมัติให้ดำเนินโครงการ ${project.title} ประจำปีงบประมาณ พ.ศ. ${project.fiscal_year} นั้น`),
    memo_paragraph2: dynamicData.memo_paragraph2 || 'บัดนี้ การดำเนินงานตามโครงการดังกล่าวได้เสร็จสิ้นเป็นที่เรียบร้อยแล้ว จึงขอรายงานผลการดำเนินงานตามเอกสารที่แนบมาพร้อมนี้',
    intro_paragraph: dynamicData.intro_paragraph || project.background || '',
    qa_standard: dynamicData.qa_standard || 'มาตรฐานที่ ๑ คุณลักษณะของผู้สำเร็จการศึกษาอาชีวศึกษาที่พึงประสงค์',
    qa_issue: dynamicData.qa_issue || '๑.๑ ด้านความรู้ ความสามารถ และทักษะการปฏิบัติงาน',
    qa_aspect: dynamicData.qa_aspect || 'ด้านสมรรถนะวิชาชีพและเทคโนโลยี',
    real_date_start: formatThai(dynamicData.real_date_start || rawStartDate),
    real_date_end: formatThai(dynamicData.real_date_end || rawEndDate || rawStartDate),
    target_quantitative: dynamicData.target_quantitative || (project.target_groups as any)?.quantitative || '',
    target_qualitative: dynamicData.target_qualitative || (project.target_groups as any)?.qualitative || '',
    activities_summary: dynamicData.activities_summary || dynamicData.key_achievements || '-',
    actual_results: dynamicData.actual_results || dynamicData.key_achievements || dynamicData.actual_result_quantitative || '-',
    actual_result_quantitative: dynamicData.actual_result_quantitative || '-',
    actual_result_qualitative: dynamicData.actual_result_qualitative || '-',
    operation_status: dynamicData.operation_status || 'ดำเนินงานแล้ว',
    total_budget: totalBudgetNum.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
    allocated_budget: allocatedBudgetNum.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
    actual_spent: spentBudgetNum.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
    expenditure_performance: spentBudgetNum.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
    budget_fund_type: dynamicData.budget_fund_type || '-',
    spending_status: dynamicData.spending_status || '-',
    spending_diff_amount: dynamicData.spending_diff_amount || '-',
    evaluation_rating: dynamicData.evaluation_rating || '-',
    project_strengths: dynamicData.project_strengths || '-',
    project_weaknesses: dynamicData.project_weaknesses || '-',
    problems_obstacles: dynamicData.problems_obstacles_text || dynamicData.obstacles_and_solutions || (Array.isArray(dynamicData.problems_obstacles) ? dynamicData.problems_obstacles.join(', ') : (dynamicData.problems_obstacles || '-')),
    project_suggestions: dynamicData.project_suggestions || dynamicData.summary_notes || '-',
    dissemination_channel: dynamicData.dissemination_channel || 'เว็บไซต์',
    dissemination_other: dynamicData.dissemination_other || '',
    head_dept_name: dynamicData.head_dept_name || '',
    deputy_name: resolvedDeputyName,
    deputy_position: resolvedDeputyPosition,
    deputy_strat_name: resolvedDeputyStratName,
    director_name: resolvedDirectorName,
    objectives: formattedObjectives,
    timelines: (project.timelines || []).map((t: any, idx: number) => ({
      _index: idx + 1,
      index: idx + 1,
      activity_name: t.activity_name,
      start_date: formatThai(t.start_date),
      end_date: formatThai(t.end_date),
      location: t.location || '',
    })),
    budget_items: (project.budget_items || []).map((b: any, idx: number) => ({
      _index: idx + 1,
      no: idx + 1,
      description: b.description,
      category: b.category?.name || '',
      quantity: Number(b.quantity),
      unit: b.unit,
      unit_price: Number(b.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 }),
      total_amount: Number(b.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 }),
    })),
    // Activity images fallbacks
    activity_image_1: dynamicData.activity_image_1 || '',
    activity_image_2: dynamicData.activity_image_2 || '',
    activity_image_3: dynamicData.activity_image_3 || '',
    activity_image_4: dynamicData.activity_image_4 || '',
  };

  const renderResult = await renderDynamicDocx(resolvedPath, formDataForDocx, summaryTpl.tags || []);
  const safeTitle = (project.title || 'summary').replace(/[/\\:*?"<>|]/g, '_').slice(0, 40);

  return {
    project,
    summaryTpl,
    formDataForDocx,
    renderResult,
    safeTitle,
  };
}

// Handler helper for export summary docx
const handleExportSummaryDocx = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const templateType = (req.query.type as string) || req.body?.type;
    const templateId = req.query.templateId || req.body?.templateId;
    const dynamicDataOverride = req.body?.dynamicData || req.body?.dynamic_data;

    const { project, summaryTpl, renderResult, safeTitle } = await generateProjectSummaryDocx(id, {
      templateType,
      templateId,
      dynamicDataOverride,
    });

    let prefix = 'สรุปผลโครงการ_';
    if (templateType === 'SHORT_SUMMARY' || summaryTpl?.default_type === 'SHORT_SUMMARY') {
      prefix = 'สรุปโครงการ_แผ่นเดียว_';
    } else if (templateType === 'FULL_SUMMARY' || summaryTpl?.default_type === 'FULL_SUMMARY') {
      prefix = 'เล่มสรุปผลโครงการ_';
    }

    const downloadFileName = prefix + safeTitle + '.docx';
    const encodedFileName = encodeURIComponent(downloadFileName);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="project_summary_${project.id}.docx"; filename*=UTF-8''${encodedFileName}`);
    return res.send(renderResult.buffer);
  } catch (error: any) {
    console.error('Export summary docx error:', error);
    let detailedMsg = error.message || 'เกิดข้อผิดพลาดในการสร้างไฟล์ Word สรุปโครงการ';
    if (error.properties && error.properties.errors && Array.isArray(error.properties.errors)) {
      const subErrors = error.properties.errors.map((e: any) => e.message || e.id || JSON.stringify(e)).join('; ');
      detailedMsg += ` (${subErrors})`;
    }
    return res.status(500).json({ success: false, message: detailedMsg, error: detailedMsg });
  }
};

// Handler helper for export summary pdf
const handleExportSummaryPdf = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const templateType = (req.query.type as string) || req.body?.type;
    const templateId = req.query.templateId || req.body?.templateId;
    const dynamicDataOverride = req.body?.dynamicData || req.body?.dynamic_data;

    const { project, summaryTpl, renderResult, safeTitle } = await generateProjectSummaryDocx(id, {
      templateType,
      templateId,
      dynamicDataOverride,
    });

    const docxPath = renderResult.filePath;
    const pdfName = renderResult.fileName.replace(/\.docx$/i, '.pdf');
    const pdfPath = path.join(EXPORTS_DIR, pdfName);

    await convertDocxToPdf(docxPath, pdfPath);

    if (!fs.existsSync(pdfPath)) {
      throw new Error('ไม่สามารถแปลงไฟล์เอกสารเป็น PDF ได้');
    }

    let prefix = 'สรุปผลโครงการ_';
    if (templateType === 'SHORT_SUMMARY' || summaryTpl?.default_type === 'SHORT_SUMMARY') {
      prefix = 'สรุปโครงการ_แผ่นเดียว_';
    } else if (templateType === 'FULL_SUMMARY' || summaryTpl?.default_type === 'FULL_SUMMARY') {
      prefix = 'เล่มสรุปผลโครงการ_';
    }

    const downloadFileName = prefix + safeTitle + '.pdf';
    const encodedFileName = encodeURIComponent(downloadFileName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="project_summary_${project.id}.pdf"; filename*=UTF-8''${encodedFileName}`);
    
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error('Export summary pdf error:', error);
    let detailedMsg = error.message || 'เกิดข้อผิดพลาดในการสร้างไฟล์ PDF สรุปโครงการ';
    return res.status(500).json({ success: false, message: detailedMsg, error: detailedMsg });
  }
};

router.get('/:id/export-summary-docx', handleExportSummaryDocx);
router.post('/:id/export-summary-docx', handleExportSummaryDocx);

router.get('/:id/export-summary-pdf', handleExportSummaryPdf);
router.post('/:id/export-summary-pdf', handleExportSummaryPdf);

// PATCH /api/v1/projects/:id/execution-status (Update post-approval execution sub-status)
router.patch('/:id/execution-status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { execution_status, note } = req.body;
    const projectId = BigInt(id);

    const userRole = String(req.user?.role || '');
    const isPlannerOrAdmin = userRole === 'PLANNING_OFFICER' || userRole === 'ADMIN' || userRole === 'DIRECTOR';

    if (!isPlannerOrAdmin) {
      return res.status(403).json({ success: false, message: 'เฉพาะเจ้าหน้าที่งานแผนงานหรือผู้ดูแลระบบเท่านั้นที่สามารถปรับสถานะการดำเนินโครงการได้' });
    }

    const validStatuses = ['approved', 'permitted', 'in_progress', 'completed'];
    if (!validStatuses.includes(execution_status)) {
      return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง (ต้องเป็น approved, permitted, in_progress หรือ completed)' });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { leader: true },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลโครงการ' });
    }

    // Map execution sub-status to Prisma ProjectStatus
    let dbStatus: ProjectStatus = ProjectStatus.approved;
    if (execution_status === 'completed') {
      dbStatus = ProjectStatus.completed;
    } else if (execution_status === 'in_progress' || execution_status === 'permitted') {
      dbStatus = ProjectStatus.in_progress;
    } else {
      dbStatus = ProjectStatus.approved;
    }

    // Parse and update dynamic_data to store execution_sub_status & timestamps
    let dynamicDataObj: any = {};
    if (project.dynamic_data) {
      try {
        dynamicDataObj = typeof project.dynamic_data === 'string' ? JSON.parse(project.dynamic_data) : project.dynamic_data;
      } catch (e) {
        dynamicDataObj = {};
      }
    }

    dynamicDataObj.execution_sub_status = execution_status;
    dynamicDataObj.execution_status_updated_at = new Date().toISOString();
    dynamicDataObj.execution_status_updated_by = req.user?.full_name || userRole;
    if (note) {
      dynamicDataObj.execution_status_note = note;
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        status: dbStatus,
        dynamic_data: JSON.stringify(dynamicDataObj) as any,
      },
      include: {
        department: { include: { division: true } },
        leader: true,
      },
    });

    // Notify Project Leader about status update
    const statusTitles: Record<string, string> = {
      approved: 'อนุมัติโครงการ',
      permitted: 'อนุญาตดำเนินโครงการ',
      in_progress: 'ดำเนินโครงการ',
      completed: 'สรุปผลโครงการแล้ว',
    };

    try {
      await notificationService.createNotification({
        userId: project.leader_id,
        title: `📢 อัปเดตสถานะโครงการ: "${project.title}"`,
        message: `สถานะการดำเนินงานถูกปรับเป็น: "${statusTitles[execution_status] || execution_status}" โดย ${req.user?.full_name || 'งานแผนงาน'}`,
        type: NotificationType.PROJECT_APPROVED,
        linkUrl: `/projects/${project.id}`,
      });
    } catch (err) {
      console.error('Execution status notification error:', err);
    }

    // Broadcast SSE
    try {
      sseManager.broadcast('data_update', {
        scope: 'PROJECTS',
        action: 'EXECUTION_STATUS_UPDATED',
        projectId: project.id.toString(),
        execution_status,
        status: dbStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    return res.json({
      success: true,
      message: `ปรับสถานะเป็น "${statusTitles[execution_status] || execution_status}" เรียบร้อยแล้ว`,
      data: serializeBigInt(updated),
    });
  } catch (error: any) {
    console.error('Update execution status error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการปรับสถานะโครงการ', error: error.message });
  }
});

export default router;


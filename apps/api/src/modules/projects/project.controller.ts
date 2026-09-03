import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma, serializeBigInt } from '../../lib/prisma';
import { authenticate, optionalAuthenticate, AuthRequest } from '../../middlewares/auth';
import { ApprovalStatus, ProjectStatus, NotificationType } from '@prisma/client';
import { renderDynamicDocx } from '../../lib/docx-generator';
import { scanDocxTemplate } from '../../lib/docx-scanner';
import { notificationService } from '../notifications/notification.service';

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
    const template = await (prisma as any).documentTemplate.findFirst({
      where: { default_type: 'PROPOSAL', is_active: true },
      include: {
        tags: {
          orderBy: { sort_order: 'asc' }
        }
      }
    });

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
      orderBy: { created_at: 'desc' },
    });

    return res.json({ success: true, data: serializeBigInt(projects) });
  } catch (error: any) {
    console.error('Fetch projects error:', error);  return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโครงการ', error: error.message });
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
    const deptId = department_id ? parseInt(department_id) : (req.user!.department_id || 1);

    // Calculate total budget
    const totalBudget = budget_items.reduce((sum: number, item: any) => {
      const q = parseFloat(item.quantity) || 0;
      const p = parseFloat(item.unit_price) || 0;
      return sum + q * p;
    }, 0);

    const project = await prisma.project.create({
      data: {
        title,
        fiscal_year: parseInt(fiscal_year) || 2569,
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
            comment: 'çŠ§ï½ªçŠ¹è¬‚ï½¸ï¿½ï½¹Â€çŠ§ï½ªçŠ§å­ï½¸ï½­çŠ¹ã‚‚ï½¸ï¿½ï½¸ï½£çŠ§ï¿½ï½¸â‰’ï½¸ï½²çŠ§ï½£ çŠ§ï½£çŠ§ï½­çŠ§ï½«çŠ§ï½±çŠ§ï½§çŠ§ï½«çŠ§å­ï½¹éœžï½¸ï½²çŠ¹â‰’ï½¸æ†«ï½¸å­ï½¸ï¿½/çŠ§ï¿½ï½¸ï½²çŠ§å­ï½¸æ¨…ï½¸ï½´çŠ§è¬‚ï½¸ï½²çŠ§ï½£çŠ§å†…ï½¸ï½²',
          },
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'çŠ§å£Ÿï½¸ï½±çŠ§å­ï½¸ä¼¶ï½¸ï½¶çŠ§â‰’ï½¸ã‚‚ï½¹éœžï½¸ï½­çŠ§ï½¡çŠ§ï½¹çŠ§ï½¥çŠ¹ã‚‚ï½¸ï¿½ï½¸ï½£çŠ§ï¿½ï½¸â‰’ï½¸ï½²çŠ§ï½£çŠ§ï½ªçŠ§ï½³çŠ¹Â€çŠ§ï½£çŠ¹ï¿½ï½¸ï¿½',
      data: serializeBigInt(project),
    });
  } catch (error: any) {
    console.error('Create project error:', error);  return res.status(500).json({ success: false, message: 'çŠ¹Â€çŠ§â‰’ï½¸ï½´çŠ§æ‰‰ï½¸ã‚‚ï½¹éœžï½¸ï½­çŠ§æ†«ï½¸ï½´çŠ§æ‰‰ï½¸æ¨…ï½¸ï½¥çŠ§ï½²çŠ§ï¿½', error: error.message });
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
          fiscal_year: fiscal_year !== undefined ? parseInt(fiscal_year) : existingProject.fiscal_year,
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
      include: { documents: true },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลโครงการ' });
    }

    // Permission check: only leader or admin can delete
    if (project.leader_id !== BigInt(req.user!.id) && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ในการลบโครงการนี้' });
    }

    // Status check: only draft status can be deleted
    if (project.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'สามารถลบได้เฉพาะโครงการที่ยังเป็นแบบร่าง (Draft) เท่านั้น',
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

    return res.json({
      success: true,
      message: 'ลบโครงการแบบร่างเรียบร้อยแล้ว',
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

    // Update status to submitted
    await prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.submitted },
    });

    // Find Head of department
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
      // Upsert Step 1 approval
      await prisma.projectApproval.create({
        data: {
          project_id: projectId,
          step_order: 1,
          approver_id: head.id,
          status: ApprovalStatus.PENDING,
          comment: 'เสนอขออนุมัติโครงการตามสายการบังคับบัญชา',
        },
      });

      // Send In-app, Real-time SSE & Email Notification to Head of Department
      notificationService.createNotification({
        userId: head.id,
        title: 'มีโครงการใหม่รอพิจารณาอนุมัติ (ขั้นที่ 1)',
        message: `โครงการ "${project.title}" ถูกเสนอโดย ${req.user!.full_name} รอการพิจารณาเห็นชอบจากท่าน`,
        type: NotificationType.PROJECT_SUBMITTED,
        linkUrl: `/approvals`,
      }).catch(err => console.error('Notification dispatch error:', err));
    }

    return res.json({ success: true, message: 'ส่งเสนอโครงการเข้าสู่สายการอนุมัติเรียบร้อยแล้ว' });
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

    if (project.status === 'draft') {
      return res.status(400).json({
        success: false,
        message: 'โครงการยังอยู่ในสถานะแบบร่าง (Draft) ไม่สามารถอัปโหลดไฟล์แนบได้ กรุณาเสนอโครงการก่อน',
      });
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
router.get('/documents/:docId/download', authenticate, async (req: AuthRequest, res: Response) => {
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

// GET /api/v1/projects/:id/export-summary-docx (Download project summary report as DOCX)
router.get('/:id/export-summary-docx', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
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
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลโครงการ' });
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

    // Find summary template
    const templates = await (prisma as any).documentTemplate.findMany({
      where: { is_active: true },
      include: { tags: true },
      orderBy: [{ created_at: 'desc' }],
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

    // Format helper
    const formatThai = (d: any) => {
      if (!d) return '-';
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return String(d);
      const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
      return `${dateObj.getDate()} ${months[dateObj.getMonth()]} พ.ศ. ${dateObj.getFullYear() + 543}`;
    };

    // Format objectives list
    let rawObjectives: any[] = [];
    if (Array.isArray(dynamicData.objectives) && dynamicData.objectives.length > 0) {
      rawObjectives = dynamicData.objectives;
    } else if (Array.isArray(project.objectives) && project.objectives.length > 0) {
      rawObjectives = project.objectives;
    }
    const formattedObjectives = rawObjectives.map((obj: any, idx: number) => {
      const text = typeof obj === 'object' && obj !== null ? (obj.title || obj.name || obj.item || JSON.stringify(obj)) : String(obj);
      return {
        _index: idx + 1,
        item: text,
        name: text,
        title: text,
      };
    });

    // Format problems list
    let rawProblems: any[] = [];
    if (Array.isArray(dynamicData.problems_obstacles) && dynamicData.problems_obstacles.length > 0) {
      rawProblems = dynamicData.problems_obstacles;
    }
    const formattedProblems = rawProblems.map((p: any, idx: number) => {
      const text = typeof p === 'object' && p !== null ? (p.title || p.name || p.item || JSON.stringify(p)) : String(p);
      return {
        _index: idx + 1,
        item: text,
        name: text,
        title: text,
      };
    });

    const startDate = project.timelines?.[0]?.start_date;
    const endDate = project.timelines?.[project.timelines.length - 1]?.end_date;

    const totalBudgetNum = Number(project.total_budget || 0);
    const allocatedBudgetNum = Number(dynamicData.allocated_budget || totalBudgetNum);
    const spentBudgetNum = Number(dynamicData.expenditure_performance || project.actual_spent || totalBudgetNum);

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
      report_date: formatThai(dynamicData.doc_date || new Date()),
      subject: dynamicData.subject || (`รายงานผลการดำเนินงานโครงการ ${project.title}`),
      report_subject: dynamicData.report_subject || (`รายงานผลการดำเนินงานการปฏิบัติการ/${project.title}`),
      memo_dept: dynamicData.memo_dept || project.department?.name || '',
      memo_paragraph1: dynamicData.memo_paragraph1 || (`ตามที่ แผนก/งาน ได้รับอนุมัติให้ดำเนินโครงการ ${project.title} ประจำปีงบประมาณ พ.ศ. ${project.fiscal_year} นั้น`),
      memo_paragraph2: dynamicData.memo_paragraph2 || 'บัดนี้ การดำเนินงานตามโครงการดังกล่าวได้เสร็จสิ้นเป็นที่เรียบร้อยแล้ว จึงขอรายงานผลการดำเนินงานตามเอกสารที่แนบมาพร้อมนี้',
      intro_paragraph: dynamicData.intro_paragraph || project.background || '',
      qa_standard: dynamicData.qa_standard || 'มาตรฐานที่ ๑ คุณลักษณะของผู้สำเร็จการศึกษาอาชีวศึกษาที่พึงประสงค์',
      qa_issue: dynamicData.qa_issue || '๑.๑ ด้านความรู้ ความสามารถ และทักษะการปฏิบัติงาน',
      qa_aspect: dynamicData.qa_aspect || 'ด้านสมรรถนะวิชาชีพและเทคโนโลยี',
      start_date: formatThai(startDate),
      end_date: formatThai(endDate),
      real_date_start: formatThai(dynamicData.real_date_start || startDate),
      real_date_end: formatThai(dynamicData.real_date_end || endDate),
      target_quantitative: dynamicData.target_quantitative || (project.target_groups as any)?.quantitative || '',
      target_qualitative: dynamicData.target_qualitative || (project.target_groups as any)?.qualitative || '',
      actual_result_quantitative: dynamicData.actual_result_quantitative || '',
      actual_result_qualitative: dynamicData.actual_result_qualitative || '',
      operation_status: dynamicData.operation_status || 'ดำเนินงานแล้ว',
      total_budget: totalBudgetNum.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
      allocated_budget: allocatedBudgetNum.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
      expenditure_performance: spentBudgetNum.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
      budget_fund_type: dynamicData.budget_fund_type || 'เงินอุดหนุนโครงการสนับสนุนค่าใช้จ่ายในการจัดการศึกษาตั้งแต่ระดับอนุบาลจนจบการศึกษาขั้นพื้นฐาน',
      spending_status: dynamicData.spending_status || 'ใช้เงินตามแผน',
      spending_diff_amount: dynamicData.spending_diff_amount || '',
      evaluation_rating: dynamicData.evaluation_rating || 'ดีเลิศ',
      project_strengths: dynamicData.project_strengths || '',
      project_weaknesses: dynamicData.project_weaknesses || '',
      project_suggestions: dynamicData.project_suggestions || '',
      dissemination_channel: dynamicData.dissemination_channel || 'เว็บไซต์',
      dissemination_other: dynamicData.dissemination_other || '',
      head_dept_name: dynamicData.head_dept_name || '',
      deputy_name: dynamicData.deputy_name || '',
      director_name: dynamicData.director_name || 'นางปิยะพร พูลเพิ่ม',
      objectives: formattedObjectives,
      problems_obstacles: formattedProblems,
      timelines: (project.timelines || []).map((t: any, idx: number) => ({
        _index: idx + 1,
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
    };

    const { buffer } = await renderDynamicDocx(summaryTpl.file_path, formDataForDocx, summaryTpl.tags || []);

    const safeTitle = (project.title || 'summary').replace(/[/\\:*?"<>|]/g, '_').slice(0, 40);
    const downloadFileName = 'สรุปผลโครงการ_' + safeTitle + '.docx';
    const encodedFileName = encodeURIComponent(downloadFileName);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="project_summary_${project.id}.docx"; filename*=UTF-8''${encodedFileName}`);
    return res.send(buffer);
  } catch (error: any) {
    console.error('Export summary docx error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างไฟล์ Word สรุปโครงการ', error: error.message });
  }
});

export default router;

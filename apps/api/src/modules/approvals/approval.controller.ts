import { Router, Response } from 'express';
import { prisma, serializeBigInt } from '../../lib/prisma';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { ApprovalStatus, ProjectStatus, Role, NotificationType } from '@prisma/client';
import { notificationService } from '../notifications/notification.service';

const router = Router();

// Helper to generate project code: PRJ-YYYY-[DIV]-XXXX with collision prevention
async function generateProjectCode(fiscalYear: number, divisionCode: string): Promise<string> {
  const existingProjects = await prisma.project.findMany({
    where: {
      fiscal_year: fiscalYear,
      project_code: { not: null },
    },
    select: { project_code: true },
  });

  let maxSeq = 0;
  for (const p of existingProjects) {
    if (p.project_code) {
      const parts = p.project_code.split('-');
      const lastPart = parts[parts.length - 1];
      const num = parseInt(lastPart, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  let nextSeq = maxSeq + 1;
  let candidateCode = `PRJ-${fiscalYear}-${divisionCode}-${nextSeq.toString().padStart(4, '0')}`;

  // Ensure code does not collide with any existing project in database
  while (await prisma.project.findUnique({ where: { project_code: candidateCode } })) {
    nextSeq++;
    candidateCode = `PRJ-${fiscalYear}-${divisionCode}-${nextSeq.toString().padStart(4, '0')}`;
  }

  return candidateCode;
}

// Reusable single approval processor with Prisma Transaction
async function executeApprovalAction(approvalId: bigint, action: 'APPROVE' | 'REVISE' | 'REJECT', comment: string | undefined, approverId: bigint) {
  const approval = await prisma.projectApproval.findUnique({
    where: { id: approvalId },
    include: {
      project: {
        include: {
          department: {
            include: {
              division: true,
            },
          },
        },
      },
    },
  });

  if (!approval) {
    throw new Error(`ไม่พบรายการอนุมัติรหัส ${approvalId}`);
  }

  const project = approval.project;
  const now = new Date();

  if (action === 'APPROVE') {
    let nextStepOrder: number | null = null;
    let nextApproverId: bigint | null = null;
    let nextComment = '';
    let newProjectStatus: ProjectStatus = project.status;
    let assignedProjectCode: string | null = project.project_code;

    if (approval.step_order === 1) {
      // Step 1 -> Step 2 (Deputy Director)
      newProjectStatus = ProjectStatus.dept_approved;
      nextStepOrder = 2;
      const deputy =
        (await prisma.user.findFirst({
          where: {
            role: Role.DEPUTY_DIRECTOR,
            department: { division_id: project.department.division_id },
          },
        })) ||
        (await prisma.user.findFirst({
          where: { role: Role.DEPUTY_DIRECTOR },
        })) ||
        (await prisma.user.findFirst({
          where: { role: Role.ADMIN },
        }));

      nextApproverId = deputy ? deputy.id : approverId;
      nextComment = 'ผ่านการเห็นชอบจากหัวหน้าแผนก รอรองผู้อำนวยการประจำฝ่ายพิจารณา';

    } else if (approval.step_order === 2) {
      // Step 2 -> Step 3 (Planning Officer)
      newProjectStatus = ProjectStatus.deputy_approved;
      nextStepOrder = 3;
      const planningOfficer =
        (await prisma.user.findFirst({
          where: { role: Role.PLANNING_OFFICER },
        })) ||
        (await prisma.user.findFirst({
          where: { role: Role.ADMIN },
        }));

      nextApproverId = planningOfficer ? planningOfficer.id : approverId;
      nextComment = 'ผ่านการเห็นชอบจากรอง ผอ. รอเจ้าหน้าที่งานแผนงานตรวจสอบงบประมาณและออกรหัส';

    } else if (approval.step_order === 3) {
      // Step 3 -> Step 4 (Director) + Generate Project Code
      newProjectStatus = ProjectStatus.planning_approved;
      nextStepOrder = 4;

      const divisionCode = project.department?.division?.code || 'GEN';
      if (!assignedProjectCode) {
        assignedProjectCode = await generateProjectCode(project.fiscal_year, divisionCode);
      }

      const director =
        (await prisma.user.findFirst({
          where: { role: Role.DIRECTOR },
        })) ||
        (await prisma.user.findFirst({
          where: { role: Role.ADMIN },
        }));

      nextApproverId = director ? director.id : approverId;
      nextComment = `ผ่านการตรวจสอบจากงานแผนงาน ออกรหัสโครงการ: ${assignedProjectCode} รอผู้อำนวยการอนุมัติขั้นสุดท้าย`;

    } else if (approval.step_order === 4) {
      // Step 4 -> Final APPROVED
      newProjectStatus = ProjectStatus.approved;
    }

    // Execute atomic transaction for approval advancing
    await prisma.$transaction(async (tx) => {
      // 1. Update current approval
      await tx.projectApproval.update({
        where: { id: approval.id },
        data: {
          status: ApprovalStatus.APPROVED,
          approver_id: approverId,
          comment: comment || 'อนุมัติเห็นชอบ',
          signed_at: now,
        },
      });

      // 2. Update project status & project code
      await tx.project.update({
        where: { id: project.id },
        data: {
          status: newProjectStatus,
          ...(assignedProjectCode ? { project_code: assignedProjectCode } : {}),
        },
      });

      // 3. Create next step approval if applicable
      if (nextStepOrder && nextApproverId) {
        await tx.projectApproval.create({
          data: {
            project_id: project.id,
            step_order: nextStepOrder,
            approver_id: nextApproverId,
            status: ApprovalStatus.PENDING,
            comment: nextComment,
          },
        });
      }
    });

    // Send notifications after transaction succeeds
    if (approval.step_order === 1 && nextApproverId) {
      notificationService.createNotification({
        userId: nextApproverId,
        title: 'มีโครงการรอการพิจารณาเห็นชอบ (ขั้นที่ 2 - รอง ผอ.)',
        message: `โครงการ "${project.title}" ผ่านการเห็นชอบจากหัวหน้าแผนกแล้ว รอการพิจารณาเห็นชอบจากท่าน`,
        type: NotificationType.APPROVAL_REQUIRED,
        linkUrl: '/approvals',
      }).catch(err => console.error('Notification error:', err));

      notificationService.createNotification({
        userId: project.leader_id,
        title: 'โครงการผ่านความเห็นชอบขั้นที่ 1 (หัวหน้าแผนก)',
        message: `โครงการ "${project.title}" ผ่านการเห็นชอบจากหัวหน้าแผนกวิชา/งานแล้ว และส่งต่อไปยังรอง ผอ. ประจำฝ่าย`,
        type: NotificationType.PROJECT_APPROVED,
        linkUrl: `/projects/${project.id}`,
      }).catch(err => console.error('Notification error:', err));

    } else if (approval.step_order === 2 && nextApproverId) {
      notificationService.createNotification({
        userId: nextApproverId,
        title: 'มีโครงการรอตรวจสอบงบประมาณและออกรหัส (ขั้นที่ 3 - งานแผนงาน)',
        message: `โครงการ "${project.title}" ผ่านการเห็นชอบจากรอง ผอ. ฝ่ายแล้ว รอการตรวจสอบงบประมาณและออกรหัสโครงการ`,
        type: NotificationType.APPROVAL_REQUIRED,
        linkUrl: '/approvals',
      }).catch(err => console.error('Notification error:', err));

      notificationService.createNotification({
        userId: project.leader_id,
        title: 'โครงการผ่านความเห็นชอบขั้นที่ 2 (รอง ผอ. ประจำฝ่าย)',
        message: `โครงการ "${project.title}" ผ่านการเห็นชอบจากรอง ผอ. ประจำฝ่ายแล้ว และส่งต่อไปยังงานแผนงานและงบประมาณ`,
        type: NotificationType.PROJECT_APPROVED,
        linkUrl: `/projects/${project.id}`,
      }).catch(err => console.error('Notification error:', err));

    } else if (approval.step_order === 3 && nextApproverId) {
      notificationService.createNotification({
        userId: nextApproverId,
        title: `มีโครงการรออนุมัติขั้นสุดท้าย (รหัส: ${assignedProjectCode})`,
        message: `โครงการ "${project.title}" (${assignedProjectCode}) ผ่านการตรวจสอบงบประมาณเรียบร้อยแล้ว รอผู้อำนวยการพิจารณาอนุมัติ`,
        type: NotificationType.APPROVAL_REQUIRED,
        linkUrl: '/approvals',
      }).catch(err => console.error('Notification error:', err));

      notificationService.createNotification({
        userId: project.leader_id,
        title: `โครงการผ่านการตรวจสอบงานแผนงาน (ได้รับรหัสโครงการ: ${assignedProjectCode})`,
        message: `โครงการ "${project.title}" ได้รับรหัสโครงการอย่างเป็นทางการคือ ${assignedProjectCode} และส่งต่อให้ผู้อำนวยการพิจารณาอนุมัติขั้นสุดท้าย`,
        type: NotificationType.PROJECT_APPROVED,
        linkUrl: `/projects/${project.id}`,
      }).catch(err => console.error('Notification error:', err));

    } else if (approval.step_order === 4) {
      notificationService.createNotification({
        userId: project.leader_id,
        title: `🎉 โครงการ "${project.title}" ได้รับการอนุมัติแล้ว!`,
        message: `ผู้อำนวยการได้ลงนามอนุมัติโครงการ "${project.title}" เรียบร้อยแล้ว สามารถดำเนินการจัดกิจกรรมตามกำหนดการได้`,
        type: NotificationType.PROJECT_FINAL_APPROVED,
        linkUrl: `/projects/${project.id}`,
      }).catch(err => console.error('Notification error:', err));
    }

    return {
      success: true,
      message: approval.step_order === 3
        ? `อนุมัติเห็นชอบและออกรหัสโครงการ "${assignedProjectCode}" เรียบร้อยแล้ว`
        : `อนุมัติโครงการ "${project.title}" เรียบร้อยแล้ว`
    };

  } else if (action === 'REVISE') {
    await prisma.$transaction(async (tx) => {
      await tx.projectApproval.update({
        where: { id: approval.id },
        data: {
          status: ApprovalStatus.REVISION_REQUESTED,
          approver_id: approverId,
          comment: comment || 'ขอให้แก้ไขรายละเอียดโครงการตามข้อเสนอแนะ',
          signed_at: now,
        },
      });

      await tx.project.update({
        where: { id: project.id },
        data: { status: ProjectStatus.draft },
      });
    });

    notificationService.createNotification({
      userId: project.leader_id,
      title: `⚠️ ขอให้แก้ไขโครงการ: "${project.title}"`,
      message: `ผู้อนุมัติมีข้อเสนอแนะให้ปรับปรุงแก้ไข: "${comment || 'กรุณาตรวจสอบและปรับปรุงรายละเอียดโครงการ'}"`,
      type: NotificationType.PROJECT_REVISION,
      linkUrl: `/projects/${project.id}`,
    }).catch(err => console.error('Notification error:', err));

    return { success: true, message: `ส่งคำขอแก้ไขโครงการ "${project.title}" กลับไปยังผู้เสนอเรียบร้อยแล้ว` };

  } else if (action === 'REJECT') {
    await prisma.$transaction(async (tx) => {
      await tx.projectApproval.update({
        where: { id: approval.id },
        data: {
          status: ApprovalStatus.REJECTED,
          approver_id: approverId,
          comment: comment || 'ไม่อนุมัติโครงการ',
          signed_at: now,
        },
      });

      await tx.project.update({
        where: { id: project.id },
        data: { status: ProjectStatus.rejected },
      });
    });

    notificationService.createNotification({
      userId: project.leader_id,
      title: `❌ โครงการ "${project.title}" ไม่ผ่านการอนุมัติ`,
      message: `โครงการไม่ผ่านการอนุมัติ เนื่องจาก: "${comment || 'ไม่เป็นไปตามเกณฑ์ที่กำหนด'}"`,
      type: NotificationType.PROJECT_REJECTED,
      linkUrl: `/projects/${project.id}`,
    }).catch(err => console.error('Notification error:', err));

    return { success: true, message: `ปฏิเสธโครงการ "${project.title}" เรียบร้อยแล้ว` };
  } else {
    throw new Error('Action ไม่ถูกต้อง');
  }
}

// GET /api/v1/approvals/inbox (Approvals pending for the logged in user)
router.get('/inbox', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user!.role;
    const userDeptId = req.user!.department_id;
    const userDivId = req.user!.division_id;

    let whereCondition: any = {
      status: ApprovalStatus.PENDING,
    };

    // Smart Routing based on role
    if (userRole === Role.HEAD_DEPT) {
      whereCondition.step_order = 1;
      if (userDeptId) {
        whereCondition.project = { department_id: userDeptId };
      }
    } else if (userRole === Role.DEPUTY_DIRECTOR) {
      whereCondition.step_order = 2;
      if (userDivId) {
        whereCondition.project = {
          department: { division_id: userDivId },
        };
      }
    } else if (userRole === Role.PLANNING_OFFICER) {
      whereCondition.step_order = 3;
    } else if (userRole === Role.DIRECTOR) {
      whereCondition.step_order = 4;
    } else if (userRole !== Role.ADMIN) {
      return res.json({ success: true, data: [] });
    }

    const pendingApprovals = await prisma.projectApproval.findMany({
      where: whereCondition,
      include: {
        project: {
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
            budget_items: {
              include: {
                category: true,
              },
            },
            timelines: true,
            documents: true,
          },
        },
        approver: {
          select: {
            id: true,
            full_name: true,
            role: true,
            position: true,
          },
        },
      },
      orderBy: { project: { created_at: 'desc' } },
    });

    return res.json({ success: true, data: serializeBigInt(pendingApprovals) });
  } catch (error: any) {
    console.error('Approvals inbox error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงรายการอนุมัติ', error: error.message });
  }
});

// GET /api/v1/approvals/history (History of decisions signed by the logged in user or completed approvals)
router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
    const userRole = req.user!.role;
    const userDeptId = req.user!.department_id;
    const userDivId = req.user!.division_id;

    let whereCondition: any = {
      status: {
        in: [ApprovalStatus.APPROVED, ApprovalStatus.REVISION_REQUESTED, ApprovalStatus.REJECTED],
      },
    };

    if (userRole === Role.HEAD_DEPT) {
      whereCondition.OR = [
        { approver_id: userId },
        { step_order: 1, project: { department_id: userDeptId } },
      ];
    } else if (userRole === Role.DEPUTY_DIRECTOR) {
      whereCondition.OR = [
        { approver_id: userId },
        { step_order: 2, project: { department: { division_id: userDivId } } },
      ];
    } else if (userRole === Role.PLANNING_OFFICER) {
      whereCondition.OR = [
        { approver_id: userId },
        { step_order: 3 },
      ];
    } else if (userRole === Role.DIRECTOR) {
      whereCondition.OR = [
        { approver_id: userId },
        { step_order: 4 },
      ];
    } else if (userRole !== Role.ADMIN) {
      whereCondition.approver_id = userId;
    }

    const historyApprovals = await prisma.projectApproval.findMany({
      where: whereCondition,
      include: {
        project: {
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
          },
        },
        approver: {
          select: {
            id: true,
            full_name: true,
            role: true,
            position: true,
          },
        },
      },
      orderBy: { signed_at: 'desc' },
      take: 100,
    });

    return res.json({ success: true, data: serializeBigInt(historyApprovals) });
  } catch (error: any) {
    console.error('Approvals history error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงประวัติการอนุมัติ', error: error.message });
  }
});

// GET /api/v1/approvals/pipeline-stats (Summary counts of pipeline across steps)
router.get('/pipeline-stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user!.role;
    const userDeptId = req.user!.department_id;
    const userDivId = req.user!.division_id;

    const [step1Count, step2Count, step3Count, step4Count, totalApproved, totalRevision, totalRejected] = await Promise.all([
      prisma.projectApproval.count({ where: { status: ApprovalStatus.PENDING, step_order: 1 } }),
      prisma.projectApproval.count({ where: { status: ApprovalStatus.PENDING, step_order: 2 } }),
      prisma.projectApproval.count({ where: { status: ApprovalStatus.PENDING, step_order: 3 } }),
      prisma.projectApproval.count({ where: { status: ApprovalStatus.PENDING, step_order: 4 } }),
      prisma.projectApproval.count({ where: { status: ApprovalStatus.APPROVED } }),
      prisma.projectApproval.count({ where: { status: ApprovalStatus.REVISION_REQUESTED } }),
      prisma.projectApproval.count({ where: { status: ApprovalStatus.REJECTED } }),
    ]);

    let myPendingCount = 0;
    if (userRole === Role.HEAD_DEPT) {
      myPendingCount = await prisma.projectApproval.count({
        where: {
          status: ApprovalStatus.PENDING,
          step_order: 1,
          ...(userDeptId ? { project: { department_id: userDeptId } } : {}),
        },
      });
    } else if (userRole === Role.DEPUTY_DIRECTOR) {
      myPendingCount = await prisma.projectApproval.count({
        where: {
          status: ApprovalStatus.PENDING,
          step_order: 2,
          ...(userDivId ? { project: { department: { division_id: userDivId } } } : {}),
        },
      });
    } else if (userRole === Role.PLANNING_OFFICER) {
      myPendingCount = step3Count;
    } else if (userRole === Role.DIRECTOR) {
      myPendingCount = step4Count;
    } else if (userRole === Role.ADMIN) {
      myPendingCount = step1Count + step2Count + step3Count + step4Count;
    }

    return res.json({
      success: true,
      data: {
        step1Count,
        step2Count,
        step3Count,
        step4Count,
        myPendingCount,
        totalPendingAll: step1Count + step2Count + step3Count + step4Count,
        totalApproved,
        totalRevision,
        totalRejected,
      },
    });
  } catch (error: any) {
    console.error('Approvals stats error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงสถิติสายการอนุมัติ', error: error.message });
  }
});

// GET /api/v1/approvals/routing-flow (Get routing rules and authority information)
router.get('/routing-flow', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const divisions = await prisma.division.findMany({
      include: {
        departments: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    const approvers = await prisma.user.findMany({
      where: {
        role: {
          in: [Role.HEAD_DEPT, Role.DEPUTY_DIRECTOR, Role.PLANNING_OFFICER, Role.DIRECTOR, Role.ADMIN],
        },
      },
      select: {
        id: true,
        full_name: true,
        role: true,
        position: true,
        department_id: true,
      },
    });

    return res.json({
      success: true,
      data: {
        divisions: serializeBigInt(divisions),
        approvers: serializeBigInt(approvers),
      },
    });
  } catch (error: any) {
    console.error('Routing flow error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสายการอนุมัติ', error: error.message });
  }
});

// POST /api/v1/approvals/batch-action (Batch approve or reject multiple pending items)
router.post('/batch-action', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { approval_ids, action, comment } = req.body;
    const approverId = BigInt(req.user!.id);

    if (!Array.isArray(approval_ids) || approval_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกรายการที่ต้องการอนุมัติอย่างน้อย 1 รายการ' });
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ success: false, message: 'การดำเนินการแบบกลุ่มรองรับเฉพาะ APPROVE หรือ REJECT' });
    }

    const results = [];
    const errors = [];

    for (const id of approval_ids) {
      try {
        const result = await executeApprovalAction(BigInt(id), action, comment, approverId);
        results.push(result.message);
      } catch (err: any) {
        errors.push(`รายการ ID ${id}: ${err.message}`);
      }
    }

    return res.json({
      success: errors.length === 0,
      message: `ประมวลผลสำเร็จ ${results.length} รายการ${errors.length > 0 ? ` (พบข้อผิดพลาด ${errors.length} รายการ)` : ''}`,
      data: {
        successCount: results.length,
        errorCount: errors.length,
        errors,
      },
    });
  } catch (error: any) {
    console.error('Batch approval action error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการประมวลผลคำขอแบบกลุ่ม', error: error.message });
  }
});

// POST /api/v1/approvals/:id/action (Approve, Request Revision, or Reject)
router.post('/:id/action', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, comment } = req.body; // action: 'APPROVE' | 'REVISE' | 'REJECT'
    const approverId = BigInt(req.user!.id);

    const result = await executeApprovalAction(BigInt(id), action, comment, approverId);
    return res.json(result);
  } catch (error: any) {
    console.error('Approval action error:', error);
    return res.status(500).json({ success: false, message: error.message || 'เกิดข้อผิดพลาดในการบันทึกผลการพิจารณา', error: error.message });
  }
});

export default router;

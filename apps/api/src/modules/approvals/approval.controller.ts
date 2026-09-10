import { Router, Response } from 'express';
import { prisma, serializeBigInt } from '../../lib/prisma';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { ApprovalStatus, ProjectStatus, Role, NotificationType } from '@prisma/client';
import { notificationService } from '../notifications/notification.service';
import { sseManager } from '../notifications/sse.manager';

const router = Router();

// Helper to resolve project target division from dynamic_data approver tags or department
export async function getProjectTargetDivisionId(project: any): Promise<number | null> {
  if (project.dynamic_data) {
    try {
      const parsed = typeof project.dynamic_data === 'string' ? JSON.parse(project.dynamic_data) : project.dynamic_data;
      if (parsed.approver_division_id) {
        return Number(parsed.approver_division_id);
      }
      
      const approverPos = String(parsed.endorser_position || parsed.approver_position || parsed.approver_name_position || parsed.deputy_position || '');
      const approverName = String(parsed.endorser_name || parsed.endorser || parsed.approver_name || parsed.approver || '');

      const allDivisions = await prisma.division.findMany();
      let settingsMap = new Map<string, string>();
      try {
        const settings = await (prisma as any).systemSetting.findMany();
        settingsMap = new Map<string, string>(settings.map((s: any) => [s.key, s.value]));
      } catch {
        // ignore
      }

      for (const div of allDivisions) {
        const divCodeLower = div.code.toLowerCase();
        const deputyName = settingsMap.get(`deputy_name_${divCodeLower}`) || 
                           settingsMap.get(`deputy_${divCodeLower}_name`) || 
                           settingsMap.get(`deputy_name_div_${div.id}`) || '';
        const deputyPosition = settingsMap.get(`deputy_position_${divCodeLower}`) || 
                               settingsMap.get(`deputy_${divCodeLower}_position`) || 
                               settingsMap.get(`deputy_pos_div_${div.id}`) || 
                               `รองผู้อำนวยการ${div.name}`;

        if (approverPos && deputyPosition && approverPos.includes(deputyPosition)) return div.id;
        if (approverPos && approverPos.includes(div.name)) return div.id;
        if (approverName && deputyName && approverName.includes(deputyName)) return div.id;
        if (approverName && approverName.includes(div.name)) return div.id;

        if (div.code === 'ACAD' && approverPos.includes('วิชาการ')) return div.id;
        if (div.code === 'RES' && (approverPos.includes('ทรัพยากร') || approverPos.includes('บริหาร'))) return div.id;
        if (div.code === 'DEV' && (approverPos.includes('พัฒนากิจการ') || approverPos.includes('กิจกรรม') || approverPos.includes('พัฒนานักเรียน'))) return div.id;
        if (div.code === 'STRAT' && (approverPos.includes('แผนงาน') || approverPos.includes('ความร่วมมือ'))) return div.id;
      }
    } catch {
      // ignore json error
    }
  }
  return project.department?.division_id || null;
}

// Helper to generate project code with custom template support
// Supported placeholders: {YEAR} (e.g. 2569), {YEAR2} (e.g. 69), {DIV} (e.g. ACAD), {NUM} (e.g. 0001)
async function generateProjectCode(fiscalYear: number, divisionCode: string, departmentCode?: string): Promise<string> {
  let template = 'PRJ-{YEAR}-{DIV}-{NUM}';
  let digits = 4;

  try {
    const settings = await (prisma as any).systemSetting.findMany({
      where: {
        key: { in: ['project_code_template', 'project_code_digits'] },
      },
    });
    for (const s of settings) {
      if (s.key === 'project_code_template' && s.value) template = s.value;
      if (s.key === 'project_code_digits' && s.value) digits = parseInt(s.value, 10) || 4;
    }
  } catch {
    // fallback to default
  }

  const year4 = fiscalYear.toString();
  const year2 = year4.slice(-2);
  const div = divisionCode || 'GEN';
  const dept = departmentCode || '';

  // Get all existing project codes for the current fiscal year to find the highest running number
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
      // Find all numbers in the code and inspect candidates
      const matches = p.project_code.match(/\d+/g);
      if (matches && matches.length > 0) {
        // Take the last numerical sequence which is usually the running sequence
        const lastNum = parseInt(matches[matches.length - 1], 10);
        if (!isNaN(lastNum) && lastNum > maxSeq && lastNum !== fiscalYear) {
          maxSeq = lastNum;
        }
      }
    }
  }

  let nextSeq = maxSeq + 1;

  const buildCode = (seq: number) => {
    const numStr = seq.toString().padStart(digits, '0');
    return template
      .replace(/\{YEAR\}/gi, year4)
      .replace(/\{YEAR2\}/gi, year2)
      .replace(/\{DIV\}/gi, div)
      .replace(/\{DEPT\}/gi, dept)
      .replace(/\{NUM\}/gi, numStr);
  };

  let candidateCode = buildCode(nextSeq);

  // Ensure code does not collide with any existing project in database
  while (await prisma.project.findUnique({ where: { project_code: candidateCode } })) {
    nextSeq++;
    candidateCode = buildCode(nextSeq);
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

      // Extract approver division from project's dynamic_data tags (ผู้เห็นชอบโครงการ)
      const targetDivisionId = await getProjectTargetDivisionId(project);

      const deputy =
        (targetDivisionId
          ? await prisma.user.findFirst({
              where: {
                role: Role.DEPUTY_DIRECTOR,
                department: { division_id: targetDivisionId },
              },
            })
          : null) ||
        (await prisma.user.findFirst({
          where: {
            role: Role.DEPUTY_DIRECTOR,
            department: { division_id: project.department?.division_id },
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

      const targetDivId = await getProjectTargetDivisionId(project);
      let divisionCode = 'GEN';
      if (targetDivId) {
        const div = await prisma.division.findUnique({ where: { id: targetDivId } });
        if (div?.code) divisionCode = div.code;
      }
      if (divisionCode === 'GEN' && project.department?.division?.code) {
        divisionCode = project.department.division.code;
      }

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

      // 3. Create or reset next step approval if applicable
      if (nextStepOrder && nextApproverId) {
        const existingNextStep = await tx.projectApproval.findFirst({
          where: { project_id: project.id, step_order: nextStepOrder },
        });

        if (existingNextStep) {
          await tx.projectApproval.update({
            where: { id: existingNextStep.id },
            data: {
              approver_id: nextApproverId,
              status: ApprovalStatus.PENDING,
              comment: nextComment,
              signed_at: null,
            },
          });
        } else {
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

    // Broadcast Realtime Data Update to all connected clients
    try {
      sseManager.broadcast('data_update', {
        scope: 'APPROVALS',
        action: 'APPROVED',
        projectId: project.id.toString(),
        stepOrder: approval.step_order,
        nextStepOrder,
        approverId: approverId.toString(),
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

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

    // Broadcast Realtime Data Update to all connected clients
    try {
      sseManager.broadcast('data_update', {
        scope: 'APPROVALS',
        action: 'REVISED',
        projectId: project.id.toString(),
        stepOrder: approval.step_order,
        approverId: approverId.toString(),
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

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

    // Broadcast Realtime Data Update to all connected clients
    try {
      sseManager.broadcast('data_update', {
        scope: 'APPROVALS',
        action: 'REJECTED',
        projectId: project.id.toString(),
        stepOrder: approval.step_order,
        approverId: approverId.toString(),
        timestamp: new Date().toISOString(),
      });
    } catch (e) {}

    return { success: true, message: `ปฏิเสธโครงการ "${project.title}" เรียบร้อยแล้ว` };
  } else {
    throw new Error('Action ไม่ถูกต้อง');
  }
}

// GET /api/v1/approvals/inbox (Approvals pending for the logged in user)
router.get('/inbox', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
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

    // For DEPUTY_DIRECTOR, filter results so they only see projects matching their assigned division (from tags/data) or approver_id
    let filteredApprovals = pendingApprovals;
    if (userRole === Role.DEPUTY_DIRECTOR && userDivId) {
      const matchedList = [];
      for (const item of pendingApprovals) {
        if (item.approver_id === userId) {
          matchedList.push(item);
          continue;
        }
        const targetDivId = await getProjectTargetDivisionId(item.project);
        if (targetDivId === userDivId) {
          matchedList.push(item);
        }
      }
      filteredApprovals = matchedList;
    }

    return res.json({ success: true, data: serializeBigInt(filteredApprovals) });
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
        { step_order: 2 },
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

    let filteredHistory = historyApprovals;
    if (userRole === Role.DEPUTY_DIRECTOR && userDivId) {
      const matched = [];
      for (const item of historyApprovals) {
        if (item.approver_id === userId) {
          matched.push(item);
          continue;
        }
        const targetDivId = await getProjectTargetDivisionId(item.project);
        if (targetDivId === userDivId) {
          matched.push(item);
        }
      }
      filteredHistory = matched;
    }

    return res.json({ success: true, data: serializeBigInt(filteredHistory) });
  } catch (error: any) {
    console.error('Approvals history error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงประวัติการอนุมัติ', error: error.message });
  }
});

// GET /api/v1/approvals/pipeline-stats (Summary counts of pipeline across steps)
router.get('/pipeline-stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
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
      if (!userDivId) {
        myPendingCount = step2Count;
      } else {
        const step2Items = await prisma.projectApproval.findMany({
          where: { status: ApprovalStatus.PENDING, step_order: 2 },
          include: { project: { include: { department: true } } }
        });
        let count = 0;
        for (const item of step2Items) {
          if (item.approver_id === userId) {
            count++;
            continue;
          }
          const targetDivId = await getProjectTargetDivisionId(item.project);
          if (targetDivId === userDivId) {
            count++;
          }
        }
        myPendingCount = count;
      }
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

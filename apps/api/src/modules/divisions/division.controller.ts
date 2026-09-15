import { Router, Request, Response } from 'express';
import { prisma, serializeBigInt } from '../../lib/prisma';

const router = Router();

export async function syncDivisionDeputy(
  division: { id: number; name: string; code: string },
  deputyName: string,
  deputyPosition?: string | null
) {
  const codeLower = division.code.toLowerCase();
  const nameVal = (deputyName || '').trim();
  const posVal = (deputyPosition || `รองผู้อำนวยการ${division.name}`).trim();

  const keysToUpdate: Record<string, string> = {
    [`deputy_name_${codeLower}`]: nameVal,
    [`deputy_${codeLower}_name`]: nameVal,
    [`deputy_name_div_${division.id}`]: nameVal,
    [`deputy_position_${codeLower}`]: posVal,
    [`deputy_${codeLower}_position`]: posVal,
    [`deputy_pos_div_${division.id}`]: posVal,
  };

  if (codeLower === 'acad') {
    keysToUpdate['deputy_acad_name'] = nameVal;
    keysToUpdate['deputy_acad_position'] = posVal;
  } else if (codeLower === 'res') {
    keysToUpdate['deputy_res_name'] = nameVal;
    keysToUpdate['deputy_res_position'] = posVal;
  } else if (codeLower === 'dev') {
    keysToUpdate['deputy_dev_name'] = nameVal;
    keysToUpdate['deputy_dev_position'] = posVal;
  } else if (codeLower === 'strat') {
    keysToUpdate['deputy_strat_name'] = nameVal;
    keysToUpdate['deputy_strat_position'] = posVal;
  }

  for (const [k, v] of Object.entries(keysToUpdate)) {
    await (prisma as any).systemSetting.upsert({
      where: { key: k },
      update: { value: v },
      create: { key: k, value: v, description: `ข้อมูลรองผู้อำนวยการ (${division.name})` },
    });
  }

  // Also sync with DEPUTY_DIRECTOR user in this division if any
  try {
    const depts = await prisma.department.findMany({ where: { division_id: division.id } });
    const deptIds = depts.map((d) => d.id);
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
  } catch (userSyncErr) {
    console.warn('Sync deputy user warning:', userSyncErr);
  }

  // Broadcast realtime update
  try {
    const { sseManager } = require('../notifications/sse.manager');
    sseManager.broadcast('data_update', {
      scope: 'DIVISION',
      action: 'DEPUTY_UPDATED',
      divisionCode: division.code,
      divisionId: division.id,
      deputyName: nameVal,
      deputyPosition: posVal,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {}
}

// GET /api/v1/divisions
router.get('/', async (req: Request, res: Response) => {
  try {
    const divisions = await prisma.division.findMany({
      include: {
        departments: true,
      },
    });

    const settings = await (prisma as any).systemSetting.findMany();
    const settingsMap = new Map<string, string>(settings.map((s: any) => [s.key, s.value]));

    // Fetch active DEPUTY_DIRECTOR users to use as live sync fallback
    const deputyUsers = await prisma.user.findMany({
      where: { role: 'DEPUTY_DIRECTOR', is_active: true },
      include: { department: true },
    });

    const enriched = divisions.map((div) => {
      const divCodeLower = div.code.toLowerCase();
      let deputyName = settingsMap.get(`deputy_name_${divCodeLower}`) || 
                       settingsMap.get(`deputy_${divCodeLower}_name`) || 
                       settingsMap.get(`deputy_name_div_${div.id}`) || '';
      let deputyPosition = settingsMap.get(`deputy_position_${divCodeLower}`) || 
                           settingsMap.get(`deputy_${divCodeLower}_position`) || 
                           settingsMap.get(`deputy_pos_div_${div.id}`) || 
                           `รองผู้อำนวยการ${div.name}`;

      // If deputyName is not set in settings, fallback to active DEPUTY_DIRECTOR user in this division
      if (!deputyName) {
        const matchedDeputyUser = deputyUsers.find((u) => u.department?.division_id === div.id);
        if (matchedDeputyUser) {
          deputyName = matchedDeputyUser.full_name;
          if (matchedDeputyUser.position) deputyPosition = matchedDeputyUser.position;
        }
      }

      const departments = div.departments.map((dept) => {
        let headName = settingsMap.get(`head_name_dept_${dept.id}`) || 
                       settingsMap.get(`head_dept_${dept.id}_name`) || '';
        let headPosition = settingsMap.get(`head_position_dept_${dept.id}`) || 
                           settingsMap.get(`head_dept_${dept.id}_position`) || 
                           `หัวหน้า${dept.name}`;

        return {
          ...dept,
          head_name: headName,
          head_position: headPosition,
        };
      });

      return {
        ...div,
        deputy_name: deputyName,
        deputy_position: deputyPosition,
        departments,
      };
    });

    return res.json({ success: true, data: serializeBigInt(enriched) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// GET /api/v1/divisions/:code
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const upperCode = code.toUpperCase();
    const division = await prisma.division.findUnique({
      where: { code: upperCode },
      include: {
        departments: {
          include: {
            projects: {
              include: {
                leader: true,
                budget_items: true,
                department: {
                  include: {
                    division: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!division) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลฝ่าย' });
    }

    // Load all projects in system with their relations
    const allProjectsInDb = await prisma.project.findMany({
      include: {
        leader: true,
        budget_items: true,
        department: {
          include: {
            division: true,
          },
        },
      },
    });

    const { getProjectTargetDivisionId } = require('../approvals/approval.controller');
    const matchedDivisionProjects: any[] = [];
    for (const p of allProjectsInDb) {
      const targetDivId = await getProjectTargetDivisionId(p);
      if (targetDivId === division.id) {
        matchedDivisionProjects.push(p);
      }
    }

    // Map projects into the division's department structure or virtual container
    const mappedDepartments = (division.departments || []).map((dept) => {
      const deptProjects = matchedDivisionProjects.filter((p) => p.department_id === dept.id);
      return {
        ...dept,
        projects: deptProjects,
      };
    });

    // Any project for this division whose department_id is not among division's departments
    const deptIdsSet = new Set(division.departments.map((d) => d.id));
    const unmappedProjects = matchedDivisionProjects.filter((p) => !deptIdsSet.has(p.department_id));

    if (unmappedProjects.length > 0) {
      if (mappedDepartments.length > 0) {
        (mappedDepartments[0].projects as any).push(...unmappedProjects);
      } else {
        mappedDepartments.push({
          id: 0,
          division_id: division.id,
          name: division.name,
          projects: unmappedProjects,
        } as any);
      }
    }

    // Get deputy name from system_settings or User with DEPUTY_DIRECTOR role
    const settingKey = `deputy_name_${upperCode.toLowerCase()}`;
    const settingPosKey = `deputy_position_${upperCode.toLowerCase()}`;
    
    const deputySetting = await (prisma as any).systemSetting.findUnique({ where: { key: settingKey } });
    const deputyPosSetting = await (prisma as any).systemSetting.findUnique({ where: { key: settingPosKey } });

    let deputyName = deputySetting ? deputySetting.value : '';
    let deputyPosition = deputyPosSetting ? deputyPosSetting.value : `รองผู้อำนวยการ${division.name}`;

    // Live sync fallback from DEPUTY_DIRECTOR user if deputyName is empty
    if (!deputyName) {
      const deptIds = division.departments.map((d) => d.id);
      const deputyUser = await prisma.user.findFirst({
        where: {
          role: 'DEPUTY_DIRECTOR',
          is_active: true,
          department_id: { in: deptIds },
        },
      });
      if (deputyUser) {
        deputyName = deputyUser.full_name;
        if (deputyUser.position) deputyPosition = deputyUser.position;
      }
    }

    const data = {
      ...division,
      departments: mappedDepartments,
      deputy_name: deputyName,
      deputy_position: deputyPosition,
    };

    return res.json({ success: true, data: serializeBigInt(data) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// PUT /api/v1/divisions/:code/deputy (Update Deputy Director for Division)
router.put('/:code/deputy', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const upperCode = code.toUpperCase();
    const { deputy_name, deputy_position } = req.body;

    const division = await prisma.division.findUnique({
      where: { code: upperCode },
    });

    if (!division) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลฝ่าย' });
    }

    await syncDivisionDeputy(division, deputy_name, deputy_position);

    return res.json({
      success: true,
      message: 'บันทึกข้อมูลรองผู้อำนวยการประจำฝ่ายสำเร็จ',
      data: {
        deputy_name,
        deputy_position,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', error: error.message });
  }
});

// POST /api/v1/divisions (Add Division)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, code, deputy_name, deputy_position } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อฝ่ายและรหัสฝ่าย' });
    }

    const division = await prisma.division.create({
      data: {
        name,
        code: code.toLowerCase(),
      },
    });

    const divCodeLower = code.toLowerCase();
    if (deputy_name !== undefined) {
      await (prisma as any).systemSetting.upsert({
        where: { key: `deputy_name_${divCodeLower}` },
        update: { value: String(deputy_name || '') },
        create: {
          key: `deputy_name_${divCodeLower}`,
          value: String(deputy_name || ''),
          description: `ชื่อรองผู้อำนวยการ (${name})`,
        },
      });
    }
    if (deputy_position !== undefined) {
      await (prisma as any).systemSetting.upsert({
        where: { key: `deputy_position_${divCodeLower}` },
        update: { value: String(deputy_position || '') },
        create: {
          key: `deputy_position_${divCodeLower}`,
          value: String(deputy_position || ''),
          description: `ตำแหน่งรองผู้อำนวยการ (${name})`,
        },
      });
    }

    return res.json({ success: true, message: 'เพิ่มฝ่าย / กลุ่มงานสำเร็จ', data: serializeBigInt(division) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// PUT /api/v1/divisions/:id (Update Division)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, code, deputy_name, deputy_position } = req.body;

    const division = await prisma.division.update({
      where: { id },
      data: {
        name,
        code: code ? code.toLowerCase() : undefined,
      },
    });

    if (deputy_name !== undefined || deputy_position !== undefined) {
      await syncDivisionDeputy(division, deputy_name, deputy_position);
    }

    return res.json({ success: true, message: 'อัปเดตฝ่าย / กลุ่มงานสำเร็จ', data: serializeBigInt(division) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// DELETE /api/v1/divisions/:id (Delete Division)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.division.delete({
      where: { id },
    });

    return res.json({ success: true, message: 'ลบฝ่าย / กลุ่มงานสำเร็จ' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// POST /api/v1/divisions/departments
router.post('/departments', async (req: Request, res: Response) => {
  try {
    const { name, division_id, head_name, head_position } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อแผนกวิชา / งาน' });
    }

    let divId = division_id ? parseInt(division_id) : 1;
    const dept = await prisma.department.create({
      data: {
        name,
        division_id: divId,
      },
    });

    if (head_name !== undefined) {
      await (prisma as any).systemSetting.upsert({
        where: { key: `head_name_dept_${dept.id}` },
        update: { value: String(head_name || '') },
        create: {
          key: `head_name_dept_${dept.id}`,
          value: String(head_name || ''),
          description: `ชื่อหัวหน้า (${name})`,
        },
      });
    }

    if (head_position !== undefined) {
      await (prisma as any).systemSetting.upsert({
        where: { key: `head_position_dept_${dept.id}` },
        update: { value: String(head_position || '') },
        create: {
          key: `head_position_dept_${dept.id}`,
          value: String(head_position || ''),
          description: `ตำแหน่งหัวหน้า (${name})`,
        },
      });
    }

    return res.json({ success: true, message: 'เพิ่มแผนกวิชา / งานสำเร็จ', data: serializeBigInt(dept) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเพิ่มข้อมูล', error: error.message });
  }
});

// PUT /api/v1/divisions/departments/:id (Update Department)
router.put('/departments/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, division_id, head_name, head_position } = req.body;

    const dept = await prisma.department.update({
      where: { id },
      data: {
        name,
        division_id: division_id ? parseInt(division_id) : undefined,
      },
    });

    if (head_name !== undefined) {
      await (prisma as any).systemSetting.upsert({
        where: { key: `head_name_dept_${id}` },
        update: { value: String(head_name || '') },
        create: {
          key: `head_name_dept_${id}`,
          value: String(head_name || ''),
          description: `ชื่อหัวหน้า (${dept.name})`,
        },
      });
    }

    if (head_position !== undefined) {
      await (prisma as any).systemSetting.upsert({
        where: { key: `head_position_dept_${id}` },
        update: { value: String(head_position || '') },
        create: {
          key: `head_position_dept_${id}`,
          value: String(head_position || ''),
          description: `ตำแหน่งหัวหน้า (${dept.name})`,
        },
      });
    }

    return res.json({ success: true, message: 'อัปเดตแผนกวิชา / งานสำเร็จ', data: serializeBigInt(dept) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// DELETE /api/v1/divisions/departments/:id
router.delete('/departments/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.department.delete({
      where: { id },
    });

    return res.json({ success: true, message: 'ลบแผนกวิชา / งานสำเร็จ' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการลบข้อมูล', error: error.message });
  }
});

export default router;

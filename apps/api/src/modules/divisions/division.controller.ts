import { Router, Request, Response } from 'express';
import { prisma, serializeBigInt } from '../../lib/prisma';

const router = Router();

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

    const enriched = divisions.map((div) => {
      const divCodeLower = div.code.toLowerCase();
      let deputyName = settingsMap.get(`deputy_name_${divCodeLower}`) || 
                       settingsMap.get(`deputy_${divCodeLower}_name`) || 
                       settingsMap.get(`deputy_name_div_${div.id}`) || '';
      let deputyPosition = settingsMap.get(`deputy_position_${divCodeLower}`) || 
                           settingsMap.get(`deputy_${divCodeLower}_position`) || 
                           settingsMap.get(`deputy_pos_div_${div.id}`) || 
                           `รองผู้อำนวยการ${div.name}`;

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

    const settingKey = `deputy_name_${upperCode.toLowerCase()}`;
    const settingPosKey = `deputy_position_${upperCode.toLowerCase()}`;

    if (deputy_name !== undefined) {
      await (prisma as any).systemSetting.upsert({
        where: { key: settingKey },
        update: { value: String(deputy_name || '') },
        create: {
          key: settingKey,
          value: String(deputy_name || ''),
          description: `ชื่อรองผู้อำนวยการ (${division.name})`,
        },
      });
    }

    if (deputy_position !== undefined) {
      await (prisma as any).systemSetting.upsert({
        where: { key: settingPosKey },
        update: { value: String(deputy_position || '') },
        create: {
          key: settingPosKey,
          value: String(deputy_position || ''),
          description: `ตำแหน่งรองผู้อำนวยการ (${division.name})`,
        },
      });
    }

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

    const divCodeLower = (code || division.code).toLowerCase();
    if (deputy_name !== undefined) {
      const val = String(deputy_name || '');
      await (prisma as any).systemSetting.upsert({
        where: { key: `deputy_name_${divCodeLower}` },
        update: { value: val },
        create: { key: `deputy_name_${divCodeLower}`, value: val, description: `ชื่อรองผู้อำนวยการ (${division.name})` },
      });
      await (prisma as any).systemSetting.upsert({
        where: { key: `deputy_${divCodeLower}_name` },
        update: { value: val },
        create: { key: `deputy_${divCodeLower}_name`, value: val, description: `ชื่อรองผู้อำนวยการ (${division.name})` },
      });
      await (prisma as any).systemSetting.upsert({
        where: { key: `deputy_name_div_${id}` },
        update: { value: val },
        create: { key: `deputy_name_div_${id}`, value: val, description: `ชื่อรองผู้อำนวยการ (${division.name})` },
      });
    }
    if (deputy_position !== undefined) {
      const posVal = String(deputy_position || '');
      await (prisma as any).systemSetting.upsert({
        where: { key: `deputy_position_${divCodeLower}` },
        update: { value: posVal },
        create: { key: `deputy_position_${divCodeLower}`, value: posVal, description: `ตำแหน่งรองผู้อำนวยการ (${division.name})` },
      });
      await (prisma as any).systemSetting.upsert({
        where: { key: `deputy_${divCodeLower}_position` },
        update: { value: posVal },
        create: { key: `deputy_${divCodeLower}_position`, value: posVal, description: `ตำแหน่งรองผู้อำนวยการ (${division.name})` },
      });
      await (prisma as any).systemSetting.upsert({
        where: { key: `deputy_pos_div_${id}` },
        update: { value: posVal },
        create: { key: `deputy_pos_div_${id}`, value: posVal, description: `ตำแหน่งรองผู้อำนวยการ (${division.name})` },
      });
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

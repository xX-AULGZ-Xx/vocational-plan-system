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

    // Fetch users for fallback if setting is not explicitly stored
    const deputyUsers = await prisma.user.findMany({
      where: { role: 'DEPUTY_DIRECTOR' },
      include: { department: true },
    });
    const headUsers = await prisma.user.findMany({
      where: { role: 'HEAD_DEPT' },
    });

    const enriched = divisions.map((div) => {
      const divCodeLower = div.code.toLowerCase();
      let deputyName = settingsMap.get(`deputy_name_${divCodeLower}`) || '';
      let deputyPosition = settingsMap.get(`deputy_position_${divCodeLower}`) || `รองผู้อำนวยการ${div.name}`;

      if (!deputyName) {
        const deputyUser = deputyUsers.find((u) => u.department?.division_id === div.id);
        if (deputyUser) {
          deputyName = deputyUser.full_name;
          if (deputyUser.position) deputyPosition = deputyUser.position;
        }
      }

      const departments = div.departments.map((dept) => {
        let headName = settingsMap.get(`head_name_dept_${dept.id}`) || '';
        let headPosition = settingsMap.get(`head_position_dept_${dept.id}`) || `หัวหน้า${dept.name}`;

        if (!headName) {
          const headUser = headUsers.find((u) => u.department_id === dept.id);
          if (headUser) {
            headName = headUser.full_name;
            if (headUser.position) headPosition = headUser.position;
          }
        }

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
              },
            },
          },
        },
      },
    });

    if (!division) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลฝ่าย' });
    }

    // Get deputy name from system_settings or User with DEPUTY_DIRECTOR role
    const settingKey = `deputy_name_${upperCode.toLowerCase()}`;
    const settingPosKey = `deputy_position_${upperCode.toLowerCase()}`;
    
    const deputySetting = await (prisma as any).systemSetting.findUnique({ where: { key: settingKey } });
    const deputyPosSetting = await (prisma as any).systemSetting.findUnique({ where: { key: settingPosKey } });

    let deputyName = deputySetting ? deputySetting.value : '';
    let deputyPosition = deputyPosSetting ? deputyPosSetting.value : `รองผู้อำนวยการ${division.name}`;

    if (!deputyName) {
      const deputyUser = await prisma.user.findFirst({
        where: {
          role: 'DEPUTY_DIRECTOR',
          department: { division_id: division.id }
        }
      });
      if (deputyUser) {
        deputyName = deputyUser.full_name;
        if (deputyUser.position) deputyPosition = deputyUser.position;
      }
    }

    const data = {
      ...division,
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
      await (prisma as any).systemSetting.upsert({
        where: { key: `deputy_name_${divCodeLower}` },
        update: { value: String(deputy_name || '') },
        create: {
          key: `deputy_name_${divCodeLower}`,
          value: String(deputy_name || ''),
          description: `ชื่อรองผู้อำนวยการ (${division.name})`,
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
          description: `ตำแหน่งรองผู้อำนวยการ (${division.name})`,
        },
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

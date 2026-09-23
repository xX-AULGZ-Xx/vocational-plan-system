import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma, serializeBigInt } from '../../lib/prisma';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { Role, NotificationType } from '@prisma/client';
import { notificationService } from '../notifications/notification.service';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Notify all admins when a new user logs in for the first time
 */
async function notifyAdminsOnFirstLogin(user: any) {
  try {
    const adminUsers = await prisma.user.findMany({
      where: {
        role: Role.ADMIN,
        is_active: true,
      },
      select: {
        id: true,
      },
    });

    if (!adminUsers || adminUsers.length === 0) return;

    const deptName = user.department?.name || 'ไม่ระบุแผนก';
    const position = user.position || user.role || 'บุคลากร';
    const title = '👤 ผู้ใช้งานใหม่เข้าสู่ระบบครั้งแรก';
    const message = `คุณ ${user.full_name} (${user.email || user.username}) ได้เข้าสู่ระบบครั้งแรกในตำแหน่ง ${position} (${deptName})`;

    for (const admin of adminUsers) {
      if (admin.id.toString() === user.id.toString()) continue;

      await notificationService.createNotification({
        userId: admin.id,
        title,
        message,
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        linkUrl: '/admin/users',
        sendEmailNotification: false,
      });
    }
  } catch (err: any) {
    console.error('[FirstLoginNotification] Error notifying admins:', err.message);
  }
}

// POST /api/v1/auth/google (Google Sign-In)
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential, email: testEmail, google_id: testGoogleId, full_name: testName, avatar_url: testAvatar } = req.body;

    // Fetch dynamic settings from database
    const dbSettings = await (prisma as any).systemSetting.findMany({
      where: { key: { in: ['google_client_id', 'google_allowed_domains'] } },
    });
    const settingsMap = new Map(dbSettings.map((s: any) => [s.key, s.value]));

    const activeClientId = String(settingsMap.get('google_client_id') || process.env.GOOGLE_CLIENT_ID || '').trim();
    const rawAllowedDomains = String(settingsMap.get('google_allowed_domains') || 'cric.ac.th, vec.mail.go.th');
    const allowedDomains = rawAllowedDomains
      .split(',')
      .map((d: string) => d.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean);

    let email = testEmail;
    let googleId = testGoogleId;
    let fullName = testName;
    let avatarUrl = testAvatar;

    if (credential) {
      try {
        if (activeClientId && !activeClientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
          const client = new OAuth2Client(activeClientId);
          const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: activeClientId,
          });
          const payload = ticket.getPayload();
          if (payload) {
            email = payload.email;
            googleId = payload.sub;
            fullName = payload.name || payload.given_name || email?.split('@')[0];
            avatarUrl = payload.picture;
          }
        } else {
          // In development or before Google Client ID is configured, decode token payload safely
          const decoded: any = jwt.decode(credential);
          if (decoded) {
            email = decoded.email;
            googleId = decoded.sub;
            fullName = decoded.name || decoded.given_name || email?.split('@')[0];
            avatarUrl = decoded.picture;
          }
        }
      } catch (tokenErr: any) {
        console.error('Google token verify error:', tokenErr);
        return res.status(401).json({ success: false, message: 'Google Token ไม่ถูกต้องหรือหมดอายุ', error: tokenErr.message });
      }
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'ไม่พบข้อมูลอีเมลจากบัญชี Google' });
    }

    email = email.toLowerCase().trim();
    const emailDomain = email.split('@')[1] || '';
    const usernameFromEmail = email.split('@')[0];

    // Check if user exists in DB by google_id, email, or username
    let user = await (prisma as any).user.findFirst({
      where: {
        OR: [
          googleId ? { google_id: googleId } : undefined,
          { email },
          { username: usernameFromEmail },
        ].filter(Boolean),
      },
      include: {
        department: {
          include: {
            division: true,
          },
        },
      },
    });

    // If new user, verify organizational domain
    if (!user && !allowedDomains.includes(emailDomain)) {
      return res.status(403).json({
        success: false,
        message: `ระบบอนุญาตให้เข้าใช้งานเฉพาะอีเมลองค์กรสถานศึกษา (@cric.ac.th) หรืออีเมล สอศ. (@vec.mail.go.th) เท่านั้น (อีเมลของคุณคือ ${email})`,
      });
    }

    let isFirstLogin = false;

    if (user) {
      if (!user.is_active) {
        return res.status(403).json({ success: false, message: 'บัญชีผู้ใช้นี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' });
      }

      // Check if this is the user's first login
      isFirstLogin = !(user as any).first_login_at && !(user as any).last_login_at;

      // Update google_id, avatar_url, email if not linked, and login timestamps
      const updateData: any = {
        last_login_at: new Date(),
      };
      if (isFirstLogin) {
        updateData.first_login_at = new Date();
      }
      if (googleId && user.google_id !== googleId) updateData.google_id = googleId;
      if (avatarUrl && user.avatar_url !== avatarUrl) updateData.avatar_url = avatarUrl;
      if (!user.email) updateData.email = email;

      user = await (prisma as any).user.update({
        where: { id: user.id },
        data: updateData,
        include: {
          department: {
            include: { division: true },
          },
        },
      });
    } else {
      // Auto-register new user as TEACHER
      isFirstLogin = true;
      const firstDept = await (prisma as any).department.findFirst();
      user = await (prisma as any).user.create({
        data: {
          username: usernameFromEmail,
          email,
          google_id: googleId || null,
          avatar_url: avatarUrl || null,
          full_name: fullName || usernameFromEmail,
          role: 'TEACHER',
          position: 'ครูผู้สอน',
          department_id: firstDept ? firstDept.id : null,
          is_active: true,
          first_login_at: new Date(),
          last_login_at: new Date(),
        },
        include: {
          department: {
            include: { division: true },
          },
        },
      });
    }

    // Trigger real-time notification to all admins ONLY when logging in for the first time
    if (isFirstLogin) {
      notifyAdminsOnFirstLogin(user);
    }

    const payload = {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      is_profile_completed: (user as any).is_profile_completed ?? false,
      department_id: user.department_id,
      department_name: user.department?.name,
      division_id: user.department?.division_id,
      division_code: user.department?.division?.code,
      division_name: user.department?.division?.name,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      success: true,
      message: `เข้าสู่ระบบด้วย Google สำเร็จ (${user.full_name})`,
      token,
      user: serializeBigInt({
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        position: user.position,
        role: user.role,
        avatar_url: user.avatar_url,
        is_profile_completed: (user as any).is_profile_completed ?? false,
        department: user.department,
      }),
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google', error: error.message });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        department: {
          include: {
            division: true,
          },
        },
      },
    });

    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const isMatch = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    // Check if this is the user's first login
    const isFirstLogin = !(user as any).first_login_at && !(user as any).last_login_at;
    const updateData: any = {
      last_login_at: new Date(),
    };
    if (isFirstLogin) {
      updateData.first_login_at = new Date();
    }
    try {
      await (prisma as any).user.update({
        where: { id: user.id },
        data: updateData,
      });
    } catch (e) {}

    // Trigger real-time notification to all admins ONLY when logging in for the first time
    if (isFirstLogin) {
      notifyAdminsOnFirstLogin(user);
    }

    const payload = {
      id: user.id.toString(),
      username: user.username,
      role: user.role,
      full_name: user.full_name,
      is_profile_completed: (user as any).is_profile_completed ?? true,
      department_id: user.department_id,
      department_name: user.department?.name,
      division_id: user.department?.division_id,
      division_code: user.department?.division?.code,
      division_name: user.department?.division?.name,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: serializeBigInt({
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        position: user.position,
        role: user.role,
        avatar_url: user.avatar_url,
        is_profile_completed: (user as any).is_profile_completed ?? true,
        department: user.department,
      }),
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์', error: error.message });
  }
});

export async function getUserAssignedDepartments(userId: bigint | string | number, primaryDeptId?: number | null) {
  try {
    const uId = userId.toString();
    const deptSetting = await (prisma as any).systemSetting.findUnique({
      where: { key: `user_${uId}_department_ids` },
    });
    const divSetting = await (prisma as any).systemSetting.findUnique({
      where: { key: `user_${uId}_division_ids` },
    });

    let deptIds: number[] = [];
    if (deptSetting?.value) {
      try {
        const parsed = JSON.parse(deptSetting.value);
        if (Array.isArray(parsed)) deptIds = parsed.map(Number).filter(Boolean);
      } catch {}
    }
    if (deptIds.length === 0 && primaryDeptId) {
      deptIds = [Number(primaryDeptId)];
    }

    let divIds: number[] = [];
    if (divSetting?.value) {
      try {
        const parsed = JSON.parse(divSetting.value);
        if (Array.isArray(parsed)) divIds = parsed.map(Number).filter(Boolean);
      } catch {}
    }

    // Load actual departments with their divisions
    let assignedDepts: any[] = [];
    if (deptIds.length > 0) {
      assignedDepts = await prisma.department.findMany({
        where: { id: { in: deptIds } },
        include: { division: true },
      });
    }

    if (divIds.length === 0 && assignedDepts.length > 0) {
      divIds = Array.from(new Set(assignedDepts.map((d) => d.division_id)));
    }

    let assignedDivs: any[] = [];
    if (divIds.length > 0) {
      assignedDivs = await prisma.division.findMany({
        where: { id: { in: divIds } },
      });
    }

    const deptNames = assignedDepts.map((d) => d.name).join(', ');
    const divNames = assignedDivs.map((d) => d.name).join(', ');
    const divCodes = assignedDivs.map((d) => d.code).join(', ');

    return {
      department_ids: deptIds,
      division_ids: divIds,
      departments: assignedDepts,
      divisions: assignedDivs,
      department_name: deptNames || (assignedDepts[0]?.name || 'ไม่ได้ระบุ'),
      division_name: divNames || (assignedDivs[0]?.name || 'ไม่ได้ระบุ'),
      division_code: divCodes || (assignedDivs[0]?.code || ''),
    };
  } catch (e) {
    console.error('getUserAssignedDepartments error:', e);
    return {
      department_ids: primaryDeptId ? [Number(primaryDeptId)] : [],
      division_ids: [],
      departments: [],
      divisions: [],
      department_name: 'ไม่ได้ระบุ',
      division_name: 'ไม่ได้ระบุ',
      division_code: '',
    };
  }
}

export async function saveUserAssignedDepartments(
  userId: bigint | string | number,
  departmentIds?: number[] | null,
  divisionIds?: number[] | null,
  primaryDeptId?: number | null
) {
  try {
    const uId = userId.toString();
    const finalDeptIds = Array.isArray(departmentIds) && departmentIds.length > 0
      ? Array.from(new Set(departmentIds.map(Number).filter(Boolean)))
      : (primaryDeptId ? [Number(primaryDeptId)] : []);

    let finalDivIds = Array.isArray(divisionIds) && divisionIds.length > 0
      ? Array.from(new Set(divisionIds.map(Number).filter(Boolean)))
      : [];

    if (finalDivIds.length === 0 && finalDeptIds.length > 0) {
      const depts = await prisma.department.findMany({
        where: { id: { in: finalDeptIds } },
      });
      finalDivIds = Array.from(new Set(depts.map((d) => d.division_id)));
    }

    await (prisma as any).systemSetting.upsert({
      where: { key: `user_${uId}_department_ids` },
      update: { value: JSON.stringify(finalDeptIds) },
      create: {
        key: `user_${uId}_department_ids`,
        value: JSON.stringify(finalDeptIds),
        description: `รหัสแผนก/งานของผู้ใช้ ${uId}`,
      },
    });

    await (prisma as any).systemSetting.upsert({
      where: { key: `user_${uId}_division_ids` },
      update: { value: JSON.stringify(finalDivIds) },
      create: {
        key: `user_${uId}_division_ids`,
        value: JSON.stringify(finalDivIds),
        description: `รหัสฝ่ายของผู้ใช้ ${uId}`,
      },
    });

    return { department_ids: finalDeptIds, division_ids: finalDivIds };
  } catch (e) {
    console.error('saveUserAssignedDepartments error:', e);
  }
}

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(req.user!.id) },
      include: {
        department: {
          include: {
            division: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ใช้' });
    }

    const assignedInfo = await getUserAssignedDepartments(user.id, user.department_id);

    return res.json({
      success: true,
      user: serializeBigInt({
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        position: user.position,
        role: user.role,
        avatar_url: user.avatar_url,
        google_id: user.google_id,
        signature_img: user.signature_img,
        is_profile_completed: (user as any).is_profile_completed ?? false,
        department_id: user.department_id,
        department_ids: assignedInfo.department_ids,
        division_ids: assignedInfo.division_ids,
        department_name: assignedInfo.department_name,
        division_name: assignedInfo.division_name,
        division_code: assignedInfo.division_code,
        departments: assignedInfo.departments,
        divisions: assignedInfo.divisions,
        department: user.department,
      }),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// PUT /api/v1/auth/profile (Update Profile / Complete First-Time Setup)
router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
    const { full_name, position, department_id, department_ids, division_ids, signature_img, avatar_url, email, role, is_head, head_dept_ids } = req.body;

    // Check existing user first
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลผู้ใช้ในระบบ' });
    }

    const effectiveDeptId = department_id
      ? parseInt(String(department_id))
      : (Array.isArray(department_ids) && department_ids.length > 0 ? parseInt(String(department_ids[0])) : (existingUser.department_id || null));

    if (existingUser.role !== 'ADMIN' && !effectiveDeptId) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกแผนกวิชาหรือฝ่ายงานที่สังกัด' });
    }

    let deptExists = null;
    if (effectiveDeptId) {
      deptExists = await prisma.department.findUnique({
        where: { id: effectiveDeptId },
        include: { division: true },
      });
      if (!deptExists && existingUser.role !== 'ADMIN') {
        return res.status(400).json({ success: false, message: 'ไม่พบข้อมูลแผนกวิชาหรือฝ่ายงานที่ระบุ' });
      }
    }

    // Determine if user is head of any department
    const headIds: number[] = Array.isArray(head_dept_ids)
      ? head_dept_ids.map((id: any) => parseInt(id))
      : (is_head && effectiveDeptId ? [effectiveDeptId] : []);
    const isUserHead = headIds.length > 0 || !!is_head;

    const updateData: any = {
      full_name: full_name ? full_name.trim() : existingUser.full_name,
      position: position !== undefined ? (position ? position.trim() : null) : existingUser.position,
      department_id: effectiveDeptId && deptExists ? effectiveDeptId : (existingUser.role === 'ADMIN' ? effectiveDeptId : null),
      is_profile_completed: true,
    };

    if (email !== undefined) {
      updateData.email = email && email.trim() ? email.trim() : null;
    }

    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url;
    }

    if (existingUser.role === 'ADMIN' || existingUser.role === 'DIRECTOR' || existingUser.role === 'DEPUTY_DIRECTOR' || existingUser.role === 'PLANNING_OFFICER') {
      // Keep executive/admin/planning officer roles intact
    } else if (isUserHead) {
      updateData.role = 'HEAD_DEPT';
    } else {
      updateData.role = 'TEACHER';
    }

    if (signature_img !== undefined) {
      updateData.signature_img = signature_img;
    }

    // Save multiple assigned departments and divisions
    await saveUserAssignedDepartments(userId, department_ids, division_ids, effectiveDeptId);

    // Update head settings for each department marked as head
    for (const hId of headIds) {
      try {
        const targetDept = await prisma.department.findUnique({ where: { id: hId } });
        const deptName = targetDept?.name || 'แผนก/งาน';

        await (prisma as any).systemSetting.upsert({
          where: { key: `head_name_dept_${hId}` },
          update: { value: full_name.trim() },
          create: {
            key: `head_name_dept_${hId}`,
            value: full_name.trim(),
            description: `ชื่อหัวหน้า (${deptName})`,
          },
        });

        if (position) {
          await (prisma as any).systemSetting.upsert({
            where: { key: `head_position_dept_${hId}` },
            update: { value: position.trim() },
            create: {
              key: `head_position_dept_${hId}`,
              value: position.trim(),
              description: `ตำแหน่งหัวหน้า (${deptName})`,
            },
          });
        }
      } catch (headErr) {
        console.warn(`Failed to update head settings for dept ${hId}:`, headErr);
      }
    }

    // Update user in DB
    const updatedUser = await (prisma as any).user.update({
      where: { id: userId },
      data: updateData,
      include: {
        department: {
          include: {
            division: true,
          },
        },
      },
    });

    const assignedInfo = await getUserAssignedDepartments(userId, updatedUser.department_id);

    const payload = {
      id: updatedUser.id.toString(),
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      full_name: updatedUser.full_name,
      is_profile_completed: true,
      department_id: updatedUser.department_id,
      department_name: assignedInfo.department_name,
      division_id: updatedUser.department?.division_id,
      division_code: assignedInfo.division_code,
      division_name: assignedInfo.division_name,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      success: true,
      message: 'บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว',
      token,
      user: serializeBigInt({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        full_name: updatedUser.full_name,
        position: updatedUser.position,
        role: updatedUser.role,
        avatar_url: updatedUser.avatar_url,
        google_id: updatedUser.google_id,
        signature_img: updatedUser.signature_img,
        is_profile_completed: true,
        department_id: updatedUser.department_id,
        department_ids: assignedInfo.department_ids,
        division_ids: assignedInfo.division_ids,
        department_name: assignedInfo.department_name,
        division_name: assignedInfo.division_name,
        division_code: assignedInfo.division_code,
        departments: assignedInfo.departments,
        divisions: assignedInfo.divisions,
        department: updatedUser.department,
      }),
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการบันทึกโปรไฟล์', error: error.message });
  }
});

// PUT /api/v1/auth/password (Change current user password)
router.put('/password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
    const { current_password, new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้ในระบบ' });
    }

    if (user.password_hash) {
      if (!current_password) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกรหัสผ่านปัจจุบัน' });
      }
      const isMatch = await bcrypt.compare(current_password, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(new_password, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { password_hash },
    });

    return res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน', error: error.message });
  }
});

// GET /api/v1/auth/users (for selecting approvers or project leaders)
router.get('/users', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { is_active: true },
      select: {
        id: true,
        username: true,
        full_name: true,
        position: true,
        role: true,
        department: {
          include: {
            division: true,
          },
        },
      },
    });

    return res.json({ success: true, users: serializeBigInt(users) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// GET /api/v1/auth/demo-accounts (List representative accounts for quick role switching)
router.get('/demo-accounts', async (req: Request, res: Response) => {
  try {
    const demoUsernames = [
      'teacher1',
      'head_tech',
      'deputy_acad',
      'planning_officer',
      'director',
      'admin',
    ];

    const users = await prisma.user.findMany({
      where: { username: { in: demoUsernames } },
      include: {
        department: {
          include: { division: true },
        },
      },
    });

    const accounts = users.map((u) => ({
      id: u.id.toString(),
      username: u.username,
      full_name: u.full_name,
      position: u.position,
      role: u.role,
      department_name: u.department?.name,
      division_name: u.department?.division?.name,
    }));

    return res.json({ success: true, accounts });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลบัญชีตัวอย่าง', error: error.message });
  }
});

// POST /api/v1/auth/switch-role (Switch active role / user for testing & demonstration)
router.post('/switch-role', async (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อผู้ใช้ที่ต้องการสลับ' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        department: {
          include: { division: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้นี้ในระบบ' });
    }

    const payload = {
      id: user.id.toString(),
      username: user.username,
      role: user.role,
      full_name: user.full_name,
      department_id: user.department_id,
      department_name: user.department?.name,
      division_id: user.department?.division_id,
      division_code: user.department?.division?.code,
      division_name: user.department?.division?.name,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      success: true,
      message: `สลับบทบาทเป็น "${user.full_name}" (${user.role}) เรียบร้อยแล้ว`,
      token,
      user: serializeBigInt({
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        position: user.position,
        role: user.role,
        avatar_url: user.avatar_url,
        department: user.department,
      }),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสลับบทบาท', error: error.message });
  }
});

export default router;

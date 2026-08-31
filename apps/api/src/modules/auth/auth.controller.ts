import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma, serializeBigInt } from '../../lib/prisma';
import { authenticate, AuthRequest } from '../../middlewares/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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

    if (user) {
      if (!user.is_active) {
        return res.status(403).json({ success: false, message: 'บัญชีผู้ใช้นี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' });
      }

      // Update google_id, avatar_url, and email if not linked yet
      const updateData: any = {};
      if (googleId && user.google_id !== googleId) updateData.google_id = googleId;
      if (avatarUrl && user.avatar_url !== avatarUrl) updateData.avatar_url = avatarUrl;
      if (!user.email) updateData.email = email;

      if (Object.keys(updateData).length > 0) {
        user = await (prisma as any).user.update({
          where: { id: user.id },
          data: updateData,
          include: {
            department: {
              include: { division: true },
            },
          },
        });
      }
    } else {
      // Auto-register new user as TEACHER
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
        },
        include: {
          department: {
            include: { division: true },
          },
        },
      });
    }

    const payload = {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
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
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: serializeBigInt({
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        position: user.position,
        role: user.role,
        department: user.department,
      }),
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์', error: error.message });
  }
});

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
        department: user.department,
      }),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
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
        department: user.department,
      }),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสลับบทบาท', error: error.message });
  }
});

export default router;

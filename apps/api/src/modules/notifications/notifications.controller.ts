import { Router, Request, Response } from 'express';
import { prisma, serializeBigInt } from '../../lib/prisma';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { sseManager } from './sse.manager';
import jwt from 'jsonwebtoken';

const router = Router();

// GET /api/v1/notifications/stream - Server-Sent Events endpoint
router.get('/stream', (req: Request, res: Response) => {
  // Support token from query string since EventSource doesn't easily support custom Authorization header
  let token = req.query.token as string;
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'กรุณาระบุ Authentication Token' });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.id ? decoded.id.toString() : null;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Invalid Token Payload' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Prevent Nginx buffering
    res.flushHeaders();

    // Register client
    sseManager.addClient(userId, res);
  } catch (err: any) {
    return res.status(401).json({ success: false, message: 'Token ไม่ถูกต้องหรือหมดอายุ', error: err.message });
  }
});

// GET /api/v1/notifications - List user's notifications
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    const unreadOnly = req.query.unreadOnly === 'true';

    const where: any = { user_id: userId };
    if (unreadOnly) {
      where.is_read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { user_id: userId, is_read: false },
      }),
    ]);

    return res.json({
      success: true,
      data: serializeBigInt(notifications),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    });
  } catch (error: any) {
    console.error('Fetch notifications error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงรายการแจ้งเตือน', error: error.message });
  }
});

// GET /api/v1/notifications/unread-count
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
    const count = await prisma.notification.count({
      where: { user_id: userId, is_read: false },
    });
    return res.json({ success: true, count });
  } catch (error: any) {
    console.error('Fetch unread count error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// PATCH /api/v1/notifications/:id/read - Mark single as read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
    const id = BigInt(req.params.id);

    const notification = await prisma.notification.findFirst({
      where: { id, user_id: userId },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการแจ้งเตือน' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    const unreadCount = await prisma.notification.count({
      where: { user_id: userId, is_read: false },
    });
    sseManager.sendToUser(userId.toString(), 'unread_count', { count: unreadCount });

    return res.json({ success: true, data: serializeBigInt(updated) });
  } catch (error: any) {
    console.error('Mark read error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// POST /api/v1/notifications/read-all - Mark all as read
router.post('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);

    await prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    sseManager.sendToUser(userId.toString(), 'unread_count', { count: 0 });

    return res.json({ success: true, message: 'ทำเครื่องหมายว่าอ่านแล้วทั้งหมดเรียบร้อย' });
  } catch (error: any) {
    console.error('Mark all read error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// DELETE /api/v1/notifications/:id - Delete single notification
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
    const id = BigInt(req.params.id);

    await prisma.notification.deleteMany({
      where: { id, user_id: userId },
    });

    const unreadCount = await prisma.notification.count({
      where: { user_id: userId, is_read: false },
    });
    sseManager.sendToUser(userId.toString(), 'unread_count', { count: unreadCount });

    return res.json({ success: true, message: 'ลบการแจ้งเตือนเรียบร้อยแล้ว' });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

export default router;

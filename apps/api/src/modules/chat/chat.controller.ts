import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { chatService } from './chat.service';
import { prisma, serializeBigInt } from '../../lib/prisma';

const router = Router();

const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || './storage');
const CHAT_UPLOADS_DIR = path.join(STORAGE_DIR, 'chat_uploads');

if (!fs.existsSync(CHAT_UPLOADS_DIR)) {
  fs.mkdirSync(CHAT_UPLOADS_DIR, { recursive: true });
}

// Multer storage for chat attachments
const chatFileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, CHAT_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // Sanitize base name
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-\u0E00-\u0E7F]/g, '_');
    cb(null, `${sanitizedBase}_${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: chatFileStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

// All chat routes require authentication
router.use(authenticate);

// GET /api/v1/chat/rooms - List all chat rooms for current user
router.get('/rooms', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
    const rooms = await chatService.getUserRooms(userId);
    res.json({ success: true, data: rooms });
  } catch (error: any) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({ success: false, message: error.message || 'ไม่สามารถดึงรายการห้องสนทนาได้' });
  }
});

// GET /api/v1/chat/rooms/:roomId - Get room details
router.get('/rooms/:roomId', async (req: AuthRequest, res: Response) => {
  try {
    const roomId = BigInt(req.params.roomId);
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        project: {
          select: {
            id: true,
            project_code: true,
            title: true,
            status: true,
            total_budget: true,
            fiscal_year: true,
            department: { select: { id: true, name: true } },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                username: true,
                avatar_url: true,
                role: true,
                position: true,
                department: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({ success: false, message: 'ไม่พบห้องสนทนา' });
    }

    res.json({ success: true, data: serializeBigInt(room) });
  } catch (error: any) {
    console.error('Error fetching room details:', error);
    res.status(500).json({ success: false, message: error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลห้อง' });
  }
});

// POST /api/v1/chat/rooms/direct - Get or create direct chat
router.post('/rooms/direct', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุ targetUserId' });
    }

    const room = await chatService.getOrCreateDirectRoom(userId, BigInt(targetUserId));
    res.json({ success: true, data: room });
  } catch (error: any) {
    console.error('Error creating direct room:', error);
    res.status(400).json({ success: false, message: error.message || 'ไม่สามารถเปิดห้องสนทนาได้' });
  }
});

// POST /api/v1/chat/rooms/group - Create group chat
router.post('/rooms/group', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
    const { name, description, participantIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อกลุ่มสนทนา' });
    }

    const ids = Array.isArray(participantIds) ? participantIds.map((id: any) => BigInt(id)) : [];
    const room = await chatService.createGroupRoom(userId, name.trim(), description, ids);
    res.json({ success: true, data: room });
  } catch (error: any) {
    console.error('Error creating group room:', error);
    res.status(400).json({ success: false, message: error.message || 'ไม่สามารถสร้างกลุ่มได้' });
  }
});

// POST /api/v1/chat/rooms/project/:projectId - Get or create project room
router.post('/rooms/project/:projectId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
    const projectId = BigInt(req.params.projectId);

    const room = await chatService.getOrCreateProjectRoom(projectId, userId);
    res.json({ success: true, data: room });
  } catch (error: any) {
    console.error('Error getting/creating project room:', error);
    res.status(400).json({ success: false, message: error.message || 'ไม่สามารถเปิดห้องสนทนาโครงการได้' });
  }
});

// GET /api/v1/chat/rooms/:roomId/messages - Get messages
router.get('/rooms/:roomId/messages', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
    const roomId = BigInt(req.params.roomId);
    const limit = parseInt(req.query.limit as string) || 50;
    const beforeId = req.query.beforeId ? BigInt(req.query.beforeId as string) : undefined;

    const messages = await chatService.getRoomMessages(roomId, userId, limit, beforeId);
    res.json({ success: true, data: messages });
  } catch (error: any) {
    console.error('Error fetching room messages:', error);
    res.status(400).json({ success: false, message: error.message || 'ไม่สามารถดึงข้อความได้' });
  }
});

// POST /api/v1/chat/rooms/:roomId/messages - Send message
router.post('/rooms/:roomId/messages', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
    const roomId = BigInt(req.params.roomId);
    const { content, message_type, metadata, attachments } = req.body;

    if (!content?.trim() && (!attachments || attachments.length === 0) && message_type !== 'PROJECT_CARD') {
      return res.status(400).json({ success: false, message: 'กรุณาระบุข้อความหรือไฟล์แนบ' });
    }

    const message = await chatService.sendMessage(userId, roomId, {
      content: content?.trim(),
      message_type,
      metadata,
      attachments,
    });

    res.json({ success: true, data: message });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(400).json({ success: false, message: error.message || 'ไม่สามารถส่งข้อความได้' });
  }
});

// POST /api/v1/chat/rooms/:roomId/read - Mark room as read
router.post('/rooms/:roomId/read', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
    const roomId = BigInt(req.params.roomId);

    const result = await chatService.markRoomAsRead(userId, roomId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Error marking room as read:', error);
    res.status(400).json({ success: false, message: error.message || 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/v1/chat/upload - Upload attachment
router.post('/upload', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์ที่ต้องการอัปโหลด' });
    }

    const fileUrl = `/storage/chat_uploads/${req.file.filename}`;
    const fileType = req.file.mimetype.startsWith('image/')
      ? 'IMAGE'
      : req.file.mimetype.includes('pdf')
      ? 'PDF'
      : req.file.mimetype.includes('word') || req.file.originalname.endsWith('.docx') || req.file.originalname.endsWith('.doc')
      ? 'DOCX'
      : req.file.mimetype.includes('sheet') || req.file.originalname.endsWith('.xlsx') || req.file.originalname.endsWith('.xls')
      ? 'EXCEL'
      : 'OTHER';

    res.json({
      success: true,
      data: {
        file_name: req.file.originalname,
        file_url: fileUrl,
        file_type: fileType,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
      },
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    res.status(500).json({ success: false, message: error.message || 'ไม่สามารถอัปโหลดไฟล์ได้' });
  }
});

// GET /api/v1/chat/users - Search users to chat
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
    const query = (req.query.q as string) || '';

    const users = await chatService.searchUsers(query, userId);
    res.json({ success: true, data: users });
  } catch (error: any) {
    console.error('Error searching users:', error);
    res.status(500).json({ success: false, message: error.message || 'ไม่สามารถค้นหาผู้ใช้งานได้' });
  }
});

// GET /api/v1/chat/projects - Search projects to share
router.get('/projects', async (req: AuthRequest, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    const projects = await chatService.searchProjects(query);
    res.json({ success: true, data: projects });
  } catch (error: any) {
    console.error('Error searching projects:', error);
    res.status(500).json({ success: false, message: error.message || 'ไม่สามารถค้นหาโครงการได้' });
  }
});

// GET /api/v1/chat/unread-summary - Total unread messages count
router.get('/unread-summary', async (req: AuthRequest, res: Response) => {
  try {
    const userId = BigInt(req.user!.id);
    const totalUnread = await chatService.getTotalUnreadCount(userId);
    res.json({ success: true, data: { unread_count: totalUnread } });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ success: false, message: error.message || 'เกิดข้อผิดพลาด' });
  }
});

export default router;

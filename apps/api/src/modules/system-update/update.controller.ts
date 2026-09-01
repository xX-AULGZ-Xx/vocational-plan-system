import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize, AuthRequest } from '../../middlewares/auth';
import { UpdateService } from './update.service';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';

// Store active SSE clients for update logs
let logListeners: ((data: any) => void)[] = [];

function broadcastUpdateLog(data: any) {
  logListeners.forEach((listener) => {
    try {
      listener(data);
    } catch (e) {}
  });
}

// 1. GET /api/v1/system-update/maintenance/status (Public check for app middleware / clients)
router.get('/maintenance/status', (req: Request, res: Response) => {
  try {
    const status = UpdateService.getMaintenanceStatus();
    return res.json({ success: true, data: status });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. GET /api/v1/system-update/stream (SSE for live logs - supports query param ?token=... or Header)
router.get('/stream', (req: Request, res: Response) => {
  // Validate token from Header or Query Param
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : queryToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized (No token provided)' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden (Admin role required)' });
    }
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  // Set SSE Headers with Nginx unbuffered streaming
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Crucial for aaPanel / Nginx / Reverse Proxies
  res.flushHeaders?.();

  // Send current state immediately on connect
  const currentState = UpdateService.getProgressState();
  res.write(`data: ${JSON.stringify(currentState)}\n\n`);

  const listener = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  logListeners.push(listener);

  req.on('close', () => {
    logListeners = logListeners.filter((l) => l !== listener);
  });
});

// 3. GET /api/v1/system-update/progress (Polling endpoint for real-time progress)
router.get('/progress', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : queryToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  const progressState = UpdateService.getProgressState();
  return res.json({ success: true, data: progressState });
});

// Protected routes below (ADMIN only)
router.use(authenticate, authorize(['ADMIN']));

// 4. GET /api/v1/system-update/info
router.get('/info', async (req: AuthRequest, res: Response) => {
  try {
    const info = await UpdateService.getSystemInfo();
    return res.json({ success: true, data: info });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลระบบ', error: error.message });
  }
});

// 5. GET /api/v1/system-update/check
router.get('/check', async (req: AuthRequest, res: Response) => {
  try {
    const checkResult = await UpdateService.checkForUpdates();
    return res.json({ success: true, data: checkResult });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'ไม่สามารถตรวจสอบการอัปเดตได้', error: error.message });
  }
});

// 6. POST /api/v1/system-update/maintenance
router.post('/maintenance', (req: AuthRequest, res: Response) => {
  try {
    const { enabled, message } = req.body;
    const result = UpdateService.setMaintenanceStatus(Boolean(enabled), message);
    return res.json({
      success: true,
      message: enabled ? 'เปิดโหมดปิดปรับปรุงระบบเรียบร้อยแล้ว' : 'ปิดโหมดปิดปรับปรุงและเปิดให้บริการตามปกติ',
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 7. GET /api/v1/system-update/backups
router.get('/backups', (req: AuthRequest, res: Response) => {
  try {
    const backups = UpdateService.listBackups();
    return res.json({ success: true, data: backups });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 8. POST /api/v1/system-update/backup
router.post('/backup', async (req: AuthRequest, res: Response) => {
  try {
    const { description } = req.body;
    const backup = await UpdateService.createBackup(description);
    return res.json({
      success: true,
      message: `สร้างไฟล์สำรองข้อมูล ${backup.filename} เรียบร้อยแล้ว`,
      data: backup,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'การสำรองข้อมูลล้มเหลว', error: error.message });
  }
});

// 9. POST /api/v1/system-update/restore
router.post('/restore', async (req: AuthRequest, res: Response) => {
  try {
    const { backupId } = req.body;
    if (!backupId) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุรหัสไฟล์สำรองข้อมูล (backupId)' });
    }
    const result = await UpdateService.restoreBackup(backupId);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 10. POST /api/v1/system-update/execute (Trigger 1-Click Update)
router.post('/execute', async (req: AuthRequest, res: Response) => {
  try {
    const { createBackupFirst, targetVersion } = req.body;

    // Send immediate acknowledgement
    res.json({
      success: true,
      message: 'เริ่มกระบวนการอัปเดตระบบในเบื้องหลังแล้ว ติดตามสถานะผ่านหน้าจอ Live Logs',
    });

    // Run async execution pipeline in background
    UpdateService.executeUpdatePipeline(
      { createBackupFirst: createBackupFirst !== false, targetVersion },
      (stage, message, progress) => {
        const payload = {
          stage,
          message,
          progress,
          timestamp: new Date().toISOString(),
        };
        broadcastUpdateLog(payload);
      }
    ).catch((err) => {
      broadcastUpdateLog({
        stage: 'error',
        message: `ข้อผิดพลาดร้ายแรง: ${err.message}`,
        progress: -1,
        timestamp: new Date().toISOString(),
      });
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

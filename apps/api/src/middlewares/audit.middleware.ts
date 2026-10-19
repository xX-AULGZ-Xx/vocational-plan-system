import { Request, Response, NextFunction } from 'express';
import { logActivity } from '../modules/audit-logs/audit-log.service';
import { AuthRequest } from './auth';

// Paths that should not be auto-audited (e.g. chat messages/reads, notifications, streams, status probes, or internal tools)
const EXCLUDED_PATHS = [
  '/api/v1/chat',
  '/api/v1/notifications',
  '/api/v1/setup/status',
  '/api/v1/setup/health',
  '/health',
];

/**
 * Helper to derive standard module from route URL
 */
function resolveModule(path: string): string {
  const cleanPath = path.toLowerCase();
  if (cleanPath.includes('/api/v1/auth')) return 'AUTH';
  if (cleanPath.includes('/api/v1/approvals')) return 'APPROVAL';
  if (cleanPath.includes('/api/v1/admin/users')) return 'USER';
  if (
    cleanPath.includes('/api/v1/projects') ||
    cleanPath.includes('/api/v1/evaluation') ||
    cleanPath.includes('/api/v1/registration')
  ) {
    return 'PROJECT';
  }
  if (
    cleanPath.includes('/api/v1/admin') ||
    cleanPath.includes('/api/v1/departments') ||
    cleanPath.includes('/api/v1/divisions') ||
    cleanPath.includes('/api/v1/budgets') ||
    cleanPath.includes('/api/v1/documents') ||
    cleanPath.includes('/api/v1/templates')
  ) {
    return 'ADMIN';
  }
  return 'SYSTEM';
}

/**
 * Helper to derive human-readable action and Thai description
 */
function resolveActionAndDesc(req: Request, userSummary: string): { action: string; description: string; targetType: string | null } {
  const method = req.method.toUpperCase();
  const path = req.originalUrl || req.path;
  const segments = path.split('?')[0].split('/').filter(Boolean);

  // Extract main resource segment
  const resourceIndex = segments.findIndex((s) => s === 'v1');
  const mainResource = resourceIndex >= 0 && segments[resourceIndex + 1] ? segments[resourceIndex + 1] : 'resource';
  const subResource = resourceIndex >= 0 && segments[resourceIndex + 2] ? segments[resourceIndex + 2] : null;

  let action = `${method}_${mainResource.toUpperCase()}`;
  let targetType: string | null = mainResource.charAt(0).toUpperCase() + mainResource.slice(1);

  let methodTh = 'บันทึกข้อมูล';
  if (method === 'POST') methodTh = 'สร้าง / เพิ่ม';
  else if (method === 'PUT' || method === 'PATCH') methodTh = 'แก้ไข / อัปเดต';
  else if (method === 'DELETE') methodTh = 'ลบ';

  let resourceTh = mainResource;
  if (mainResource === 'departments') resourceTh = 'แผนกวิชา/งาน';
  else if (mainResource === 'divisions') resourceTh = 'ฝ่ายงาน';
  else if (mainResource === 'budgets') resourceTh = 'งบประมาณ';
  else if (mainResource === 'documents') resourceTh = 'เอกสาร/เทมเพลต';
  else if (mainResource === 'templates') resourceTh = 'เทมเพลตเอกสาร';
  else if (mainResource === 'evaluation') resourceTh = 'แบบประเมินโครงการ';
  else if (mainResource === 'registration') resourceTh = 'ลงทะเบียน/ผู้เข้าร่วม';
  else if (mainResource === 'notifications') resourceTh = 'การแจ้งเตือน';
  else if (mainResource === 'settings') resourceTh = 'การตั้งค่าระบบ';
  else if (mainResource === 'system-update') resourceTh = 'การสำรอง/อัปเดตระบบ';
  else if (mainResource === 'users') resourceTh = 'ข้อมูลผู้ใช้';

  if (subResource && isNaN(Number(subResource))) {
    action = `${mainResource.toUpperCase()}_${subResource.toUpperCase()}`;
  }

  const description = `${userSummary} ทำรายการ${methodTh}${resourceTh} (${path})`;

  return { action, description, targetType };
}

/**
 * Global Audit Middleware:
 * Automatically captures all state-mutating requests (POST, PUT, PATCH, DELETE)
 * with deduplication check (skips if already audited by a specific custom hook).
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();

  // 1. Only intercept mutating operations
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next();
  }

  const url = req.originalUrl || req.url;
  if (EXCLUDED_PATHS.some((p) => url.startsWith(p))) {
    return next();
  }

  // 2. Capture a clone of the request body before it is modified
  let requestSnapshot: any = null;
  if (req.body && typeof req.body === 'object') {
    try {
      requestSnapshot = JSON.parse(JSON.stringify(req.body));
    } catch {
      requestSnapshot = req.body;
    }
  }

  // 3. Listen to response completion
  res.on('finish', async () => {
    try {
      // Rule: Only record successful mutations (HTTP 2xx) as agreed
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return;
      }

      // Rule: Deduplication - if already audited by a custom hook in controller, skip!
      if ((req as any).auditLogged) {
        return;
      }

      const authReq = req as AuthRequest;
      const user = authReq.user;
      const userId = user?.id ? BigInt(user.id) : null;
      const userSummary = user?.full_name ? `ผู้ใช้ ${user.full_name} (@${user.username})` : 'ผู้ใช้งาน / ระบบ';

      const moduleName = resolveModule(url);
      const { action, description, targetType } = resolveActionAndDesc(req, userSummary);

      // Extract target ID from params or body if available
      const targetId = req.params?.id || (req.body as any)?.id || null;

      await logActivity({
        userId,
        action,
        module: moduleName,
        targetId: targetId ? String(targetId) : null,
        targetType,
        description,
        newData: requestSnapshot,
        req,
      });
    } catch (err: any) {
      console.error('[AuditMiddleware] Auto audit error:', err.message);
    }
  });

  next();
}

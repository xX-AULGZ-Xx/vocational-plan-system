import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../../middlewares/auth';
import { Role } from '@prisma/client';
import {
  getAuditLogs,
  getAuditLogById,
  getAuditLogStats,
  getLogsForExport,
} from './audit-log.service';

const router = Router();

// Protect all audit log endpoints: Require Auth and ADMIN role
router.use(authenticate);
router.use(authorize([Role.ADMIN]));

/**
 * GET /api/v1/admin/audit-logs/stats
 * Overview numbers for cards
 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getAuditLogStats();
    return res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error fetching audit log stats:', error);
    return res.status(500).json({ success: false, message: 'ไม่สามารถโหลดสถิติ Log ได้' });
  }
});

/**
 * GET /api/v1/admin/audit-logs/export
 * Export audit logs as CSV with UTF-8 BOM
 */
router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const { module, action, userId, search, startDate, endDate } = req.query;

    const logs = await getLogsForExport({
      module: module as string,
      action: action as string,
      userId: userId as string,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    // Generate CSV string with UTF-8 BOM for Thai support in MS Excel
    const BOM = '\uFEFF';
    const headers = [
      'ID',
      'วัน-เวลา',
      'ผู้กระทำ',
      'ตำแหน่ง/สิทธิ์',
      'หมวดหมู่ (Module)',
      'ประเภทกิจกรรม (Action)',
      'ประเภทเป้าหมาย',
      'รหัสเป้าหมาย',
      'คำอธิบาย',
      'IP Address',
      'Browser/Agent',
    ];

    const escapeCsv = (str?: string | number | null) => {
      if (str === undefined || str === null) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = logs.map((log: any) => [
      escapeCsv(log.id),
      escapeCsv(new Date(log.created_at).toLocaleString('th-TH')),
      escapeCsv(log.user ? `${log.user.full_name} (@${log.user.username})` : 'ระบบ / สาธารณะ'),
      escapeCsv(log.user?.role || '-'),
      escapeCsv(log.module),
      escapeCsv(log.action),
      escapeCsv(log.target_type || '-'),
      escapeCsv(log.target_id || '-'),
      escapeCsv(log.description),
      escapeCsv(log.ip_address || '-'),
      escapeCsv(log.user_agent || '-'),
    ]);

    const csvContent = BOM + [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\r\n');

    const fileName = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(csvContent);
  } catch (error: any) {
    console.error('Error exporting audit logs:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการ Export ข้อมูล' });
  }
});

/**
 * GET /api/v1/admin/audit-logs/:id
 * Get single log with full details
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const log = await getAuditLogById(id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการ Log นี้' });
    }
    return res.json({ success: true, data: log });
  } catch (error: any) {
    console.error('Error fetching audit log detail:', error);
    return res.status(500).json({ success: false, message: 'ไม่สามารถโหลดรายละเอียด Log ได้' });
  }
});

/**
 * GET /api/v1/admin/audit-logs
 * List audit logs with pagination and filters
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, module, action, userId, search, startDate, endDate } = req.query;

    const result = await getAuditLogs({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      module: module as string,
      action: action as string,
      userId: userId as string,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    return res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({ success: false, message: 'ไม่สามารถโหลดประวัติการใช้งานได้' });
  }
});

export default router;

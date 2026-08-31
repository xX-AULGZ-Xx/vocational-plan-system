import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { prisma, serializeBigInt } from '../../lib/prisma';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { formatThaiBaht } from '../../lib/bahttext';
import { renderDocxToHtml } from '../../lib/docx-renderer';

import { convertDocxToPdf } from '../../lib/pdf-converter';

const router = Router();
const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || './storage');
const EXPORT_DIR = path.join(STORAGE_DIR, 'exports');
const TEMPLATE_DIR = path.join(STORAGE_DIR, 'templates');

// POST /api/v1/documents/render-docx-preview (Render uploaded docx file with real-time form data)
router.post('/render-docx-preview', async (req: AuthRequest, res: Response) => {
  try {
    const { template_id, formData } = req.body;
    const result = await renderDocxToHtml(template_id ? parseInt(template_id) : null, formData || {});

    return res.json({
      success: true,
      html: result.html,
      pages: result.pages,
      total_pages: result.total_pages,
      is_custom_doc: result.is_custom_doc,
    });
  } catch (error: any) {
    console.error('Render docx preview error:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการประมวลผลพรีวิวจากไฟล์ Word (.docx)',
      error: error.message,
    });
  }
});

// Ensure directories exist
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}
if (!fs.existsSync(TEMPLATE_DIR)) {
  fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
}

// Helper to format Date to Thai Date
function formatThaiDate(date: Date | string | null): string {
  if (!date) return '-';
  const d = new Date(date);
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
}

// GET /api/v1/documents/:projectId/preview-data
router.get('/:projectId/preview-data', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.project.findUnique({
      where: { id: BigInt(projectId) },
      include: {
        department: {
          include: { division: true },
        },
        leader: true,
        alignments: {
          include: { indicator: { include: { plan: true } } },
        },
        budget_items: {
          include: { category: true },
        },
        timelines: {
          orderBy: { start_date: 'asc' },
        },
        approvals: {
          include: { approver: true },
          orderBy: { step_order: 'asc' },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลโครงการ' });
    }

    const totalBudget = Number(project.total_budget);
    const bahtText = formatThaiBaht(totalBudget);

    const docData = {
      project_code: project.project_code || 'ยังไม่ออกรหัส',
      fiscal_year: project.fiscal_year,
      title: project.title,
      department_name: project.department?.name,
      division_name: project.department?.division?.name,
      division_code: project.department?.division?.code,
      leader_name: project.leader?.full_name,
      leader_position: project.leader?.position,
      background: project.background || '',
      objectives: Array.isArray(project.objectives) ? project.objectives : [],
      target_groups: project.target_groups || {},
      expected_results: project.expected_results || '',
      alignments: project.alignments.map((a) => ({
        code: a.indicator.code,
        description: a.indicator.description,
        plan_title: a.indicator.plan?.title,
      })),
      timelines: project.timelines.map((t) => ({
        activity_name: t.activity_name,
        start_date: formatThaiDate(t.start_date),
        end_date: formatThaiDate(t.end_date),
        location: t.location,
        is_milestone: t.is_milestone,
      })),
      budget_items: project.budget_items.map((b, idx) => ({
        no: idx + 1,
        category: b.category?.name,
        description: b.description,
        quantity: Number(b.quantity),
        unit: b.unit,
        unit_price: Number(b.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2 }),
        total_amount: Number(b.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 }),
      })),
      total_budget_number: totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 }),
      total_budget_bahttext: bahtText,
      approvals: project.approvals.map((ap) => ({
        step_order: ap.step_order,
        status: ap.status,
        approver_name: ap.approver?.full_name,
        approver_position: ap.approver?.position,
        comment: ap.comment,
        signed_at: ap.signed_at ? formatThaiDate(ap.signed_at) : null,
      })),
    };

    return res.json({ success: true, data: docData });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// POST /api/v1/documents/export-dynamic
router.post('/export-dynamic', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { template_id, formData, format = 'docx' } = req.body;
    
    const template = await (prisma as any).documentTemplate.findUnique({
      where: { id: parseInt(template_id) },
      include: { tags: true }
    });
    
    if (!template) {
      return res.status(404).json({ success: false, message: 'ไม่พบเทมเพลต' });
    }

    const { resolveTemplateFilePath, renderDynamicDocx } = require('../../lib/docx-generator');
    const templatePath = resolveTemplateFilePath(template.file_path);
    if (!templatePath) {
      return res.status(404).json({ success: false, message: 'ไม่พบไฟล์แม่แบบต้นฉบับบนระบบ' });
    }
    
    // Generate DOCX
    const { filePath: docxPath, fileName: docxName } = await renderDynamicDocx(templatePath, formData || {}, template.tags || []);
    
    if (format === 'pdf') {
      const pdfName = docxName.replace('.docx', '.pdf');
      const pdfPath = path.join(EXPORT_DIR, pdfName);
      await convertDocxToPdf(docxPath, pdfPath);
      return res.json({
        success: true,
        message: 'สร้างเอกสาร PDF เรียบร้อย',
        download_url: `/api/v1/documents/download/${pdfName}`,
      });
    }

    return res.json({
      success: true,
      message: 'สร้างเอกสาร DOCX เรียบร้อย',
      download_url: `/api/v1/documents/download/${docxName}`,
    });
  } catch (error: any) {
    console.error('Export dynamic Error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างเอกสาร', error: error.message });
  }
});


// GET /api/v1/documents/download/:filename
router.get('/download/:filename', (req: Request, res: Response) => {
  const filename = req.params.filename;
  // Use the same path resolution as docx-generator
  const path = require('path');
  const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || './storage');
  const EXPORTS_DIR = path.join(STORAGE_DIR, 'exports');
  const filePath = path.join(EXPORTS_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }
  
  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('Download error:', err);
    }
  });
});

export default router;

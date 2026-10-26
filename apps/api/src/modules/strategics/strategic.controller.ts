import { Router, Request, Response } from 'express';
import { prisma, serializeBigInt } from '../../lib/prisma';

const router = Router();

// GET /api/v1/strategics
router.get('/', async (req: Request, res: Response) => {
  try {
    const plans = await prisma.strategicPlan.findMany({
      include: {
        indicators: true,
      },
      orderBy: { fiscal_year: 'desc' },
    });

    return res.json({ success: true, data: serializeBigInt(plans) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

// GET /api/v1/budget-categories
router.get('/budget-categories', async (req: Request, res: Response) => {
  try {
    let categories = await prisma.budgetCategory.findMany();
    
    // Ensure all 4 standard categories exist (especially 'อื่น ๆ')
    const standardDefs = [
      { key: 'วัสดุ', name: 'ค่าวัสดุ (เอกสาร / อุปกรณ์อบรม / วัสดุฝึก)' },
      { key: 'ใช้สอย', name: 'ค่าใช้สอย (ค่าอาหารกลางวันและเครื่องดื่ม / ค่าสถานที่ / ค่าจ้างเหมา)' },
      { key: 'ตอบแทน', name: 'ค่าตอบแทน (วิทยากร / คณะกรรมการ)' },
      { key: 'อื่น', name: 'อื่น ๆ' },
    ];
    for (const def of standardDefs) {
      if (!categories.some((c) => c.name.includes(def.key))) {
        try {
          const created = await prisma.budgetCategory.create({
            data: { name: def.name, source_type: 'SUBSIDY' },
          });
          categories.push(created);
        } catch (e) {
          categories = await prisma.budgetCategory.findMany();
        }
      }
    }

    // Standard order: ๑. ค่าวัสดุ, ๒. ค่าใช้สอย, ๓. ค่าตอบแทน, ๔. อื่น ๆ
    const order = ['วัสดุ', 'ใช้สอย', 'ตอบแทน', 'อื่น'];
    categories.sort((a, b) => {
      const idxA = order.findIndex((o) => a.name.includes(o));
      const idxB = order.findIndex((o) => b.name.includes(o));
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });
    return res.json({ success: true, data: serializeBigInt(categories) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด', error: error.message });
  }
});

export default router;

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
    const categories = await prisma.budgetCategory.findMany();
    // Standard order: ๑. ค่าวัสดุ, ๒. ค่าใช้สอย, ๓. ค่าตอบแทน
    const order = ['วัสดุ', 'ใช้สอย', 'ตอบแทน'];
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

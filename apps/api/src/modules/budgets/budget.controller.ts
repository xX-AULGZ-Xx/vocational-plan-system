import { Router, Response } from 'express';
import { prisma, serializeBigInt } from '../../lib/prisma';
import { authenticate, AuthRequest } from '../../middlewares/auth';

const router = Router();

// GET /api/v1/budgets/dashboard-stats
router.get('/dashboard-stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { fiscal_year } = req.query;
    const year = fiscal_year ? parseInt(fiscal_year as string) : 2569;

    // 1. Projects in fiscal year
    const projects = await prisma.project.findMany({
      where: { fiscal_year: year },
      include: {
        department: {
          include: {
            division: true,
          },
        },
        alignments: {
          include: {
            indicator: true,
          },
        },
      },
    });

    // 2. Aggregate metrics
    let totalAllocated = 0;
    let totalProposed = 0;
    let actualSpent = 0;
    const statusCounts: Record<string, number> = {
      draft: 0,
      submitted: 0,
      dept_approved: 0,
      deputy_approved: 0,
      planning_approved: 0,
      approved: 0,
      in_progress: 0,
      completed: 0,
      rejected: 0,
    };

    // 3. Division budget summary (4 divisions)
    const divisionSummary: Record<string, { code: string; name: string; totalBudget: number; spent: number; projectCount: number }> = {
      ACAD: { code: 'ACAD', name: 'ฝ่ายวิชาการ', totalBudget: 0, spent: 0, projectCount: 0 },
      RES: { code: 'RES', name: 'ฝ่ายบริหารทรัพยากร', totalBudget: 0, spent: 0, projectCount: 0 },
      DEV: { code: 'DEV', name: 'ฝ่ายพัฒนากิจการนักเรียนฯ', totalBudget: 0, spent: 0, projectCount: 0 },
      STRAT: { code: 'STRAT', name: 'ฝ่ายยุทธศาสตร์และแผนงานฯ', totalBudget: 0, spent: 0, projectCount: 0 },
    };

    // 4. Strategic alignment counts
    const strategicCounts: Record<string, { code: string; description: string; count: number; budget: number }> = {};

    for (const p of projects) {
      const budgetNum = Number(p.total_budget) || 0;
      const spentNum = Number(p.actual_spent) || 0;
      const isApproved = p.status === 'approved' || p.status === 'in_progress' || p.status === 'completed';
      const isSubmitted = p.status !== 'draft' && p.status !== 'rejected';

      if (isSubmitted) {
        totalProposed += budgetNum;
      }

      if (isApproved) {
        totalAllocated += budgetNum;
        actualSpent += spentNum;
      }

      if (statusCounts[p.status] !== undefined) {
        statusCounts[p.status]++;
      } else {
        statusCounts[p.status] = 1;
      }

      const divCode = p.department?.division?.code?.toUpperCase();
      if (divCode && divisionSummary[divCode]) {
        if (isApproved || isSubmitted) {
          divisionSummary[divCode].totalBudget += budgetNum;
          divisionSummary[divCode].spent += spentNum;
        }
        divisionSummary[divCode].projectCount += 1;
      }

      for (const al of p.alignments) {
        const indCode = al.indicator?.code || 'OTHER';
        if (!strategicCounts[indCode]) {
          strategicCounts[indCode] = {
            code: indCode,
            description: al.indicator?.description || '',
            count: 0,
            budget: 0,
          };
        }
        strategicCounts[indCode].count += 1;
        if (isApproved || isSubmitted) {
          strategicCounts[indCode].budget += budgetNum;
        }
      }
    }

    // Display budget: if approved budget exists use it, otherwise show total proposed budget from active workflow
    const effectiveAllocated = totalAllocated > 0 ? totalAllocated : totalProposed;
    const remainingBudget = Math.max(0, effectiveAllocated - actualSpent);
    const spendingPercentage = effectiveAllocated > 0 ? (actualSpent / effectiveAllocated) * 100 : 0;

    return res.json({
      success: true,
      data: serializeBigInt({
        fiscal_year: year,
        total_projects: projects.length,
        metrics: {
          total_allocated: effectiveAllocated,
          approved_budget: totalAllocated,
          proposed_budget: totalProposed,
          actual_spent: actualSpent,
          remaining_budget: remainingBudget,
          spending_percentage: parseFloat(spendingPercentage.toFixed(2)),
        },
        status_counts: statusCounts,
        division_summary: Object.values(divisionSummary),
        strategic_summary: Object.values(strategicCounts),
      }),
    });
  } catch (error: any) {
    console.error('Budget stats error:', error);
    return res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการคำนวณสถิติงบประมาณ', error: error.message });
  }
});

export default router;

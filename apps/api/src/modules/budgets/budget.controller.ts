import { Router, Response } from 'express';
import { prisma, serializeBigInt } from '../../lib/prisma';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { getProjectTargetDivisionId } from '../approvals/approval.controller';

const router = Router();

function getThaiFiscalYear(date: Date = new Date()): number {
  const thaiYear = date.getFullYear() + 543;
  const month = date.getMonth(); // 0 = Jan, 9 = Oct
  return month >= 9 ? thaiYear + 1 : thaiYear;
}

// GET /api/v1/budgets/dashboard-stats
// Allows public viewing for guest dashboard or authenticated user
router.get('/dashboard-stats', async (req: AuthRequest, res: Response) => {
  try {
    const { fiscal_year } = req.query;
    let year: number;
    if (fiscal_year) {
      year = parseInt(fiscal_year as string);
    } else {
      const setting = await (prisma as any).systemSetting.findUnique({
        where: { key: 'current_fiscal_year' },
      });
      year = setting?.value ? parseInt(setting.value) : getThaiFiscalYear();
    }

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

    // 3. Division budget summary (4 divisions from DB)
    const divisionsList = await prisma.division.findMany({ orderBy: { id: 'asc' } });
    const divisionMap = new Map<number, any>(divisionsList.map(d => [d.id, d]));

    const divisionSummary: Record<string, { code: string; name: string; totalBudget: number; spent: number; projectCount: number }> = {};
    for (const d of divisionsList) {
      const codeUpper = d.code.toUpperCase();
      divisionSummary[codeUpper] = {
        code: codeUpper,
        name: d.name,
        totalBudget: 0,
        spent: 0,
        projectCount: 0,
      };
    }

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

      // Resolve division code (via dynamic target division or department division)
      let resolvedDivCode = p.department?.division?.code?.toUpperCase();
      const targetDivId = await getProjectTargetDivisionId(p);
      if (targetDivId && divisionMap.has(targetDivId)) {
        resolvedDivCode = divisionMap.get(targetDivId)?.code?.toUpperCase() || resolvedDivCode;
      }

      if (resolvedDivCode && divisionSummary[resolvedDivCode]) {
        // Strict business rule: Only count budget and spent for 4 divisions when project is APPROVED by Director
        if (isApproved) {
          divisionSummary[resolvedDivCode].totalBudget += budgetNum;
          divisionSummary[resolvedDivCode].spent += spentNum;
        }
        if (isApproved || isSubmitted) {
          divisionSummary[resolvedDivCode].projectCount += 1;
        }
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
        if (isApproved) {
          strategicCounts[indCode].count += 1;
          strategicCounts[indCode].budget += budgetNum;
        }
      }
    }

    // Display budget: only approved budget for allocated total
    const effectiveAllocated = totalAllocated;
    const remainingBudget = Math.max(0, effectiveAllocated - actualSpent);
    const spendingPercentage = effectiveAllocated > 0 ? (actualSpent / effectiveAllocated) * 100 : 0;

    // 5. Available fiscal years from DB projects, settings, and custom_fiscal_years
    const dbYearsRaw = await prisma.project.findMany({
      select: { fiscal_year: true },
      distinct: ['fiscal_year'],
      orderBy: { fiscal_year: 'desc' },
    });
    const yearSet = new Set<number>(dbYearsRaw.map((r) => r.fiscal_year));

    try {
      const customYearsSetting = await prisma.systemSetting.findUnique({
        where: { key: 'custom_fiscal_years' },
      });
      if (customYearsSetting?.value) {
        const customYears: number[] = JSON.parse(customYearsSetting.value);
        if (Array.isArray(customYears)) {
          customYears.forEach((y) => {
            const num = parseInt(String(y), 10);
            if (!isNaN(num) && num > 2500) yearSet.add(num);
          });
        }
      }
      const currentSetting = await prisma.systemSetting.findUnique({
        where: { key: 'current_fiscal_year' },
      });
      if (currentSetting?.value) {
        const cYear = parseInt(currentSetting.value, 10);
        if (!isNaN(cYear) && cYear > 2500) {
          yearSet.add(cYear);
        }
      }
    } catch {}

    const dbYears = Array.from(yearSet).filter((y) => !isNaN(y) && y > 2500).sort((a, b) => b - a);

    return res.json({
      success: true,
      data: serializeBigInt({
        fiscal_year: year,
        available_years: dbYears,
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

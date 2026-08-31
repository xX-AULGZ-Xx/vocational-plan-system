import { Router, Request, Response } from 'express';
import { prisma, serializeBigInt } from '../../lib/prisma';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { QuestionType } from '@prisma/client';

const router = Router();

// Helper function to interpret mean rating
export function interpretLikertScale(mean: number): string {
  if (mean >= 4.51) return 'มากที่สุด';
  if (mean >= 3.51) return 'มาก';
  if (mean >= 2.51) return 'ปานกลาง';
  if (mean >= 1.51) return 'น้อย';
  return 'น้อยที่สุด';
}

// Calculate Mean and Standard Deviation
export function calculateStatistics(scores: number[]): { count: number; mean: number; sd: number; level: string } {
  const count = scores.length;
  if (count === 0) {
    return { count: 0, mean: 0, sd: 0, level: '-' };
  }

  const sum = scores.reduce((acc, val) => acc + val, 0);
  const mean = Math.round((sum / count) * 100) / 100;

  if (count === 1) {
    return { count, mean, sd: 0, level: interpretLikertScale(mean) };
  }

  const variance = scores.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (count - 1);
  const sd = Math.round(Math.sqrt(variance) * 100) / 100;

  return {
    count,
    mean,
    sd,
    level: interpretLikertScale(mean),
  };
}

// Default standard vocational evaluation structure
const defaultEvaluationData = {
  title: 'แบบประเมินความพึงพอใจการดำเนินงานโครงการ',
  description: 'แบบประเมินนี้จัดทำขึ้นเพื่อสำรวจความคิดเห็นและความพึงพอใจของผู้เข้าร่วมโครงการ เพื่อนำข้อมูลไปปรับปรุงและพัฒนาการดำเนินงานให้มีประสิทธิภาพยิ่งขึ้น',
  target_responses: 50,
  theme_config: {
    font: 'prompt',
    color: 'indigo',
    bg_style: 'gradient',
    header_style: 'gradient',
    border_radius: 'rounded-3xl',
  },
  sections: [
    {
      title: 'ตอนที่ 1: ข้อมูลทั่วไปของผู้ตอบแบบประเมิน',
      description: 'กรุณาเลือกข้อมูลตามความเป็นจริง',
      order_index: 1,
      questions: [
        {
          question_text: 'เพศ',
          question_type: QuestionType.RADIO,
          options: ['ชาย', 'หญิง', 'เพศทางเลือก / อื่นๆ'],
          order_index: 1,
          is_required: true,
        },
        {
          question_text: 'สถานะ / ตำแหน่งของผู้ตอบแบบประเมิน',
          question_type: QuestionType.RADIO,
          options: ['นักเรียน / นักศึกษา', 'ครู / อาจารย์', 'บุคลากรทางการศึกษา', 'ผู้ปกครอง / ประชาชนทั่วไป', 'อื่นๆ'],
          order_index: 2,
          is_required: true,
        },
      ],
    },
    {
      title: 'ตอนที่ 2: ระดับความพึงพอใจต่อการดำเนินงานโครงการ',
      description: 'ระดับคะแนน: 5 = มากที่สุด, 4 = มาก, 3 = ปานกลาง, 2 = น้อย, 1 = น้อยที่สุด',
      order_index: 2,
      questions: [
        {
          question_text: '1. การประชาสัมพันธ์โครงการและการแจ้งข้อมูลข่าวสาร',
          question_type: QuestionType.RATING_5,
          order_index: 1,
          is_required: true,
        },
        {
          question_text: '2. ความเหมาะสมของขั้นตอนและรูปแบบการจัดกิจกรรม',
          question_type: QuestionType.RATING_5,
          order_index: 2,
          is_required: true,
        },
        {
          question_text: '3. ความชัดเจนในการถ่ายทอดความรู้และคำแนะนำของวิทยากร / ผู้รับผิดชอบ',
          question_type: QuestionType.RATING_5,
          order_index: 3,
          is_required: true,
        },
        {
          question_text: '4. ความเหมาะสมของสถานที่ บรรยากาศ และสิ่งอำนวยความสะดวก',
          question_type: QuestionType.RATING_5,
          order_index: 4,
          is_required: true,
        },
        {
          question_text: '5. ความพร้อมของสื่อ อุปกรณ์ และเอกสารประกอบการจัดกิจกรรม',
          question_type: QuestionType.RATING_5,
          order_index: 5,
          is_required: true,
        },
        {
          question_text: '6. ความเหมาะสมของระยะเวลาและกำหนดการดำเนินงาน',
          question_type: QuestionType.RATING_5,
          order_index: 6,
          is_required: true,
        },
        {
          question_text: '7. ความรู้ ความเข้าใจ หรือทักษะที่ได้รับจากการเข้าร่วมกิจกรรม',
          question_type: QuestionType.RATING_5,
          order_index: 7,
          is_required: true,
        },
        {
          question_text: '8. สามารถนำความรู้และประสบการณ์ที่ได้รับไปประยุกต์ใช้ประโยชน์ได้จริง',
          question_type: QuestionType.RATING_5,
          order_index: 8,
          is_required: true,
        },
        {
          question_text: '9. ความพึงพอใจในภาพรวมต่อการดำเนินงานโครงการนี้',
          question_type: QuestionType.RATING_5,
          order_index: 9,
          is_required: true,
        },
      ],
    },
    {
      title: 'ตอนที่ 3: ข้อคิดเห็นและข้อเสนอแนะเพิ่มเติม',
      description: 'ข้อเสนอแนะเพื่อการพัฒนาและปรับปรุงในครั้งต่อไป',
      order_index: 3,
      questions: [
        {
          question_text: 'สิ่งที่ท่านพึงพอใจหรือประทับใจมากที่สุดในโครงการนี้',
          question_type: QuestionType.TEXT,
          order_index: 1,
          is_required: false,
        },
        {
          question_text: 'ข้อเสนอแนะหรือสิ่งที่ควรปรับปรุงสำหรับการจัดโครงการครั้งต่อไป',
          question_type: QuestionType.TEXT,
          order_index: 2,
          is_required: false,
        },
      ],
    },
  ],
};

// ----------------------------------------------------
// 1. GET /api/v1/projects/:projectId/evaluation
// Fetch project evaluation form details & summary status
// ----------------------------------------------------
router.get('/projects/:projectId/evaluation', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = BigInt(req.params.projectId);

    const form = await prisma.projectEvaluationForm.findUnique({
      where: { project_id: projectId },
      include: {
        sections: {
          orderBy: { order_index: 'asc' },
          include: {
            questions: {
              orderBy: { order_index: 'asc' },
            },
          },
        },
        _count: {
          select: { responses: true },
        },
      },
    });

    if (!form) {
      return res.json({
        success: true,
        has_form: false,
        data: null,
      });
    }

    return res.json({
      success: true,
      has_form: true,
      data: serializeBigInt({
        ...form,
        total_responses: form._count.responses,
      }),
    });
  } catch (error: any) {
    console.error('Error fetching evaluation form:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

// ----------------------------------------------------
// 2. POST /api/v1/projects/:projectId/evaluation/init-default
// Initialize or reset default vocational evaluation template
// ----------------------------------------------------
router.post('/projects/:projectId/evaluation/init-default', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = BigInt(req.params.projectId);

    // Verify project existence
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, title: true },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'ไม่พบโครงการที่ระบุ' });
    }

    // Delete existing form if any (and cascading sections/questions/responses)
    const existing = await prisma.projectEvaluationForm.findUnique({
      where: { project_id: projectId },
    });

    if (existing) {
      await prisma.projectEvaluationForm.delete({
        where: { id: existing.id },
      });
    }

    // Create new default form
    const createdForm = await prisma.projectEvaluationForm.create({
      data: {
        project_id: projectId,
        title: `แบบประเมินความพึงพอใจ - ${project.title}`,
        description: defaultEvaluationData.description,
        is_active: true,
        target_responses: defaultEvaluationData.target_responses,
        theme_config: defaultEvaluationData.theme_config,
        sections: {
          create: defaultEvaluationData.sections.map((s) => ({
            title: s.title,
            description: s.description,
            order_index: s.order_index,
            questions: {
              create: s.questions.map((q: any) => ({
                question_text: q.question_text,
                question_type: q.question_type,
                options: q.options ? q.options : undefined,
                order_index: q.order_index,
                is_required: q.is_required,
              })),
            },
          })),
        },
      },
      include: {
        sections: {
          orderBy: { order_index: 'asc' },
          include: {
            questions: {
              orderBy: { order_index: 'asc' },
            },
          },
        },
      },
    });

    return res.json({
      success: true,
      message: 'สร้างแบบประเมินมาตรฐานเรียบร้อยแล้ว',
      data: serializeBigInt(createdForm),
    });
  } catch (error: any) {
    console.error('Error creating default evaluation:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

// ----------------------------------------------------
// 3. POST /api/v1/projects/:projectId/evaluation
// Save / Update customized evaluation form structure
// ----------------------------------------------------
router.post('/projects/:projectId/evaluation', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = BigInt(req.params.projectId);
    const { title, description, is_active, target_responses, theme_config, sections } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อแบบประเมิน' });
    }

    // Check existing
    const existing = await prisma.projectEvaluationForm.findUnique({
      where: { project_id: projectId },
    });

    if (existing) {
      // Transaction to safely update sections and questions
      await prisma.$transaction(async (tx) => {
        // Update form base info
        await tx.projectEvaluationForm.update({
          where: { id: existing.id },
          data: {
            title,
            description,
            is_active: is_active !== undefined ? Boolean(is_active) : existing.is_active,
            target_responses: Number(target_responses) || 0,
            theme_config: theme_config !== undefined ? theme_config : (existing.theme_config || {}),
          },
        });

        // Delete existing sections and questions
        await tx.evaluationSection.deleteMany({
          where: { form_id: existing.id },
        });

        // Create new sections with questions
        if (Array.isArray(sections)) {
          for (let sIdx = 0; sIdx < sections.length; sIdx++) {
            const sec = sections[sIdx];
            await tx.evaluationSection.create({
              data: {
                form_id: existing.id,
                title: sec.title || `ตอนที่ ${sIdx + 1}`,
                description: sec.description || '',
                order_index: sec.order_index ?? (sIdx + 1),
                questions: {
                  create: (sec.questions || []).map((q: any, qIdx: number) => ({
                    question_text: q.question_text || `ข้อที่ ${qIdx + 1}`,
                    question_type: q.question_type || QuestionType.RATING_5,
                    options: q.options ? q.options : undefined,
                    order_index: q.order_index ?? (qIdx + 1),
                    is_required: q.is_required !== undefined ? Boolean(q.is_required) : true,
                  })),
                },
              },
            });
          }
        }
      });
    } else {
      // Create new
      await prisma.projectEvaluationForm.create({
        data: {
          project_id: projectId,
          title,
          description,
          is_active: is_active !== undefined ? Boolean(is_active) : true,
          target_responses: Number(target_responses) || 0,
          theme_config: theme_config || {},
          sections: {
            create: (sections || []).map((sec: any, sIdx: number) => ({
              title: sec.title || `ตอนที่ ${sIdx + 1}`,
              description: sec.description || '',
              order_index: sec.order_index ?? (sIdx + 1),
              questions: {
                create: (sec.questions || []).map((q: any, qIdx: number) => ({
                  question_text: q.question_text || `ข้อที่ ${qIdx + 1}`,
                  question_type: q.question_type || QuestionType.RATING_5,
                  options: q.options ? q.options : undefined,
                  order_index: q.order_index ?? (qIdx + 1),
                  is_required: q.is_required !== undefined ? Boolean(q.is_required) : true,
                })),
              },
            })),
          },
        },
      });
    }

    const updated = await prisma.projectEvaluationForm.findUnique({
      where: { project_id: projectId },
      include: {
        sections: {
          orderBy: { order_index: 'asc' },
          include: {
            questions: {
              orderBy: { order_index: 'asc' },
            },
          },
        },
      },
    });

    return res.json({
      success: true,
      message: 'บันทึกแบบประเมินเรียบร้อยแล้ว',
      data: serializeBigInt(updated),
    });
  } catch (error: any) {
    console.error('Error saving evaluation form:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

// ----------------------------------------------------
// 4. PATCH /api/v1/projects/:projectId/evaluation/toggle-status
// Toggle survey active status (Open/Close)
// ----------------------------------------------------
router.patch('/projects/:projectId/evaluation/toggle-status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = BigInt(req.params.projectId);
    const form = await prisma.projectEvaluationForm.findUnique({
      where: { project_id: projectId },
    });

    if (!form) {
      return res.status(404).json({ success: false, message: 'ไม่พบแบบประเมินของโครงการนี้' });
    }

    const updated = await prisma.projectEvaluationForm.update({
      where: { id: form.id },
      data: { is_active: !form.is_active },
    });

    return res.json({
      success: true,
      message: updated.is_active ? 'เปิดรับแบบประเมินแล้ว' : 'ปิดรับแบบประเมินแล้ว',
      is_active: updated.is_active,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

// ----------------------------------------------------
// 5. GET /api/v1/projects/:projectId/evaluation/results
// Calculate statistical results (Mean, SD, Interpretation)
// ----------------------------------------------------
router.get('/projects/:projectId/evaluation/results', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = BigInt(req.params.projectId);

    const form = await prisma.projectEvaluationForm.findUnique({
      where: { project_id: projectId },
      include: {
        sections: {
          orderBy: { order_index: 'asc' },
          include: {
            questions: {
              orderBy: { order_index: 'asc' },
              include: {
                answers: true,
              },
            },
          },
        },
        responses: {
          orderBy: { submitted_at: 'desc' },
          include: {
            answers: true,
          },
        },
      },
    });

    if (!form) {
      return res.status(404).json({ success: false, message: 'ไม่พบแบบประเมิน' });
    }

    const totalResponses = form.responses.length;
    const allRatingScores: number[] = [];

    // Demographics summary (from RADIO / CHECKBOX questions in Section 1 or all sections)
    const demographics: Record<string, { title: string; counts: Record<string, number>; total: number }> = {};

    // Analyze questions
    const processedSections = form.sections.map((section) => {
      const sectionScores: number[] = [];

      const processedQuestions = section.questions.map((question) => {
        if (question.question_type === QuestionType.RATING_5) {
          const scores = question.answers
            .map((a) => a.score)
            .filter((s): s is number => s !== null && s !== undefined && s >= 1 && s <= 5);

          scores.forEach((s) => {
            sectionScores.push(s);
            allRatingScores.push(s);
          });

          // Distribution of scores 1 to 5
          const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
          scores.forEach((s) => {
            distribution[s] = (distribution[s] || 0) + 1;
          });

          const stats = calculateStatistics(scores);

          return {
            id: question.id.toString(),
            question_text: question.question_text,
            question_type: question.question_type,
            order_index: question.order_index,
            is_required: question.is_required,
            distribution,
            stats,
          };
        } else if (question.question_type === QuestionType.RADIO || question.question_type === QuestionType.CHECKBOX) {
          // Demographic count
          const counts: Record<string, number> = {};
          question.answers.forEach((ans) => {
            const val = ans.text_value?.trim();
            if (val) {
              counts[val] = (counts[val] || 0) + 1;
            }
          });

          demographics[question.id.toString()] = {
            title: question.question_text,
            counts,
            total: question.answers.length,
          };

          return {
            id: question.id.toString(),
            question_text: question.question_text,
            question_type: question.question_type,
            options: question.options,
            order_index: question.order_index,
            counts,
            total_answered: question.answers.length,
          };
        } else {
          // Open-ended TEXT questions
          const comments = question.answers
            .map((a) => a.text_value?.trim())
            .filter((t): t is string => Boolean(t && t.length > 0));

          return {
            id: question.id.toString(),
            question_text: question.question_text,
            question_type: question.question_type,
            order_index: question.order_index,
            comments,
            total_comments: comments.length,
          };
        }
      });

      const sectionStats = calculateStatistics(sectionScores);

      return {
        id: section.id.toString(),
        title: section.title,
        description: section.description,
        order_index: section.order_index,
        questions: processedQuestions,
        stats: sectionStats,
      };
    });

    const overallStats = calculateStatistics(allRatingScores);

    // Calculate achievement percentage (Mean / 5.0 * 100)
    const satisfactionPercentage = overallStats.count > 0 
      ? Math.round((overallStats.mean / 5) * 10000) / 100 
      : 0;

    return res.json({
      success: true,
      data: {
        form_id: form.id.toString(),
        project_id: form.project_id.toString(),
        title: form.title,
        description: form.description,
        is_active: form.is_active,
        target_responses: form.target_responses,
        total_responses: totalResponses,
        overall_stats: overallStats,
        satisfaction_percentage: satisfactionPercentage,
        demographics,
        sections: processedSections,
      },
    });
  } catch (error: any) {
    console.error('Error calculating evaluation results:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

// ----------------------------------------------------
// 6. DELETE /api/v1/projects/:projectId/evaluation/responses
// Reset all submitted responses for a project evaluation form
// ----------------------------------------------------
router.delete('/projects/:projectId/evaluation/responses', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = BigInt(req.params.projectId);
    const form = await prisma.projectEvaluationForm.findUnique({
      where: { project_id: projectId },
    });

    if (!form) {
      return res.status(404).json({ success: false, message: 'ไม่พบแบบประเมิน' });
    }

    await prisma.evaluationResponse.deleteMany({
      where: { form_id: form.id },
    });

    return res.json({
      success: true,
      message: 'ล้างข้อมูลผลการตอบแบบประเมินเรียบร้อยแล้ว',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

// ----------------------------------------------------
// 7. GET /api/v1/public/surveys/:formId
// Public endpoint for participants to load survey structure
// ----------------------------------------------------
router.get('/public/surveys/:formId', async (req: Request, res: Response) => {
  try {
    const formId = BigInt(req.params.formId);

    const form = await prisma.projectEvaluationForm.findUnique({
      where: { id: formId },
      include: {
        project: {
          select: {
            title: true,
            project_code: true,
            department: { select: { name: true } },
          },
        },
        sections: {
          orderBy: { order_index: 'asc' },
          include: {
            questions: {
              orderBy: { order_index: 'asc' },
              select: {
                id: true,
                section_id: true,
                question_text: true,
                question_type: true,
                options: true,
                order_index: true,
                is_required: true,
              },
            },
          },
        },
      },
    });

    if (!form) {
      return res.status(404).json({ success: false, message: 'ไม่พบแบบประเมินที่ระบุ' });
    }

    return res.json({
      success: true,
      data: serializeBigInt({
        id: form.id,
        title: form.title,
        description: form.description,
        is_active: form.is_active,
        theme_config: form.theme_config || {},
        project_title: form.project.title,
        project_code: form.project.project_code,
        department_name: form.project.department?.name,
        sections: form.sections,
      }),
    });
  } catch (error: any) {
    console.error('Error fetching public survey:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

// ----------------------------------------------------
// 8. POST /api/v1/public/surveys/:formId/submit
// Public endpoint to submit participant answers
// ----------------------------------------------------
router.post('/public/surveys/:formId/submit', async (req: Request, res: Response) => {
  try {
    const formId = BigInt(req.params.formId);
    const { answers, respondent_meta } = req.body;

    const form = await prisma.projectEvaluationForm.findUnique({
      where: { id: formId },
      select: { id: true, is_active: true },
    });

    if (!form) {
      return res.status(404).json({ success: false, message: 'ไม่พบแบบประเมิน' });
    }

    if (!form.is_active) {
      return res.status(400).json({ success: false, message: 'แบบประเมินนี้ปิดรับการตอบแล้ว' });
    }

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: 'ไม่พบข้อมูลคำตอบที่ส่ง' });
    }

    // Save response in a transaction
    const savedResponse = await prisma.$transaction(async (tx) => {
      const responseRecord = await tx.evaluationResponse.create({
        data: {
          form_id: formId,
          respondent_meta: respondent_meta || {},
        },
      });

      const answerRecords = answers.map((ans: any) => ({
        response_id: responseRecord.id,
        question_id: BigInt(ans.question_id),
        score: ans.score !== undefined && ans.score !== null ? Number(ans.score) : null,
        text_value: ans.text_value !== undefined && ans.text_value !== null ? String(ans.text_value) : null,
      }));

      await tx.evaluationAnswer.createMany({
        data: answerRecords,
      });

      return responseRecord;
    });

    return res.json({
      success: true,
      message: 'บันทึกแบบประเมินความพึงพอใจสำเร็จ ขอขอบพระคุณเป็นอย่างยิ่ง',
      response_id: savedResponse.id.toString(),
    });
  } catch (error: any) {
    console.error('Error submitting survey response:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

export default router;

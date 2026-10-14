import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../core/database/prisma.service';
import { createAiProvider, type AiProvider } from '../features/ai/ai-provider';
import { withNexusContext } from '../features/ai/nexus-platform-context';

export interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option (0-based)
  points: number;
}

export interface MCQSubmission {
  questionId: string;
  selectedAnswer: number;
}

export interface MCQAssignment {
  questions: MCQQuestion[];
  totalPoints: number;
}

export interface MCQResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  totalQuestions: number;
  details: {
    questionId: string;
    isCorrect: boolean;
    selectedAnswer: number;
    correctAnswer: number;
    pointsEarned: number;
  }[];
}

export type RubricLevel =
  | 'EXCELLENT'
  | 'GOOD'
  | 'NEEDS_IMPROVEMENT'
  | 'UNSATISFACTORY';

export interface RubricCriteria {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
}

export interface RubricGrade {
  criteriaId: string;
  level: RubricLevel;
  comment?: string;
}

export interface RubricResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  overallLevel: RubricLevel;
  details: {
    criteriaId: string;
    criteriaName: string;
    level: RubricLevel;
    levelArabic: string;
    pointsEarned: number;
    maxPoints: number;
    comment?: string;
  }[];
}

import { EventsGateway } from '../gateway/events.gateway';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class AutoGradingService {
  private readonly ai: AiProvider | null;

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
    @Optional() private configService?: ConfigService,
    @Optional() private uploadService?: UploadService,
  ) {
    this.ai = createAiProvider(configService);
  }

  /**
   * Auto-grade MCQ assignment
   */
  gradeMCQ(questions: MCQQuestion[], answers: MCQSubmission[]): MCQResult {
    let totalScore = 0;
    let correctCount = 0;
    const maxScore = questions.reduce((sum, q) => sum + q.points, 0);

    const details = questions.map((question) => {
      const submission = answers.find((a) => a.questionId === question.id);
      const selectedAnswer = submission?.selectedAnswer ?? -1;
      const isCorrect = selectedAnswer === question.correctAnswer;
      const pointsEarned = isCorrect ? question.points : 0;

      if (isCorrect) {
        correctCount++;
        totalScore += question.points;
      }

      return {
        questionId: question.id,
        isCorrect,
        selectedAnswer,
        correctAnswer: question.correctAnswer,
        pointsEarned,
      };
    });

    return {
      totalScore,
      maxScore,
      percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
      correctCount,
      totalQuestions: questions.length,
      details,
    };
  }

  /**
   * Auto-grade rubric submission
   */
  gradeRubric(criteria: RubricCriteria[], grades: RubricGrade[]): RubricResult {
    const levelMultipliers: Record<RubricLevel, number> = {
      EXCELLENT: 1.0,
      GOOD: 0.75,
      NEEDS_IMPROVEMENT: 0.5,
      UNSATISFACTORY: 0.25,
    };

    const levelArabicNames: Record<RubricLevel, string> = {
      EXCELLENT: 'ممتاز',
      GOOD: 'جيد',
      NEEDS_IMPROVEMENT: 'يحتاج تحسين',
      UNSATISFACTORY: 'غير مقبول',
    };

    let totalScore = 0;
    const maxScore = criteria.reduce((sum, c) => sum + c.maxPoints, 0);

    const details = criteria.map((criterion) => {
      const grade = grades.find((g) => g.criteriaId === criterion.id);
      const level = grade?.level || 'NEEDS_IMPROVEMENT';
      const pointsEarned = Math.round(criterion.maxPoints * levelMultipliers[level]);
      totalScore += pointsEarned;

      return {
        criteriaId: criterion.id,
        criteriaName: criterion.name,
        level,
        levelArabic: levelArabicNames[level],
        pointsEarned,
        maxPoints: criterion.maxPoints,
        comment: grade?.comment,
      };
    });

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    let overallLevel: RubricLevel = 'UNSATISFACTORY';
    if (percentage >= 90) overallLevel = 'EXCELLENT';
    else if (percentage >= 75) overallLevel = 'GOOD';
    else if (percentage >= 50) overallLevel = 'NEEDS_IMPROVEMENT';

    return {
      totalScore,
      maxScore,
      percentage,
      overallLevel,
      details,
    };
  }

  /**
   * Save auto-graded submission
   */
  async saveAutoGrade(
    submissionId: string,
    score: number,
    feedback: string,
    autoGradeDetails?: MCQResult | RubricResult,
  ) {
    return this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        grade: score,
        score: score,
        feedback: feedback,
        gradedAt: new Date(),
      },
    });
  }

  /**
   * Generate default rubric criteria
   */
  getDefaultRubricCriteria(): RubricCriteria[] {
    return [
      {
        id: 'completeness',
        name: 'اكتمال الإجابة',
        description: 'هل أجاب الطالب على جميع أجزاء السؤال؟',
        maxPoints: 25,
      },
      {
        id: 'accuracy',
        name: 'دقة المعلومات',
        description: 'هل المعلومات المقدمة صحيحة ودقيقة؟',
        maxPoints: 35,
      },
      {
        id: 'organization',
        name: 'تنظيم الإجابة',
        description: 'هل الإجابة منظمة ومرتبة بشكل جيد؟',
        maxPoints: 20,
      },
      {
        id: 'presentation',
        name: 'العرض والتقديم',
        description: 'هل الخط واضح والإجابة مقروءة؟',
        maxPoints: 20,
      },
    ];
  }

  /**
   * Grade text and supported image submissions using the configured AI provider.
   */
  async gradeWithAI(assignmentId: string, submissionId: string) {
    if (!this.ai) {
      console.warn('[AutoGrading] No AI provider configured — skipping AI grading.');
      return;
    }

    try {
      const [assignment, submission] = await Promise.all([
        this.prisma.assignment.findUnique({ where: { id: assignmentId } }),
        this.prisma.submission.findUnique({
          where: { id: submissionId },
          include: { student: { select: { id: true, name: true } } },
        }),
      ]);

      if (!assignment || !submission) {
        console.warn(`[AutoGrading] Missing data: assignment=${!!assignment} submission=${!!submission}`);
        return;
      }

      // Skip if already graded
      if (submission.gradedAt) return;

      const maxScore = assignment.maxScore || (assignment as any).points || 10;

      // Build multi-modal content (text + optional images for Vision)
      const contentParts: any[] = [
        {
          type: 'text',
          text: `تعليمات الواجب:\n${assignment.description || 'لا توجد تعليمات محددة.'}\n\nإجابة الطالب:\n${submission.content || '(لم يكتب الطالب إجابة نصية)'}`,
        },
      ];

      const attachments = (submission.attachments) || [];
      const attachmentUrls = this.uploadService
        ? await this.uploadService.getSignedUrlsForReferences(attachments)
        : attachments;
      const imageUrls: string[] = [];
      for (const url of attachmentUrls) {
        if (/\.(png|jpg|jpeg|gif|webp)(?:\?|$)/i.test(url)) {
          imageUrls.push(url);
          contentParts.push({ type: 'image_url', image_url: { url, detail: 'low' } });
        }
      }

      if (attachmentUrls.length !== imageUrls.length || (this.ai.name === 'Groq' && imageUrls.length > 3)) {
        await this.prisma.submission.update({
          where: { id: submissionId },
          data: {
            feedback: JSON.stringify({
              text: 'يتطلب هذا التسليم مراجعة المعلم؛ نوع المرفقات أو عددها لا يدعمه التصحيح الآلي الحالي.',
              isAiGenerated: false,
            }),
          },
        });
        return;
      }

      const systemPrompt = withNexusContext(`أنت معلم خبير ومتعاطف. قيّم إجابة الطالب بعدالة.
الدرجة القصوى: ${maxScore}.
أرجع JSON فقط بهذا الشكل الدقيق:
{
  "score": <رقم من 0 إلى ${maxScore}>,
  "feedback": "<رسالة تشجيعية بالعربية توضح نقاط القوة والأماكن التي تحتاج تحسيناً>",
  "strengths": ["<نقطة قوة 1>", "<نقطة قوة 2>"],
  "weaknesses": ["<نقطة تحسين 1>"]
}`);

      const completion = await this.ai.client.chat.completions.create({
        model: imageUrls.length ? this.ai.visionModel : this.ai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contentParts },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 800,
        temperature: 0.3,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('Empty AI grading response');
      const parsed = JSON.parse(content);
      if (typeof parsed.score !== 'number' || !Number.isFinite(parsed.score) ||
          parsed.score < 0 || parsed.score > maxScore || typeof parsed.feedback !== 'string' ||
          !Array.isArray(parsed.strengths) || !parsed.strengths.every((value: unknown) => typeof value === 'string') ||
          !Array.isArray(parsed.weaknesses) || !parsed.weaknesses.every((value: unknown) => typeof value === 'string')) {
        throw new Error('AI response did not match the grading schema');
      }

      const score = Math.round(parsed.score * 100) / 100;

      const feedbackPayload = JSON.stringify({
        text: parsed.feedback,
        strengths: parsed.strengths,
        weaknesses: parsed.weaknesses,
        isAiGenerated: true,
      });

      await this.saveAutoGrade(submissionId, score, feedbackPayload);
      console.log(`[AutoGrading] ✅ Graded ${submissionId}: ${score}/${maxScore}`);

      // Award XP based on score percentage
      const percentage = (score / maxScore) * 100;
      let earnedXP = 0;
      if (percentage >= 90) earnedXP = 50;
      else if (percentage >= 75) earnedXP = 30;
      else if (percentage >= 60) earnedXP = 10;

      if (earnedXP > 0) {
        await this.prisma.user.update({
          where: { id: submission.studentId },
          data: { totalXP: { increment: earnedXP } },
        });
      }

      // Real-time notification
      try {
        this.eventsGateway.emitAssignmentGraded(assignment.teacherId, {
          submissionId: submission.id,
          assignmentId: assignment.id,
          grade: score,
        });
        this.eventsGateway.emitNotification(submission.studentId, {
          title: '✨ تم تصحيح واجبك',
          message: `حصلت على ${score}/${maxScore} في واجب: ${assignment.title}`,
          type: 'grade',
        });
      } catch (notifErr) {
        console.warn('[AutoGrading] Could not emit WebSocket event', notifErr);
      }

    } catch (error: any) {
      console.error(`[AutoGrading] ❌ Error grading ${submissionId}:`, error?.message);
      try {
        await this.prisma.submission.update({
          where: { id: submissionId },
          data: {
            feedback: JSON.stringify({
              text: 'حدث خطأ أثناء التصحيح التلقائي. سيقوم المعلم بمراجعة الواجب يدوياً.',
              isAiGenerated: false,
            }),
          },
        });
      } catch (_) { /* ignore fallback errors */ }
    }
  }
}

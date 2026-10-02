import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import OpenAI from 'openai';

export interface AiGradeSuggestion {
  score: number;
  feedback: string;
  maxScore: number;
}

@Injectable()
export class AiGradingService {
  private readonly logger = new Logger(AiGradingService.name);
  private readonly openai: OpenAI | null;

  constructor(private readonly prisma: PrismaService, configService: ConfigService) {
    const apiKey = configService.get<string>('OPENAI_API_KEY');
    this.openai = apiKey && apiKey !== 'sk_placeholder' ? new OpenAI({ apiKey }) : null;
  }

  async suggestGrade(submissionId: string, actorId: string, actorRole: string): Promise<AiGradeSuggestion> {
    if (!this.openai) throw new ServiceUnavailableException('اقتراح التصحيح غير متاح؛ لم يتم إعداد مزود الذكاء الاصطناعي.');

    const [actor, submission] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: actorId }, select: { id: true, role: true, schoolId: true } }),
      this.prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          assignment: { include: { subject: { select: { teacherId: true, classId: true } } } },
          student: { select: { id: true } },
        },
      }),
    ]);
    if (!actor || !submission) throw new NotFoundException('التسليم غير موجود');
    if (!actor.schoolId || actor.schoolId !== submission.assignment.schoolId) {
      throw new ForbiddenException('لا تملك صلاحية الوصول إلى هذا التسليم');
    }
    if (actorRole === 'TEACHER' &&
        submission.assignment.teacherId !== actorId &&
        submission.assignment.subject.teacherId !== actorId) {
      throw new ForbiddenException('هذا التسليم غير مسند إليك');
    }
    if (actorRole !== 'TEACHER' && actorRole !== 'ADMIN') {
      throw new ForbiddenException('لا تملك صلاحية اقتراح درجة');
    }
    if (submission.gradedAt) throw new BadRequestException('تم تصحيح هذا التسليم بالفعل');
    if (submission.attachments.length) {
      throw new BadRequestException('لا يمكن اقتراح درجة لهذا التسليم آليًا لوجود مرفقات غير قابلة للتحليل؛ راجعها يدويًا.');
    }
    const answer = submission.content?.trim();
    if (!answer) throw new BadRequestException('لا يحتوي التسليم على إجابة نصية قابلة للتحليل');
    if (answer.length > 20000) throw new BadRequestException('الإجابة أطول من الحد المدعوم لاقتراح التصحيح');

    const maxScore = submission.assignment.maxScore;
    const systemPrompt = `أنت مساعد للمعلم تقترح درجة أولية فقط، ولا تصدر حكم قبول أو نتيجة نهائية.
قيّم الإجابة وفق وصف الواجب والدرجة القصوى، ولا تفترض محتوى غير موجود. إذا كانت التعليمات أو الإجابة غير كافية، أشر إلى ذلك في الملاحظات.
أرجع كائن JSON فقط بهذا الشكل: {"grade": رقم, "feedback_ar": نص قصير, "strengths": [نصوص], "weaknesses": [نصوص]}.`;
    const input = JSON.stringify({
      assignmentTitle: submission.assignment.title,
      assignmentDescription: submission.assignment.description,
      maxScore,
      studentAnswer: answer,
    });

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: input }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });
      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty AI response');
      const result = JSON.parse(content);
      if (typeof result.grade !== 'number' || !Number.isFinite(result.grade) ||
          result.grade < 0 || result.grade > maxScore || typeof result.feedback_ar !== 'string' ||
          !Array.isArray(result.strengths) || !result.strengths.every((value: unknown) => typeof value === 'string') ||
          !Array.isArray(result.weaknesses) || !result.weaknesses.every((value: unknown) => typeof value === 'string')) {
        throw new Error('Invalid AI grading response');
      }
      const feedback = [
        result.feedback_ar.trim(),
        result.strengths.length ? `نقاط القوة: ${result.strengths.join('، ')}` : '',
        result.weaknesses.length ? `نقاط للتحسين: ${result.weaknesses.join('، ')}` : '',
      ].filter(Boolean).join('\n');
      return { score: Math.round(result.grade * 100) / 100, feedback, maxScore };
    } catch (error) {
      this.logger.error('AI grading suggestion failed', error instanceof Error ? error.message : String(error));
      throw new ServiceUnavailableException('تعذر إنشاء اقتراح تصحيح الآن. لم يتم حفظ أي درجة.');
    }
  }
}

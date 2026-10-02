import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../core/database/prisma.service';

export interface ParentAdviceResult {
  summary: string;
  positives: string[];
  concerns: string[];
  actionableAdvice: string[];
  overallStatus: 'excellent' | 'good' | 'needsAttention' | 'urgent' | 'insufficientData';
}

export interface LearningRiskResult {
  riskLevel: 'low' | 'medium' | 'high' | 'unknown';
  riskScore: number | null;
  indicators: {
    attendance: { score: number | null; detail: string };
    gradesTrend: { score: number | null; detail: string };
    assignmentCompletion: { score: number | null; detail: string };
  };
  recommendation: string;
}

@Injectable()
export class AiParentService {
  private openai: OpenAI | null = null;
  private readonly logger = new Logger(AiParentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private configService: ConfigService
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey && apiKey !== 'sk_placeholder') {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('AiParentService: OpenAI initialized');
    }
  }

  /**
   * Generate AI-powered advice for a parent about their child
   */
  async generateParentAdvice(
    studentId: string,
    parentQuestion?: string,
  ): Promise<ParentAdviceResult> {
    // Fetch student data
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        studentGrades: {
          include: { subject: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        attendance: {
          take: 30,
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!student || student.role !== 'STUDENT') throw new NotFoundException('Student not found');

    const presentCount = (student.attendance || []).filter((a: any) => a.status === 'PRESENT').length;
    const absentCount = (student.attendance || []).filter((a: any) => a.status === 'ABSENT').length;
    const attendanceRate = (student.attendance || []).length > 0
      ? Math.round((presentCount / (student.attendance || []).length) * 100)
      : null;

    const gradeSummary = (student.studentGrades || []).map((g: any) => ({
      subject: g.subject?.name || 'مادة غير محددة',
      score: g.score,
      max: g.maxScore || 100,
      pct: Math.round((g.score / (g.maxScore || 100)) * 100),
    }));

    const submissionsAwaitingGrade = await this.prisma.submission.count({
      where: { studentId, grade: null },
    });

    if (!gradeSummary.length && !student.attendance.length) {
      return {
        summary: `لا توجد درجات أو سجلات حضور كافية لإعداد تحليل.${submissionsAwaitingGrade ? ` توجد ${submissionsAwaitingGrade} تسليمات بانتظار رصد الدرجة.` : ''}`,
        positives: [],
        concerns: [],
        actionableAdvice: [],
        overallStatus: 'insufficientData',
      };
    }

    if (!this.openai) {
      throw new ServiceUnavailableException('خدمة المستشار الذكي غير متاحة؛ لم يتم إعداد مزود الذكاء الاصطناعي.');
    }

    const systemPrompt = `أنت مستشار تعليمي خبير متخصص في التواصل مع أولياء الأمور بالعربية الفصحى.
    مهمتك: تحليل أداء الطالب وتقديم تقرير واضح ومبسط لولي الأمر.
    
    بيانات الأداء المدرسي:
    - نسبة الحضور: ${attendanceRate === null ? 'لا توجد سجلات حضور' : `${attendanceRate}% (حضر ${presentCount} يوم، غاب ${absentCount} يوم)`}
    - تسليمات تنتظر رصد الدرجة: ${submissionsAwaitingGrade}
    - آخر الدرجات: ${gradeSummary.map(g => `${g.subject}: ${g.score}/${g.max} (${g.pct}%)`).join('، ')}
    
    ${parentQuestion ? `سؤال ولي الأمر: "${parentQuestion}"` : ''}
    
    لا تخترع درجات أو حضورًا أو اهتمامًا بمواد غير موجودة في البيانات. اذكر بوضوح عندما تكون البيانات غير متاحة.
    أجب بـ JSON فقط بهذا الشكل الدقيق:
    {
      "summary": "فقرة قصيرة تلخص الوضع العام بأسلوب دافئ ومطمئن",
      "positives": ["نقطة إيجابية 1", "نقطة إيجابية 2"],
      "concerns": ["نقطة تحتاج اهتمام 1 (إن وجدت)"],
      "actionableAdvice": ["نصيحة عملية يمكن لولي الأمر تطبيقها 1", "نصيحة 2"],
      "overallStatus": "excellent|good|needsAttention|urgent"
    }`;

    try {
      const completion = await this.openai.chat.completions.create({
        messages: [{ role: 'system', content: systemPrompt }],
        model: 'gpt-4o',
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('Empty AI response');
      const result = JSON.parse(content);
      const statuses = ['excellent', 'good', 'needsAttention', 'urgent'];
      if (typeof result.summary !== 'string' ||
          !Array.isArray(result.positives) || !result.positives.every((value: unknown) => typeof value === 'string') ||
          !Array.isArray(result.concerns) || !result.concerns.every((value: unknown) => typeof value === 'string') ||
          !Array.isArray(result.actionableAdvice) || !result.actionableAdvice.every((value: unknown) => typeof value === 'string') ||
          !statuses.includes(result.overallStatus)) throw new Error('AI response did not match the expected schema');
      return result as ParentAdviceResult;
    } catch (error) {
      this.logger.error('AiParentService: Failed to generate advice', error instanceof Error ? error.message : String(error));
      throw new ServiceUnavailableException('تعذر إنشاء نصيحة موثوقة الآن. لم يتم عرض نصيحة افتراضية.');
    }
  }

  /**
   * Detect early learning risk indicators for a student
   */
  async detectLearningRiskIndicators(studentId: string): Promise<LearningRiskResult> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        studentGrades: { include: { subject: { select: { id: true, name: true } } }, take: 30, orderBy: { createdAt: 'desc' } },
        attendance: {
          take: 30,
          orderBy: { date: 'desc' },
        },
        enrollments: { select: { classId: true } },
      },
    });

    if (!student || student.role !== 'STUDENT') throw new NotFoundException('Student not found');

    const attendanceList = (student.attendance || []) as any[];
    const absentCount = attendanceList.filter((a: any) => a.status === 'ABSENT').length;
    const lateCount = attendanceList.filter((a: any) => a.status === 'LATE').length;
    const attendanceRisk = attendanceList.length
      ? Math.min(100, Math.round(((absentCount + lateCount * 0.5) / attendanceList.length) * 100))
      : null;
    const attendanceDetail = attendanceList.length
      ? `سُجل ${absentCount} غياب و${lateCount} تأخر من ${attendanceList.length} سجل حضور.`
      : 'لا توجد سجلات حضور كافية في النظام.';

    const gradeList = (student.studentGrades || []) as any[];
    const gradesBySubject = new Map<string, number[]>();
    for (const grade of gradeList) {
      const maxScore = grade.maxScore || 100;
      if (!Number.isFinite(grade.score) || maxScore <= 0) continue;
      const values = gradesBySubject.get(grade.subject?.id || 'unknown') ?? [];
      values.push((grade.score / maxScore) * 100);
      gradesBySubject.set(grade.subject?.id || 'unknown', values);
    }
    const subjectDeclines = Array.from(gradesBySubject.values()).flatMap((values) => {
      if (values.length < 4) return [];
      const average = (entries: number[]) => entries.reduce((sum, value) => sum + value, 0) / entries.length;
      return [Math.max(0, average(values.slice(2, 4)) - average(values.slice(0, 2)))];
    });
    const gradesTrendRisk = subjectDeclines.length ? Math.min(100, Math.round(Math.max(...subjectDeclines) * 2)) : null;
    const gradesTrendDetail = subjectDeclines.length
      ? `أعلى انخفاض مرصود بين مجموعتين من الدرجات في المادة نفسها: ${Math.round(Math.max(...subjectDeclines))} نقطة مئوية.`
      : 'لا توجد أربع درجات في مادة واحدة لحساب اتجاه موثوق.';

    const classIds = student.enrollments.map(({ classId }) => classId);
    const dueAssignments = classIds.length ? await this.prisma.assignment.findMany({
      where: {
        schoolId: student.schoolId,
        dueDate: { lt: new Date() },
        OR: [
          { classId: { in: classIds } },
          { subject: { classId: { in: classIds } } },
        ],
      },
      select: { id: true, submissions: { where: { studentId }, select: { id: true } } },
    }) : [];
    const assignmentRisk = dueAssignments.length
      ? Math.round((dueAssignments.filter((assignment) => assignment.submissions.length === 0).length / dueAssignments.length) * 100)
      : null;
    const assignmentDetail = dueAssignments.length
      ? `${dueAssignments.filter((assignment) => assignment.submissions.length === 0).length} من ${dueAssignments.length} واجبًا تجاوز موعده دون تسليم مسجل.`
      : 'لا توجد واجبات متأخرة مرتبطة بفصول الطالب في البيانات المتاحة.';

    const indicators = [
      { score: attendanceRisk, weight: 0.3 },
      { score: gradesTrendRisk, weight: 0.4 },
      { score: assignmentRisk, weight: 0.3 },
    ].filter((indicator): indicator is { score: number; weight: number } => indicator.score !== null);
    const riskScore = indicators.length
      ? Math.round(indicators.reduce((sum, indicator) => sum + indicator.score * indicator.weight, 0) / indicators.reduce((sum, indicator) => sum + indicator.weight, 0))
      : null;
    const riskLevel: LearningRiskResult['riskLevel'] = riskScore === null
      ? 'unknown'
      : riskScore > 60 ? 'high' : riskScore > 30 ? 'medium' : 'low';
    const recommendation = riskLevel === 'unknown'
      ? 'لا توجد سجلات كافية لتقدير مستوى المخاطر.'
      : riskLevel === 'high'
        ? 'تُظهر البيانات المتاحة مؤشرات تحتاج مراجعة مباشرة مع المدرسة.'
        : riskLevel === 'medium'
          ? 'راجع مؤشرات الغياب والدرجات والواجبات مع المدرسة.'
          : 'لا تظهر المؤشرات المتاحة مستوى مخاطر مرتفعًا.';

    return {
      riskLevel,
      riskScore,
      indicators: {
        attendance: { score: attendanceRisk, detail: attendanceDetail },
        gradesTrend: { score: gradesTrendRisk, detail: gradesTrendDetail },
        assignmentCompletion: { score: assignmentRisk, detail: assignmentDetail },
      },
      recommendation,
    };
  }

}

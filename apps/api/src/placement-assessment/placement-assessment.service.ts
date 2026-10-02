import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { StudentAnalyticsService } from '../analytics/student-analytics.service';
import { getPlacementAssessment, PlacementGradeKey, PlacementQuestion } from './placement-assessment.data';

const LEADERSHIP_ROLES = ['ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'COUNSELOR', 'SUPERVISOR'];

@Injectable()
export class PlacementAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentAnalytics: StudentAnalyticsService,
  ) {}

  async getCurrentAssessment(studentId: string) {
    const student = await this.getStudent(studentId);
    const assessmentKey = this.assessmentKeyForGrade(student.studentProfile.gradeLevel);
    const assessment = this.objectiveAssessment(assessmentKey);
    const attempt = await this.prisma.placementAssessmentAttempt.findUnique({
      where: { studentId_assessmentKey: { studentId, assessmentKey } },
      select: { id: true, score: true, correctCount: true, questionCount: true, completedAt: true },
    });

    const isGradeOneFoundation = student.studentProfile.gradeLevel === 1;
    return {
      gradeLevel: student.studentProfile.gradeLevel,
      foundationalForGradeOne: isGradeOneFoundation,
      assessment: {
        key: assessment.key,
        title: isGradeOneFoundation ? 'الاختبار التأسيسي للصف الأول' : assessment.title,
        subtitle: isGradeOneFoundation
          ? 'تقييم مبدئي للمهارات الأساسية. اختبار الصف الأول المخصص يتطلب مراجعة يدوية من المدرسة.'
          : assessment.subtitle,
        subjects: assessment.subjects,
        questions: assessment.questions.map((question) => this.publicQuestion(question)),
      },
      attempt,
    };
  }

  async submit(studentId: string, rawAnswers: Record<string, unknown>) {
    const student = await this.getStudent(studentId);
    const assessmentKey = this.assessmentKeyForGrade(student.studentProfile.gradeLevel);
    const assessment = this.objectiveAssessment(assessmentKey);
    const priorAttempt = await this.prisma.placementAssessmentAttempt.findUnique({
      where: { studentId_assessmentKey: { studentId, assessmentKey } },
    });
    if (priorAttempt) throw new ConflictException('تم حفظ نتيجة هذا الاختبار بالفعل');
    if (!rawAnswers || typeof rawAnswers !== 'object' || Array.isArray(rawAnswers)) {
      throw new BadRequestException('إجابات الاختبار غير صالحة');
    }

    const questions = assessment.questions;
    const answerIds = Object.keys(rawAnswers);
    if (answerIds.length !== questions.length || questions.some(({ id }) => !Object.prototype.hasOwnProperty.call(rawAnswers, id))) {
      throw new BadRequestException('أكمل جميع أسئلة الاختبار قبل الإرسال');
    }

    const answers: Record<string, string> = {};
    let correctCount = 0;
    for (const question of questions) {
      const answer = rawAnswers[question.id];
      if (typeof answer !== 'string' || answer.length > 300 || !question.options.includes(answer)) {
        throw new BadRequestException('تحتوي الإجابات على اختيار غير صالح');
      }
      answers[question.id] = answer;
      if (answer === question.correct) correctCount += 1;
    }

    const questionCount = questions.length;
    const score = Math.round((correctCount / questionCount) * 10000) / 100;
    try {
      return await this.prisma.placementAssessmentAttempt.create({
        data: {
          schoolId: student.schoolId,
          studentId,
          gradeLevel: student.studentProfile.gradeLevel,
          assessmentKey,
          answers: answers as Prisma.InputJsonValue,
          questionSnapshot: questions.map((question) => ({
            id: question.id,
            category: question.categoryLabel,
            prompt: question.prompt,
            correctAnswer: question.correct,
            explanation: question.explanation,
          })) as Prisma.InputJsonValue,
          correctCount,
          questionCount,
          score,
        },
        select: { id: true, score: true, correctCount: true, questionCount: true, completedAt: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('تم حفظ نتيجة هذا الاختبار بالفعل');
      }
      throw error;
    }
  }

  async listReports(actorId: string, actorRole: string, page: number, limit: number) {
    const actor = await this.prisma.user.findUnique({ where: { id: actorId }, select: { id: true, role: true, schoolId: true } });
    if (!actor?.schoolId) throw new ForbiddenException('الحساب غير مرتبط بمدرسة');
    const safePage = Math.max(1, Math.floor(page));
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    if (!['TEACHER', 'PARENT'].includes(actorRole) && !LEADERSHIP_ROLES.includes(actorRole)) {
      throw new ForbiddenException('لا تملك صلاحية عرض تقارير الاختبارات');
    }
    const studentScope: Prisma.UserWhereInput = { schoolId: actor.schoolId };
    if (actorRole === 'TEACHER') {
      studentScope.enrollments = {
        some: {
          class: {
            OR: [
              { teacherId: actorId },
              { classSubjects: { some: { teacherId: actorId } } },
            ],
          },
        },
      };
    } else if (actorRole === 'PARENT') {
      studentScope.parents = { some: { parentId: actorId } };
    }
    const where = { schoolId: actor.schoolId, student: studentScope };
    const [items, total] = await Promise.all([
      this.prisma.placementAssessmentAttempt.findMany({
        where,
        orderBy: { completedAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: {
          student: { select: { id: true, name: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.placementAssessmentAttempt.count({ where }),
    ]);
    return {
      items: items.map(({ answers: _answers, ...item }) => ({ ...item, studentName: this.studentName(item.student) })),
      page: safePage,
      limit: safeLimit,
      total,
    };
  }

  async getReport(actorId: string, actorRole: string, attemptId: string) {
    const attempt = await this.prisma.placementAssessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        student: {
          select: {
            id: true,
            role: true,
            schoolId: true,
            name: true,
            firstName: true,
            lastName: true,
            studentProfile: { select: { gradeLevel: true } },
          },
        },
      },
    });
    if (!attempt) throw new NotFoundException('تقرير الاختبار غير موجود');
    await this.studentAnalytics.assertCanAccessStudent(actorId, actorRole, attempt.studentId);

    const answers = attempt.answers as Record<string, string>;
    const questions = attempt.questionSnapshot as Array<{
      id: string;
      category: string;
      prompt: string;
      correctAnswer: string;
      explanation: string;
    }>;
    return {
      id: attempt.id,
      studentId: attempt.studentId,
      studentName: this.studentName(attempt.student),
      gradeLevel: attempt.gradeLevel,
      assessmentKey: attempt.assessmentKey,
      score: attempt.score,
      correctCount: attempt.correctCount,
      questionCount: attempt.questionCount,
      completedAt: attempt.completedAt,
      answers: questions.map((question) => ({
        id: question.id,
        category: question.category,
        prompt: question.prompt,
        selectedAnswer: answers[question.id] ?? null,
        correctAnswer: question.correctAnswer,
        isCorrect: answers[question.id] === question.correctAnswer,
        explanation: question.explanation,
      })),
    };
  }

  private async getStudent(studentId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true, schoolId: true, studentProfile: { select: { gradeLevel: true } } },
    });
    if (!student || student.role !== 'STUDENT') throw new NotFoundException('ملف الطالب غير موجود');
    if (!student.schoolId) throw new ForbiddenException('حساب الطالب غير مرتبط بمدرسة');
    if (!student.studentProfile) throw new BadRequestException('أكمل بيانات الصف الدراسي قبل بدء الاختبار');
    return { ...student, schoolId: student.schoolId as string, studentProfile: student.studentProfile };
  }

  private assessmentKeyForGrade(gradeLevel: number): PlacementGradeKey {
    if (gradeLevel === 0) return 'kg';
    if (gradeLevel === 1) return 'general';
    if (gradeLevel >= 2 && gradeLevel <= 6) return `g${gradeLevel}` as PlacementGradeKey;
    if (gradeLevel >= 7 && gradeLevel <= 9) return 'm1';
    if (gradeLevel >= 10 && gradeLevel <= 12) return 's1';
    throw new BadRequestException('الصف الدراسي لا يحتوي على اختبار تشخيصي منشور');
  }

  private objectiveAssessment(key: PlacementGradeKey) {
    const assessment = getPlacementAssessment(key);
    const questions = assessment.questions.filter((question) =>
      (!question.responseType || question.responseType === 'choice') &&
      question.options.length > 1 && Boolean(question.correct) &&
      question.countsForScore !== false,
    );
    if (!questions.length) throw new BadRequestException('لا توجد أسئلة اختيار آلي معتمدة لهذا التقييم');
    return { ...assessment, questions };
  }

  private publicQuestion(question: PlacementQuestion) {
    return {
      id: question.id,
      category: question.category,
      categoryLabel: question.categoryLabel,
      prompt: question.prompt,
      visual: question.visual,
      options: question.options,
    };
  }

  private studentName(student: { name: string | null; firstName: string | null; lastName: string | null }) {
    return student.name || [student.firstName, student.lastName].filter(Boolean).join(' ') || 'طالب بدون اسم';
  }
}

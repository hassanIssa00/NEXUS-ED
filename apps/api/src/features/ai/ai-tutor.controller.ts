import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Param, Post, Body, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '../../auth/role.enum';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { StudentAnalyticsService } from '../../analytics/student-analytics.service';
import { AiTutorService } from './ai-tutor.service';
import { AiExamService } from './ai-exam.service';
import { AiAnalyticsService } from './ai-analytics.service';
import { AiParentService } from './ai-parent.service';
import { AiPersonalTutorService } from './ai-personal-tutor.service';
import { AiContentService } from './ai-content.service';
import { AiGradingService } from './ai-grading.service';
import { PrismaService } from '../../core/database/prisma.service';

const SCHOOL_STAFF = [Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR];
const STUDENT_DATA_ROLES = [Role.STUDENT, Role.PARENT, ...SCHOOL_STAFF];
const AI_CHAT_ROLES = Object.values(Role);

@ApiTags('AI Tutor')
@Controller('ai')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AiTutorController {
  constructor(
    private readonly aiService: AiTutorService,
    private readonly aiExamService: AiExamService,
    private readonly aiAnalyticsService: AiAnalyticsService,
    private readonly aiParentService: AiParentService,
    private readonly aiPersonalTutorService: AiPersonalTutorService,
    private readonly aiContentService: AiContentService,
    private readonly aiGradingService: AiGradingService,
    private readonly studentAnalytics: StudentAnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('ask')
  @Roles(...AI_CHAT_ROLES)
  async ask(@Body() body: any, @Request() req: any) {
    if (typeof body?.question !== 'string' || !body.question.trim() || body.question.length > 2000) {
      throw new BadRequestException('يجب إدخال سؤال لا يتجاوز 2000 حرف');
    }
    if (body.history !== undefined && (!Array.isArray(body.history) || body.history.length > 12 ||
        body.history.some((item: any) => !item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string' || item.content.length > 2000))) {
      throw new BadRequestException('سجل المحادثة غير صالح أو أطول من المسموح');
    }
    if (body.subject !== undefined && (typeof body.subject !== 'string' || body.subject.length > 100)) {
      throw new BadRequestException('اسم المادة غير صالح');
    }
    const isStudent = req.user.role === Role.STUDENT;
    const answer = await this.aiService.askTutor(body.question.trim(), {
      subject: body.subject,
      role: req.user.role,
      grade: isStudent ? req.user?.grade : undefined,
      studentId: isStudent ? this.userId(req) : undefined,
    }, body.history || []);
    return { success: true, data: { answer } };
  }

  @Post('generate-exam')
  @Roles(Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL)
  async generateExam(@Body() body: any) {
    if (typeof body?.topic !== 'string' || !body.topic.trim() || body.topic.length > 200 ||
        typeof body?.subject !== 'string' || !body.subject.trim() || body.subject.length > 120) {
      throw new BadRequestException('المادة والموضوع مطلوبان وبحد أقصى 200 حرف للموضوع');
    }
    const questionCount = body.questionCount === undefined ? 5 : Number(body.questionCount);
    const questionType = body.questionType || 'mixed';
    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 30 ||
        !['multiple_choice', 'true_false', 'mixed'].includes(questionType)) {
      throw new BadRequestException('عدد الأسئلة أو نوعها غير صالح');
    }
    if (body.gradeLevel !== undefined && (typeof body.gradeLevel !== 'string' || body.gradeLevel.length > 80)) {
      throw new BadRequestException('الصف الدراسي غير صالح');
    }
    const difficulty = body.difficulty ?? 'MEDIUM';
    if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
      throw new BadRequestException('مستوى الصعوبة غير صالح');
    }
    const questions = await this.aiExamService.generateExam({
      topic: body.topic.trim(),
      subject: body.subject.trim(),
      gradeLevel: body.gradeLevel || 'غير محدد',
      questionCount,
      questionType,
      difficulty,
    });
    return { success: true, data: { questions } };
  }

  @Post('suggest-questions')
  @Roles(Role.TEACHER)
  async suggestQuestions(@Body() body: any, @Request() req: any) {
    if (typeof body?.subjectId !== 'string' || !body.subjectId.trim() ||
        typeof body?.topic !== 'string' || !body.topic.trim() || body.topic.length > 200) {
      throw new BadRequestException('المادة والموضوع مطلوبان');
    }
    const questionCount = body.count === undefined ? 3 : Number(body.count);
    const difficulty = body.difficulty ?? 'MEDIUM';
    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 30 ||
        !['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
      throw new BadRequestException('عدد الأسئلة أو مستوى الصعوبة غير صالح');
    }

    const teacherId = this.userId(req);
    const teacher = await this.prisma.user.findUnique({
      where: { id: teacherId },
      select: { schoolId: true, isActive: true },
    });
    if (!teacher?.isActive || !teacher.schoolId) {
      throw new ForbiddenException('حساب المعلم غير نشط أو غير مرتبط بمدرسة');
    }
    const subject = await this.prisma.subject.findFirst({
      where: {
        id: body.subjectId,
        schoolId: teacher.schoolId,
        OR: [{ teacherId }, { classSubjects: { some: { teacherId } } }],
      },
      select: { name: true, class: { select: { name: true } } },
    });
    if (!subject) throw new NotFoundException('المادة غير مرتبطة بحسابك');

    const questions = await this.aiExamService.generateExam({
      topic: body.topic.trim(),
      subject: subject.name,
      gradeLevel: subject.class.name,
      questionCount,
      questionType: 'mixed',
      difficulty,
    });
    return { success: true, data: { questions } };
  }

  @Post('lesson-summary/:lessonId')
  @Roles(Role.TEACHER)
  async summarizeLesson(@Param('lessonId') lessonId: string, @Request() req: any) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, authorId: this.userId(req) },
      select: { id: true, title: true, content: true },
    });
    if (!lesson) throw new NotFoundException('الدرس غير موجود ضمن دروسك');
    if (!lesson.content?.trim()) throw new BadRequestException('الدرس لا يحتوي على نص قابل للتحليل');
    if (lesson.content.length > 80000) throw new BadRequestException('محتوى الدرس أطول من الحد المدعوم');

    const generated = await this.aiContentService.processContent(lesson.content);
    const practiceQuestions = generated.quiz
      .filter((question) => Number.isInteger(question.correctAnswer) &&
        question.correctAnswer >= 0 && question.correctAnswer < question.options.length)
      .map((question) => ({
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      }));
    return {
      success: true,
      data: {
        title: lesson.title,
        keyPoints: generated.summary ? [generated.summary] : [],
        concepts: generated.keyConcepts,
        practiceQuestions,
      },
    };
  }

  @Get('student-insights/:id')
  @Roles(...STUDENT_DATA_ROLES)
  async getStudentInsights(@Param('id') id: string, @Request() req: any) {
    const studentId = id === 'me' ? this.userId(req) : id;
    await this.studentAnalytics.assertCanAccessStudent(this.userId(req), req.user.role, studentId);
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        studentGrades: { include: { subject: true }, take: 30, orderBy: { createdAt: 'desc' } },
        attendance: { take: 30, orderBy: { date: 'desc' } },
      },
    });
    if (!student) throw new BadRequestException('ملف الطالب غير متاح');

    const ungradedSubmissions = await this.prisma.submission.count({ where: { studentId, grade: null } });
    const totalAttendance = student.attendance.length;
    const presentAttendance = student.attendance.filter((record) => record.status === 'PRESENT').length;
    const attendanceRate = totalAttendance ? Math.round((presentAttendance / totalAttendance) * 100) : null;
    const grades = student.studentGrades.map((grade) => ({
      subject: grade.subject?.name || 'مادة غير محددة',
      score: grade.score,
      maxScore: grade.maxScore || 100,
    }));
    const insights = await this.aiAnalyticsService.generateStudentInsights({
      grades,
      ungradedSubmissions,
      attendanceRate,
    });
    return { success: true, data: insights };
  }

  @Post('parent-advice')
  @Roles(Role.PARENT, Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR)
  async getParentAdvice(@Body() body: any, @Request() req: any) {
    if (typeof body?.studentId !== 'string' || !body.studentId) throw new BadRequestException('معرف الطالب مطلوب');
    if (body.question !== undefined && (typeof body.question !== 'string' || body.question.length > 2000)) {
      throw new BadRequestException('السؤال غير صالح أو أطول من المسموح');
    }
    await this.studentAnalytics.assertCanAccessStudent(this.userId(req), req.user.role, body.studentId);
    const advice = await this.aiParentService.generateParentAdvice(body.studentId, body.question?.trim());
    return { success: true, data: advice };
  }

  @Get('learning-risk/:studentId')
  @Roles(...STUDENT_DATA_ROLES)
  async getLearningRisk(@Param('studentId') studentId: string, @Request() req: any) {
    await this.studentAnalytics.assertCanAccessStudent(this.userId(req), req.user.role, studentId);
    return { success: true, data: await this.aiParentService.detectLearningRiskIndicators(studentId) };
  }

  @Get('weakness-map/:id')
  @Roles(...STUDENT_DATA_ROLES)
  async getWeaknessMap(@Param('id') id: string, @Request() req: any) {
    const studentId = id === 'me' ? this.userId(req) : id;
    await this.studentAnalytics.assertCanAccessStudent(this.userId(req), req.user.role, studentId);
    return { success: true, data: await this.aiPersonalTutorService.buildWeaknessMap(studentId) };
  }

  @Post('grade/:submissionId')
  @Roles(Role.TEACHER, Role.ADMIN)
  async suggestGrade(@Param('submissionId') submissionId: string, @Request() req: any) {
    return { success: true, data: await this.aiGradingService.suggestGrade(submissionId, this.userId(req), req.user.role) };
  }

  @Post('process-document')
  @Roles(Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL)
  async processDocument(@Body() body: any) {
    if (typeof body?.text !== 'string' || !body.text.trim() || body.text.length > 80000) {
      throw new BadRequestException('النص مطلوب ويجب ألا يتجاوز 80000 حرف');
    }
    return { success: true, data: await this.aiContentService.processContent(body.text) };
  }

  @Post('generate-image')
  @Roles(Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL)
  async generateImage(@Body() body: any) {
    if (typeof body?.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 500) {
      throw new BadRequestException('وصف الصورة مطلوب وبحد أقصى 500 حرف');
    }
    return { success: true, data: { url: await this.aiContentService.generateImage(body.prompt.trim()) } };
  }

  private userId(request: any): string {
    return request.user.userId || request.user.sub || request.user.id;
  }
}

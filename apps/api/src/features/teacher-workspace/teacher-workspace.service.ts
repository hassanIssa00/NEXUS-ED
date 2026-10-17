import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { UploadService } from '../../upload/upload.service';

export interface WorkspaceActor {
  userId: string;
  schoolId: string;
  role: string;
}

type QuizQuestionInput = {
  prompt: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  points: number;
  options?: Array<{ text: string; correct?: boolean }>;
  correctAnswer?: string;
};

@Injectable()
export class TeacherWorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadService,
  ) {}

  async getTeacherClasses(actor: WorkspaceActor) {
    const classes = await this.prisma.class.findMany({
      where: {
        schoolId: actor.schoolId,
        OR: [
          { teacherId: actor.userId },
          { classSubjects: { some: { teacherId: actor.userId } } },
        ],
      },
      orderBy: { name: 'asc' },
      include: {
        subjects: { select: { id: true, name: true, teacherId: true } },
        _count: { select: { students: true } },
      },
    });
    return classes.map((item) => ({
      ...item,
      subjects: item.subjects.filter((subject) => subject.teacherId === actor.userId || item.teacherId === actor.userId),
    }));
  }

  async getTeacherClassStudents(actor: WorkspaceActor, classId: string) {
    await this.assertTeacherClass(actor, classId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classId, class: { schoolId: actor.schoolId } },
      orderBy: { student: { name: 'asc' } },
      include: { student: { select: { id: true, name: true, email: true, avatar: true } } },
    });
    return enrollments.map((enrollment) => enrollment.student);
  }

  async listTeacherQuizzes(actor: WorkspaceActor) {
    return this.prisma.teacherQuiz.findMany({
      where: { schoolId: actor.schoolId, teacherId: actor.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        _count: { select: { attempts: true } },
      },
    });
  }

  async createQuiz(actor: WorkspaceActor, input: any) {
    const title = this.requiredText(input.title, 'عنوان الاختبار', 2, 160);
    const classId = this.requiredText(input.classId, 'الفصل', 1, 100);
    const subjectId = this.requiredText(input.subjectId, 'المادة', 1, 100);
    await this.assertTeacherClass(actor, classId);
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, classId, schoolId: actor.schoolId },
      select: { id: true },
    });
    if (!subject) throw new BadRequestException('المادة لا تتبع الفصل المحدد');
    const questions = this.validateQuestions(input.questions);
    const dueAt = input.dueAt ? new Date(input.dueAt) : null;
    if (dueAt && Number.isNaN(dueAt.getTime())) throw new BadRequestException('موعد الاختبار غير صالح');
    return this.prisma.teacherQuiz.create({
      data: {
        schoolId: actor.schoolId,
        classId,
        subjectId,
        teacherId: actor.userId,
        title,
        instructions: this.optionalText(input.instructions, 2000),
        questions: questions as unknown as Prisma.InputJsonValue,
        dueAt,
        published: Boolean(input.published),
        showResults: Boolean(input.showResults),
      },
      include: { class: { select: { name: true } }, subject: { select: { name: true } } },
    });
  }

  async setQuizPublished(actor: WorkspaceActor, quizId: string, published: boolean) {
    const quiz = await this.findTeacherQuiz(actor, quizId);
    if (published && (!Array.isArray(quiz.questions) || quiz.questions.length === 0)) {
      throw new BadRequestException('أضف سؤالاً واحداً على الأقل قبل نشر الاختبار');
    }
    return this.prisma.teacherQuiz.update({ where: { id: quizId }, data: { published } });
  }

  async deleteQuiz(actor: WorkspaceActor, quizId: string) {
    await this.findTeacherQuiz(actor, quizId);
    await this.prisma.teacherQuiz.delete({ where: { id: quizId } });
    return { success: true };
  }

  async listStudentQuizzes(actor: WorkspaceActor, studentId = actor.userId, parentView = false) {
    if (parentView) await this.assertParentOf(actor, studentId);
    else if (studentId !== actor.userId) throw new ForbiddenException();
    const classIds = await this.studentClassIds(studentId, actor.schoolId);
    const quizzes = await this.prisma.teacherQuiz.findMany({
      where: { schoolId: actor.schoolId, published: true, classId: { in: classIds } },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
        attempts: { where: { studentId }, select: { id: true, score: true, maxScore: true, feedback: true, submittedAt: true } },
      },
    });
    return quizzes.map(({ questions, ...quiz }) => ({
      ...quiz,
      questionCount: Array.isArray(questions) ? questions.length : 0,
      attempts: quiz.showResults ? quiz.attempts : quiz.attempts.map((attempt) => ({ ...attempt, score: null, feedback: null })),
    }));
  }

  async getStudentQuiz(actor: WorkspaceActor, quizId: string) {
    const quiz = await this.prisma.teacherQuiz.findFirst({ where: { id: quizId, schoolId: actor.schoolId, published: true } });
    if (!quiz) throw new NotFoundException('الاختبار غير متاح');
    const enrollment = await this.prisma.enrollment.findFirst({ where: { studentId: actor.userId, classId: quiz.classId }, select: { id: true } });
    if (!enrollment) throw new ForbiddenException('هذا الاختبار ليس ضمن فصولك');
    const questions = this.validateQuestions(quiz.questions).map((question) => ({
      id: question.id,
      prompt: question.prompt,
      type: question.type,
      points: question.points,
      options: question.options?.map((option) => option.text),
    }));
    const attempt = await this.prisma.quizAttempt.findUnique({ where: { quizId_studentId: { quizId, studentId: actor.userId } } });
    return {
      id: quiz.id,
      title: quiz.title,
      instructions: quiz.instructions,
      dueAt: quiz.dueAt,
      showResults: quiz.showResults,
      questions,
      attempt: attempt ? {
        id: attempt.id,
        submittedAt: attempt.submittedAt,
        score: quiz.showResults ? attempt.score : null,
        maxScore: quiz.showResults ? attempt.maxScore : null,
        feedback: quiz.showResults ? attempt.feedback : null,
      } : null,
    };
  }

  async submitQuiz(actor: WorkspaceActor, quizId: string, input: any) {
    const quiz = await this.prisma.teacherQuiz.findFirst({
      where: { id: quizId, schoolId: actor.schoolId, published: true },
    });
    if (!quiz) throw new NotFoundException('الاختبار غير متاح');
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId: actor.userId, classId: quiz.classId }, select: { id: true },
    });
    if (!enrollment) throw new ForbiddenException('هذا الاختبار ليس ضمن فصولك');
    if (quiz.dueAt && quiz.dueAt < new Date()) throw new ConflictException('انتهى موعد الاختبار');
    const existing = await this.prisma.quizAttempt.findUnique({
      where: { quizId_studentId: { quizId, studentId: actor.userId } }, select: { id: true },
    });
    if (existing) throw new ConflictException('تم تسليم هذا الاختبار من قبل');

    const questions = this.validateQuestions(quiz.questions);
    const answers = input.answers;
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) throw new BadRequestException('الإجابات غير صالحة');
    const maxScore = questions.reduce((sum, question) => sum + question.points, 0);
    let score = 0;
    let needsManualGrade = false;
    const submittedAnswers: Record<string, string> = {};
    for (const question of questions) {
      const raw = answers[question.id];
      if (raw === undefined || raw === null) continue;
      const answer = String(raw).trim().slice(0, 5000);
      submittedAnswers[question.id] = answer;
      if (question.type === 'essay') {
        needsManualGrade = true;
      } else if (this.isCorrect(question, answer)) {
        score += question.points;
      }
    }
    return this.prisma.quizAttempt.create({
      data: {
        quizId,
        studentId: actor.userId,
        answers: submittedAnswers as Prisma.InputJsonValue,
        score: needsManualGrade ? null : score,
        maxScore,
      },
      select: { id: true, quizId: true, score: true, maxScore: true, submittedAt: true },
    });
  }

  async listQuizAttempts(actor: WorkspaceActor, quizId: string) {
    await this.findTeacherQuiz(actor, quizId);
    return this.prisma.quizAttempt.findMany({
      where: { quizId },
      orderBy: { submittedAt: 'desc' },
      include: { student: { select: { id: true, name: true, email: true, avatar: true } } },
    });
  }

  async gradeQuizAttempt(actor: WorkspaceActor, quizId: string, attemptId: string, input: any) {
    await this.findTeacherQuiz(actor, quizId);
    const attempt = await this.prisma.quizAttempt.findFirst({ where: { id: attemptId, quizId } });
    if (!attempt) throw new NotFoundException('التسليم غير موجود');
    const score = Number(input.score);
    if (!Number.isFinite(score) || score < 0 || score > attempt.maxScore) throw new BadRequestException('الدرجة خارج النطاق');
    return this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: { score, feedback: this.optionalText(input.feedback, 2000) },
    });
  }

  async listEvents(actor: WorkspaceActor, studentId?: string, parentView = false) {
    const classIds = parentView
      ? await this.parentClassIds(actor, studentId)
      : studentId
        ? await this.studentClassIds(studentId, actor.schoolId)
        : (await this.getTeacherClasses(actor)).map((item) => item.id);
    const events = await this.prisma.classEvent.findMany({
      where: { schoolId: actor.schoolId, classId: { in: classIds }, ...(parentView || studentId ? { published: true } : { teacherId: actor.userId }) },
      orderBy: [{ startsAt: 'desc' }, { createdAt: 'desc' }],
      include: { class: { select: { name: true } }, teacher: { select: { name: true } } },
      take: 100,
    });
    return Promise.all(events.map(async (event) => ({
      ...event,
      photos: await this.uploads.getSignedUrlsForReferences(event.photoReferences),
    })));
  }

  async createEvent(actor: WorkspaceActor, input: any) {
    const classId = this.requiredText(input.classId, 'الفصل', 1, 100);
    await this.assertTeacherClass(actor, classId);
    const references = Array.isArray(input.photoReferences) ? input.photoReferences.slice(0, 10).map(String) : [];
    const ownedReferences = await Promise.all(references.map((reference) =>
      this.uploads.getOwnedFileReference(reference, actor.userId, actor.schoolId, true),
    ));
    const startsAt = input.startsAt ? new Date(input.startsAt) : null;
    if (startsAt && Number.isNaN(startsAt.getTime())) throw new BadRequestException('تاريخ الفعالية غير صالح');
    return this.prisma.classEvent.create({
      data: {
        schoolId: actor.schoolId,
        classId,
        teacherId: actor.userId,
        title: this.requiredText(input.title, 'عنوان الفعالية', 2, 160),
        description: this.optionalText(input.description, 3000),
        eventType: ['CLASS_EVENT', 'PHOTO_ALBUM', 'ANNOUNCEMENT'].includes(input.eventType) ? input.eventType : 'CLASS_EVENT',
        startsAt,
        photoReferences: ownedReferences,
        published: true,
      },
    });
  }

  async deleteEvent(actor: WorkspaceActor, eventId: string) {
    const result = await this.prisma.classEvent.deleteMany({ where: { id: eventId, schoolId: actor.schoolId, teacherId: actor.userId } });
    if (!result.count) throw new NotFoundException('الفعالية غير موجودة');
    return { success: true };
  }

  async listTeacherMeetings(actor: WorkspaceActor) {
    return this.prisma.parentMeeting.findMany({
      where: { schoolId: actor.schoolId, teacherId: actor.userId },
      orderBy: { startsAt: 'asc' },
      include: {
        class: { select: { name: true } },
        bookings: { include: { parent: { select: { name: true, phone: true } }, student: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async createMeeting(actor: WorkspaceActor, input: any) {
    const classId = this.requiredText(input.classId, 'الفصل', 1, 100);
    await this.assertTeacherClass(actor, classId);
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException('تحقق من موعد بداية اللقاء ونهايته');
    }
    const mode = input.mode === 'ONLINE' ? 'ONLINE' : 'IN_PERSON';
    const meetingUrl = this.optionalText(input.meetingUrl, 500);
    if (mode === 'ONLINE' && (!meetingUrl || !/^https:\/\//i.test(meetingUrl))) throw new BadRequestException('أدخل رابط لقاء آمن يبدأ بـ HTTPS');
    return this.prisma.parentMeeting.create({
      data: {
        schoolId: actor.schoolId,
        classId,
        teacherId: actor.userId,
        title: this.requiredText(input.title, 'عنوان اللقاء', 2, 160),
        description: this.optionalText(input.description, 2000),
        startsAt,
        endsAt,
        mode,
        location: this.optionalText(input.location, 300),
        meetingUrl: mode === 'ONLINE' ? meetingUrl : null,
        maxBookings: Math.max(1, Math.min(30, Number(input.maxBookings) || 1)),
      },
    });
  }

  async setMeetingOpen(actor: WorkspaceActor, meetingId: string, isOpen: boolean) {
    const result = await this.prisma.parentMeeting.updateMany({
      where: { id: meetingId, schoolId: actor.schoolId, teacherId: actor.userId },
      data: { isOpen },
    });
    if (!result.count) throw new NotFoundException('موعد اللقاء غير موجود');
    return { success: true, isOpen };
  }

  async listParentMeetings(actor: WorkspaceActor, studentId: string) {
    await this.assertParentOf(actor, studentId);
    const classIds = await this.studentClassIds(studentId, actor.schoolId);
    return this.prisma.parentMeeting.findMany({
      where: { schoolId: actor.schoolId, classId: { in: classIds }, isOpen: true, endsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
      include: {
        class: { select: { name: true } },
        teacher: { select: { name: true } },
        bookings: { where: { parentId: actor.userId, studentId }, select: { id: true, status: true } },
        _count: { select: { bookings: { where: { status: 'BOOKED' } } } },
      },
    });
  }

  async bookMeeting(actor: WorkspaceActor, meetingId: string, input: any) {
    const studentId = this.requiredText(input.studentId, 'الطالب', 1, 100);
    await this.assertParentOf(actor, studentId);
    return this.prisma.$transaction(async (tx) => {
      const meeting = await tx.parentMeeting.findFirst({
        where: { id: meetingId, schoolId: actor.schoolId, isOpen: true, startsAt: { gt: new Date() } },
      });
      if (!meeting) throw new NotFoundException('موعد اللقاء غير متاح');
      const enrolled = await tx.enrollment.findFirst({ where: { studentId, classId: meeting.classId }, select: { id: true } });
      if (!enrolled) throw new ForbiddenException('اللقاء غير مرتبط بملف الطالب');
      const activeBookings = await tx.parentMeetingBooking.count({ where: { meetingId, status: 'BOOKED' } });
      if (activeBookings >= meeting.maxBookings) throw new ConflictException('اكتملت حجوزات هذا الموعد');
      return tx.parentMeetingBooking.upsert({
        where: { meetingId_parentId_studentId: { meetingId, parentId: actor.userId, studentId } },
        create: { meetingId, parentId: actor.userId, studentId, note: this.optionalText(input.note, 1000) },
        update: { status: 'BOOKED', note: this.optionalText(input.note, 1000) },
        select: { id: true, meetingId: true, status: true, createdAt: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async cancelMeetingBooking(actor: WorkspaceActor, meetingId: string, bookingId: string, studentId: string) {
    await this.assertParentOf(actor, studentId);
    const result = await this.prisma.parentMeetingBooking.updateMany({
      where: { id: bookingId, meetingId, parentId: actor.userId, studentId, status: 'BOOKED' },
      data: { status: 'CANCELLED' },
    });
    if (!result.count) throw new NotFoundException('الحجز غير موجود أو ملغي بالفعل');
    return { success: true };
  }

  async listCommunity(actor: WorkspaceActor, studentId?: string, parentView = false) {
    const classIds = parentView
      ? await this.parentClassIds(actor, studentId)
      : studentId
        ? await this.studentClassIds(studentId, actor.schoolId)
        : (await this.getTeacherClasses(actor)).map((item) => item.id);
    return this.prisma.communityPost.findMany({
      where: { schoolId: actor.schoolId, OR: [{ classId: null }, { classId: { in: classIds } }] },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        author: { select: { id: true, name: true, role: true, avatar: true } },
        class: { select: { name: true } },
        comments: { orderBy: { createdAt: 'asc' }, take: 50, include: { author: { select: { id: true, name: true, role: true, avatar: true } } } },
      },
    });
  }

  async createCommunityPost(actor: WorkspaceActor, input: any) {
    const classId = input.classId ? this.requiredText(input.classId, 'الفصل', 1, 100) : null;
    if (classId) await this.assertTeacherClass(actor, classId);
    return this.prisma.communityPost.create({
      data: {
        schoolId: actor.schoolId,
        classId,
        authorId: actor.userId,
        title: this.requiredText(input.title, 'عنوان المنشور', 2, 160),
        body: this.requiredText(input.body, 'محتوى المنشور', 2, 5000),
        attachmentReferences: [],
      },
      include: { author: { select: { id: true, name: true, role: true, avatar: true } }, comments: true },
    });
  }

  async commentOnCommunity(actor: WorkspaceActor, postId: string, body: unknown, studentId?: string, parentView = false) {
    const post = await this.prisma.communityPost.findFirst({ where: { id: postId, schoolId: actor.schoolId } });
    if (!post) throw new NotFoundException('المنشور غير موجود');
    if (parentView) {
      const allowed = post.classId === null || (await this.parentClassIds(actor, studentId)).includes(post.classId);
      if (!allowed) throw new ForbiddenException();
    } else if (studentId) {
      const allowed = post.classId === null || (await this.studentClassIds(actor.userId, actor.schoolId)).includes(post.classId);
      if (!allowed) throw new ForbiddenException();
    } else if (post.classId) {
      await this.assertTeacherClass(actor, post.classId);
    }
    return this.prisma.communityComment.create({
      data: { postId, authorId: actor.userId, body: this.requiredText(body, 'التعليق', 1, 2000) },
      include: { author: { select: { id: true, name: true, role: true, avatar: true } } },
    });
  }

  async deleteCommunityPost(actor: WorkspaceActor, postId: string) {
    const result = await this.prisma.communityPost.deleteMany({ where: { id: postId, schoolId: actor.schoolId, authorId: actor.userId } });
    if (!result.count) throw new NotFoundException('المنشور غير موجود أو لا تملك صلاحية حذفه');
    return { success: true };
  }

  async issueCertificate(actor: WorkspaceActor, input: any) {
    const studentId = this.requiredText(input.studentId, 'الطالب', 1, 100);
    const classId = this.requiredText(input.classId, 'الفصل', 1, 100);
    await this.assertTeacherClass(actor, classId);
    const enrollment = await this.prisma.enrollment.findFirst({ where: { classId, studentId, class: { schoolId: actor.schoolId } }, select: { id: true } });
    if (!enrollment) throw new BadRequestException('الطالب غير مسجل في هذا الفصل');
    return this.prisma.certificate.create({
      data: {
        schoolId: actor.schoolId,
        studentId,
        issuerId: actor.userId,
        serial: `NEX-${new Date().getFullYear()}-${randomBytes(6).toString('hex').toUpperCase()}`,
        title: this.requiredText(input.title, 'عنوان الشهادة', 2, 160),
        description: this.optionalText(input.description, 1000),
      },
      include: { student: { select: { id: true, name: true, email: true } }, issuer: { select: { name: true } } },
    });
  }

  async listCertificates(actor: WorkspaceActor, studentId = actor.userId, parentView = false) {
    if (parentView) await this.assertParentOf(actor, studentId);
    else if (actor.role === 'STUDENT' && studentId !== actor.userId) throw new ForbiddenException();
    const where = actor.role === 'TEACHER'
      ? { schoolId: actor.schoolId, issuerId: actor.userId }
      : { schoolId: actor.schoolId, studentId };
    return this.prisma.certificate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { student: { select: { id: true, name: true, email: true } }, issuer: { select: { name: true } } },
    });
  }

  async getCertificate(actor: WorkspaceActor, certificateId: string) {
    const certificate = await this.prisma.certificate.findFirst({
      where: { id: certificateId, schoolId: actor.schoolId },
      include: { school: { select: { name: true } }, student: { select: { id: true, name: true } }, issuer: { select: { name: true } } },
    });
    if (!certificate) throw new NotFoundException('الشهادة غير موجودة');
    const allowed = certificate.studentId === actor.userId
      || certificate.issuerId === actor.userId
      || (actor.role === 'PARENT' && await this.isParentOf(actor.userId, certificate.studentId));
    if (!allowed && !['ADMIN', 'PRINCIPAL', 'VICE_PRINCIPAL', 'SUPERVISOR'].includes(actor.role)) throw new ForbiddenException();
    return certificate;
  }

  private async assertTeacherClass(actor: WorkspaceActor, classId: string) {
    if (actor.role !== 'TEACHER') throw new ForbiddenException();
    const classroom = await this.prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: actor.schoolId,
        OR: [{ teacherId: actor.userId }, { classSubjects: { some: { teacherId: actor.userId } } }],
      },
      select: { id: true },
    });
    if (!classroom) throw new ForbiddenException('الفصل غير تابع لنطاقك التدريسي');
  }

  private async findTeacherQuiz(actor: WorkspaceActor, quizId: string) {
    const quiz = await this.prisma.teacherQuiz.findFirst({ where: { id: quizId, schoolId: actor.schoolId, teacherId: actor.userId } });
    if (!quiz) throw new NotFoundException('الاختبار غير موجود');
    return quiz;
  }

  private async studentClassIds(studentId: string, schoolId: string) {
    const entries = await this.prisma.enrollment.findMany({ where: { studentId, class: { schoolId } }, select: { classId: true } });
    return entries.map((entry) => entry.classId);
  }

  private async assertParentOf(actor: WorkspaceActor, studentId: string) {
    if (actor.role !== 'PARENT' || !(await this.isParentOf(actor.userId, studentId))) throw new ForbiddenException('لا يوجد ربط بين حساب ولي الأمر والطالب');
    const student = await this.prisma.user.findFirst({ where: { id: studentId, schoolId: actor.schoolId }, select: { id: true } });
    if (!student) throw new NotFoundException('الطالب غير موجود في المدرسة');
  }

  private async isParentOf(parentId: string, studentId: string) {
    return Boolean(await this.prisma.parentStudent.findUnique({ where: { parentId_studentId: { parentId, studentId } }, select: { id: true } }));
  }

  private async parentClassIds(actor: WorkspaceActor, studentId?: string) {
    if (!studentId) throw new BadRequestException('اختر الطالب المرتبط بحساب ولي الأمر');
    await this.assertParentOf(actor, studentId);
    return this.studentClassIds(studentId, actor.schoolId);
  }

  private validateQuestions(value: unknown): Array<QuizQuestionInput & { id: string }> {
    if (!Array.isArray(value) || value.length < 1 || value.length > 100) throw new BadRequestException('أضف من سؤال واحد إلى 100 سؤال');
    return value.map((raw, index) => {
      if (!raw || typeof raw !== 'object') throw new BadRequestException(`السؤال ${index + 1} غير صالح`);
      const question = raw;
      const prompt = this.requiredText(question.prompt, `نص السؤال ${index + 1}`, 2, 2000);
      const type = ['multiple_choice', 'true_false', 'short_answer', 'essay'].includes(question.type) ? question.type : null;
      const points = Number(question.points);
      if (!type || !Number.isFinite(points) || points <= 0 || points > 100) throw new BadRequestException(`تحقق من نوع ودرجة السؤال ${index + 1}`);
      const id = typeof question.id === 'string' && /^[a-z0-9_-]{1,50}$/i.test(question.id) ? question.id : `q${index + 1}`;
      const options = type === 'multiple_choice'
        ? Array.isArray(question.options) && question.options.length >= 2 && question.options.length <= 8
          ? question.options.map((option: any) => ({ text: this.requiredText(option.text, 'الخيار', 1, 300), correct: Boolean(option.correct) }))
          : null
        : type === 'true_false' ? [{ text: 'true' }, { text: 'false' }] : undefined;
      if (type === 'multiple_choice' && (!options || options.filter((option) => option.correct).length !== 1)) throw new BadRequestException(`يجب تحديد إجابة صحيحة واحدة للسؤال ${index + 1}`);
      const correctAnswer = type === 'essay' ? undefined : this.optionalText(question.correctAnswer, 300);
      if (['short_answer', 'true_false'].includes(type) && !correctAnswer) throw new BadRequestException(`حدد الإجابة الصحيحة للسؤال ${index + 1}`);
      return { id, prompt, type, points, options: options ?? undefined, correctAnswer };
    });
  }

  private isCorrect(question: QuizQuestionInput, answer: string) {
    if (question.type === 'multiple_choice') {
      const selected = Number(answer);
      return Number.isInteger(selected) && question.options?.[selected]?.correct === true;
    }
    return answer.trim().toLocaleLowerCase() === String(question.correctAnswer ?? '').trim().toLocaleLowerCase();
  }

  private requiredText(value: unknown, label: string, min: number, max: number) {
    if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new BadRequestException(`${label} غير صالح`);
    return value.trim();
  }

  private optionalText(value: unknown, max: number): string {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string' || value.trim().length > max) throw new BadRequestException('النص المدخل طويل أو غير صالح');
    return value.trim();
  }
}

import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { Role } from '../../auth/role.enum';

const STAFF_ROLES = new Set<Role>([
  Role.ADMIN,
  Role.PRINCIPAL,
  Role.VICE_PRINCIPAL,
  Role.TEACHER,
  Role.COUNSELOR,
  Role.SUPERVISOR,
  Role.ACCOUNTANT,
  Role.HR,
]);

const SURVEY_ROLES = new Set<Role>([Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR]);
const SURVEY_TERMS = /استبيان|استبيانات|survey|surveys|ولي.?الأمر|parent/i;
const STUDENT_RECORD_TERMS = /طالب|طلاب|student|grade|درج|حضور|غياب|attendance|واجب|اختبار|تحصيل|ضعف|سجل الطالب|student record/i;
const STUDENT_QUERY_STOP_WORDS = new Set([
  'الطالب', 'الطلاب', 'طالب', 'طلاب', 'student', 'students', 'grade', 'grades', 'درجات', 'درجة', 'درجته',
  'حضور', 'الحضور', 'غياب', 'الغياب', 'attendance', 'واجب', 'الواجب', 'الواجبات', 'homework', 'assignment', 'assignments',
  'اختبار', 'اختبارات', 'اختباره', 'exam', 'exams', 'تحصيل', 'تحصيله', 'ضعف', 'نقاط', 'سجل', 'ملف', 'بيانات', 'تقرير',
  'في', 'من', 'عن', 'على', 'علي', 'ما', 'ماذا', 'هل', 'هو', 'هي', 'كم', 'كيف', 'اعرف', 'عايز', 'عاوز', 'عاوزه', 'لو',
  'الصف', 'فصل', 'الفصل', 'مدرسة', 'المدرسة', 'student', 'record', 'please', 'show', 'tell', 'about', 'the', 'for', 'what',
]);

@Injectable()
export class AiPortalContextService {
  private readonly logger = new Logger(AiPortalContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  async build(userId: string, role: Role, portalPath = '', question = ''): Promise<string> {
    const actor = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        schoolId: true,
        role: true,
        isActive: true,
        name: true,
        firstName: true,
        lastName: true,
        studentProfile: { select: { gradeLevel: true } },
      },
    });

    if (!actor) return JSON.stringify({ dataAvailable: false, reason: 'account_not_found' });
    // Prisma's generated enum and the API auth enum have identical serialized
    // values, but are distinct TypeScript enum types. Trust the database role
    // for scoping and normalize it once at this boundary.
    const actorRole = actor.role as unknown as Role;
    if (!actor.isActive || actorRole !== role) {
      throw new ForbiddenException('حسابك غير نشط أو تغيرت صلاحياته؛ سجّل الدخول مرة أخرى.');
    }

    const context: Record<string, unknown> = {
      account: {
        name: actor.name || [actor.firstName, actor.lastName].filter(Boolean).join(' '),
        role: actorRole,
        gradeLevel: actor.studentProfile?.gradeLevel,
      },
      currentPortalPath: portalPath.slice(0, 180),
      dataRetrievedAt: new Date().toISOString(),
    };

    try {
      if (actorRole === Role.STUDENT) {
        context.student = await this.studentSummary(actor.id);
      } else if (actorRole === Role.PARENT) {
        context.children = await this.parentChildren(actor.id, actor.schoolId);
      } else if (STAFF_ROLES.has(actorRole)) {
        context.school = await this.staffSummary(actor.id, actor.schoolId, actorRole, question);
        if (SURVEY_ROLES.has(actorRole) && SURVEY_TERMS.test(question) && actor.schoolId) {
          context.parentSurveys = await this.recentSurveys(actor.schoolId);
        }
      }
    } catch (error) {
      this.logger.warn(`Could not load portal context for ${actorRole}; answering without a data snapshot: ${error instanceof Error ? error.message : 'unknown error'}`);
      context.dataAvailable = false;
    }

    const serialized = JSON.stringify(context);
    if (serialized.length <= 24000) return serialized;

    const compact: Record<string, any> = { ...context, contextCompacted: true };
    if (compact.school?.classes) {
      compact.school = {
        ...compact.school,
        classes: compact.school.classes.slice(0, 20).map((item: any) => ({ ...item, rosterPreview: item.rosterPreview?.slice(0, 8) })),
        attendanceLast30Days: compact.school.attendanceLast30Days?.slice(0, 60),
        gradeAverages: compact.school.gradeAverages?.slice(0, 60),
        recentAssignments: compact.school.recentAssignments?.slice(0, 15),
        focusedStudents: compact.school.focusedStudents?.slice(0, 5).map((item: any) => ({
          ...item,
          records: {
            ...item.records,
            recentGrades: item.records?.recentGrades?.slice(0, 8),
            recentAttendance: item.records?.recentAttendance?.slice(0, 12),
            recentSubmissions: item.records?.recentSubmissions?.slice(0, 8),
          },
        })),
      };
    }
    return JSON.stringify(compact);
  }

  private async studentSummary(studentId: string, includeOwnSurveyResponses = true) {
    const [enrollments, grades, attendance, submissions, learning, surveys] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { studentId },
        take: 20,
        orderBy: { enrolledAt: 'desc' },
        select: { enrolledAt: true, class: { select: { name: true, academicYear: true, teacher: { select: { name: true } }, subjects: { select: { name: true } } } } },
      }),
      this.prisma.grade.findMany({
        where: { studentId },
        take: 15,
        orderBy: { createdAt: 'desc' },
        select: { score: true, grade: true, maxScore: true, createdAt: true, subject: { select: { name: true } }, assignment: { select: { title: true } } },
      }),
      this.prisma.attendance.findMany({
        where: { studentId },
        take: 30,
        orderBy: { date: 'desc' },
        select: { date: true, status: true, notes: true, class: { select: { name: true } } },
      }),
      this.prisma.submission.findMany({
        where: { studentId },
        take: 15,
        orderBy: { submittedAt: 'desc' },
        select: { submittedAt: true, grade: true, score: true, feedback: true, assignment: { select: { title: true, dueDate: true, subject: { select: { name: true } } } } },
      }),
      this.prisma.smartStudentProfile.findUnique({ where: { userId: studentId }, select: { learningStyle: true, strengthSubjects: true, weakSubjects: true, performanceTrend: true } }),
      includeOwnSurveyResponses
        ? this.prisma.parentSurvey.findMany({ where: { respondentId: studentId }, take: 10, orderBy: { updatedAt: 'desc' }, select: { respondentRole: true, answers: true, updatedAt: true } })
        : Promise.resolve([]),
    ]);

    return { enrollments, recentGrades: grades, recentAttendance: attendance, recentSubmissions: submissions, learningProfile: learning, ownSurveyResponses: surveys };
  }

  private async parentChildren(parentId: string, schoolId: string | null) {
    const links = await this.prisma.parentStudent.findMany({
      where: { parentId, student: { ...(schoolId ? { schoolId } : {}), isActive: true } },
      take: 10,
      select: { relationship: true, studentId: true, student: { select: { name: true, firstName: true, lastName: true, studentProfile: { select: { gradeLevel: true } } } } },
    });
    return Promise.all(links.map(async (link) => {
      const [records, parentSurveyResponses] = await Promise.all([
        this.studentSummary(link.studentId, false),
        this.prisma.parentSurvey.findMany({ where: { respondentId: parentId, studentId: link.studentId }, take: 10, orderBy: { updatedAt: 'desc' }, select: { answers: true, updatedAt: true } }),
      ]);
      return {
        relationship: link.relationship,
        student: { name: link.student.name || [link.student.firstName, link.student.lastName].filter(Boolean).join(' '), gradeLevel: link.student.studentProfile?.gradeLevel },
        records,
        parentSurveyResponses,
      };
    }));
  }

  private async staffSummary(userId: string, schoolId: string | null, role: Role, question: string) {
    if (!schoolId) return { dataAvailable: false, reason: 'school_not_assigned' };
    const canViewAcademicData = ![Role.ACCOUNTANT, Role.HR].includes(role);

    const where = role === Role.TEACHER
      ? { schoolId, OR: [{ teacherId: userId }, { classSubjects: { some: { teacherId: userId } } }] }
      : { schoolId };

    const classes = canViewAcademicData ? await this.prisma.class.findMany({
      where,
      take: role === Role.TEACHER ? 30 : 50,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        academicYear: true,
        teacher: { select: { name: true } },
        subjects: { where: role === Role.TEACHER ? { OR: [{ teacherId: userId }, { classSubjects: { some: { teacherId: userId } } }] } : undefined, select: { id: true, name: true } },
        students: {
          take: role === Role.TEACHER ? 18 : 8,
          orderBy: { enrolledAt: 'desc' },
          select: { student: { select: { id: true, name: true, firstName: true, lastName: true, studentProfile: { select: { gradeLevel: true } } } } },
        },
        _count: { select: { students: true, subjects: true } },
      },
    }) : [];
    const classIds = classes.map((item) => item.id);
    const subjectIds = classes.flatMap((item) => item.subjects.map((subject) => subject.id));

    const [staffCounts, attendanceCounts, gradeStats, assignments, invoices, surveyCount] = await Promise.all([
      role === Role.TEACHER || role === Role.ACCOUNTANT ? Promise.resolve([]) : this.prisma.user.groupBy({ by: ['role', 'isActive'], where: { schoolId }, _count: { _all: true } }),
      classIds.length ? this.prisma.attendance.groupBy({ by: ['classId', 'status'], where: { classId: { in: classIds }, date: { gte: this.daysAgo(30) } }, _count: { _all: true } }) : [],
      subjectIds.length ? this.prisma.grade.groupBy({ by: ['subjectId'], where: { subjectId: { in: subjectIds } }, _avg: { grade: true, score: true }, _count: { _all: true } }) : [],
      canViewAcademicData ? this.prisma.assignment.findMany({
        where: role === Role.TEACHER ? { schoolId, teacherId: userId } : { schoolId },
        take: 18,
        orderBy: { dueDate: 'desc' },
        select: { title: true, dueDate: true, maxScore: true, subject: { select: { name: true, class: { select: { name: true } } } }, _count: { select: { submissions: true } } },
      }) : Promise.resolve([]),
      role === Role.ACCOUNTANT ? this.prisma.invoice.groupBy({ by: ['status', 'currency'], where: { schoolId }, _sum: { amount: true }, _count: { _all: true } }) : [],
      SURVEY_ROLES.has(role) ? this.prisma.parentSurvey.count({ where: { schoolId } }) : 0,
    ]);

    const result: Record<string, unknown> = {
      roleScope: role === Role.TEACHER ? 'فصول ومواد مسندة لهذا المعلم فقط' : 'بيانات المدرسة المرتبطة بدور الحساب فقط',
      classes: classes.map((item) => ({
        name: item.name,
        academicYear: item.academicYear,
        teacher: item.teacher?.name,
        studentCount: item._count.students,
        subjectCount: item._count.subjects,
        subjects: item.subjects.map((subject) => subject.name),
        rosterPreview: item.students.map(({ student }) => ({ name: student.name || [student.firstName, student.lastName].filter(Boolean).join(' '), gradeLevel: student.studentProfile?.gradeLevel })),
      })),
      ...(role === Role.TEACHER ? {} : { staffCounts: staffCounts.map((row) => ({ role: row.role, active: row.isActive, count: row._count._all })) }),
      attendanceLast30Days: attendanceCounts.map((row) => ({ class: classes.find((item) => item.id === row.classId)?.name, status: row.status, count: row._count._all })),
      gradeAverages: gradeStats.map((row) => ({ subject: classes.flatMap((item) => item.subjects).find((subject) => subject.id === row.subjectId)?.name, average: row._avg.grade ?? row._avg.score, count: row._count._all })),
      recentAssignments: assignments,
    };

    if (canViewAcademicData && classIds.length && STUDENT_RECORD_TERMS.test(question)) {
      const terms = [...new Set(question
        .normalize('NFKC')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 3 && !STUDENT_QUERY_STOP_WORDS.has(term.toLocaleLowerCase('ar'))))]
        .slice(-5);

      if (terms.length) {
        const nameMatches = terms.map((term) => {
          const folded = term.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي');
          const variants = [...new Set([term, folded])];
          return {
            OR: variants.flatMap((value) => [
              { name: { contains: value, mode: 'insensitive' as const } },
              { firstName: { contains: value, mode: 'insensitive' as const } },
              { lastName: { contains: value, mode: 'insensitive' as const } },
            ]),
          };
        });
        const matchingStudents = await this.prisma.user.findMany({
          where: {
            schoolId,
            role: Role.STUDENT,
            isActive: true,
            AND: nameMatches,
            ...(role === Role.TEACHER ? { enrollments: { some: { classId: { in: classIds } } } } : {}),
          },
          take: 5,
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            studentProfile: { select: { gradeLevel: true } },
            enrollments: { take: 5, select: { class: { select: { name: true } } } },
          },
        });
        result.focusedStudents = await Promise.all(matchingStudents.map(async (student) => ({
          name: student.name || [student.firstName, student.lastName].filter(Boolean).join(' '),
          gradeLevel: student.studentProfile?.gradeLevel,
          classes: student.enrollments.map((enrollment) => enrollment.class.name),
          records: await this.studentSummary(student.id, false),
        })));
      }
    }

    if (role === Role.ACCOUNTANT) result.invoices = invoices;
    if (SURVEY_ROLES.has(role)) result.parentSurveyCount = surveyCount;
    if (role === Role.HR) {
      result.recentStaffActivity = await this.prisma.user.findMany({ where: { schoolId, role: { not: Role.STUDENT } }, take: 20, orderBy: { lastActiveDate: 'desc' }, select: { name: true, firstName: true, lastName: true, role: true, isActive: true, lastActiveDate: true } });
    }
    return result;
  }

  private recentSurveys(schoolId: string) {
    return this.prisma.parentSurvey.findMany({
      where: { schoolId },
      take: 12,
      orderBy: { updatedAt: 'desc' },
      select: { respondentRole: true, answers: true, updatedAt: true, student: { select: { name: true, firstName: true, lastName: true, studentProfile: { select: { gradeLevel: true } } } } },
    });
  }

  private daysAgo(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

}

import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface AdminOverview {
  stats: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalSubjects: number;
    totalAssignments: number;
    activeUsers: number;
    unassignedStudents: number;
  };
  attendance: {
    todayPresent: number;
    todayAbsent: number;
    todayLate: number;
    todayRecordCount: number;
    weeklyRecordCount: number;
    weeklyRate: number | null;
  };
  assignments: {
    pending: number;
    submitted: number;
    graded: number;
    overdueRate: number | null;
    overdueCount: number;
    overdueTotal: number;
  };
}

export interface TeacherPerformance {
  teacherId: string;
  teacherName: string;
  stats: {
    classesCount: number;
    subjectsCount: number;
    assignmentsCreated: number;
    assignmentsGraded: number;
    avgStudentScore: number | null;
    attendanceRecorded: number | null;
  };
  lastActivity: Date | null;
}

export interface ClassActivity {
  classId: string;
  className: string;
  studentsCount: number;
  avgAttendance: number | null;
  avgGrade: number | null;
  assignmentsCompleted: number;
  totalAssignments: number;
  status: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL' | 'NO_DATA';
}

@Injectable()
export class AdminDashboardService {
  constructor(private prisma: PrismaService) { }

  /**
   * Get admin overview dashboard data
   */
  async getOverview(schoolId: string): Promise<AdminOverview> {
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      totalSubjects,
      totalAssignments,
      activeUsers,
      unassignedStudents,
      todayAttendance,
      weeklyAttendance,
    ] = await Promise.all([
      this.prisma.user.count({ where: { schoolId, role: 'STUDENT', isActive: true } }),
      this.prisma.user.count({ where: { schoolId, role: 'TEACHER', isActive: true } }),
      this.prisma.class.count({ where: { schoolId } }),
      this.prisma.subject.count({ where: { schoolId } }),
      this.prisma.assignment.count({ where: { schoolId } }),
      this.prisma.user.count({ where: { schoolId, isActive: true } }),
      this.prisma.user.count({
        where: { schoolId, role: 'STUDENT', isActive: true, enrollments: { none: { class: { schoolId } } } },
      }),
      this.prisma.attendance.findMany({ where: { date: { gte: today }, class: { schoolId } } }),
      this.prisma.attendance.findMany({ where: { date: { gte: weekAgo }, class: { schoolId } } }),
    ]);

    // Calculate attendance stats
    const todayPresent = todayAttendance.filter(
      (a) => a.status === 'PRESENT',
    ).length;
    const todayAbsent = todayAttendance.filter(
      (a) => a.status === 'ABSENT',
    ).length;
    const todayLate = todayAttendance.filter((a) => a.status === 'LATE').length;

    const countedWeeklyAttendance = weeklyAttendance.filter((entry) => entry.status !== 'EXCUSED');
    const weeklyPresent = countedWeeklyAttendance.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE',
    ).length;
    const weeklyRate =
      countedWeeklyAttendance.length > 0
        ? Math.round((weeklyPresent / countedWeeklyAttendance.length) * 100)
        : 0;

    // Calculate submission stats
    const allSubmissions = await this.prisma.submission.count({ where: { assignment: { schoolId } } });
    const gradedSubmissions = await this.prisma.submission.count({
      where: { gradedAt: { not: null }, assignment: { schoolId } },
    });

    // Get overdue assignments
    const overdueAssignments = await this.prisma.assignment.findMany({
      where: { schoolId, dueDate: { lt: new Date() } },
      include: { _count: { select: { submissions: true } } },
    });

    return {
      stats: {
        totalStudents,
        totalTeachers,
        totalClasses,
        totalSubjects,
        totalAssignments,
        activeUsers,
        unassignedStudents,
      },
      attendance: {
        todayPresent,
        todayAbsent,
        todayLate,
        todayRecordCount: todayAttendance.filter((entry) => entry.status !== 'EXCUSED').length,
        weeklyRecordCount: countedWeeklyAttendance.length,
        weeklyRate: countedWeeklyAttendance.length > 0 ? weeklyRate : null,
      },
      assignments: {
        pending: allSubmissions - gradedSubmissions,
        submitted: allSubmissions,
        graded: gradedSubmissions,
        overdueCount: overdueAssignments.filter((assignment) => assignment._count.submissions === 0).length,
        overdueTotal: overdueAssignments.length,
        overdueRate: overdueAssignments.length > 0
          ? Math.round((overdueAssignments.filter((assignment) => assignment._count.submissions === 0).length / overdueAssignments.length) * 100)
          : null,
      },
    };
  }

  /**
   * Get teacher performance metrics for direct and subject-level assignments.
   */
  async getTeacherPerformance(schoolId: string): Promise<TeacherPerformance[]> {
    const teachers = await this.prisma.user.findMany({
      where: { schoolId, role: 'TEACHER', isActive: true },
      select: { id: true, name: true, firstName: true, lastName: true, email: true, updatedAt: true },
    });

    return Promise.all(teachers.map(async (teacher) => {
      const [classes, subjects, assignments] = await Promise.all([
        this.prisma.class.findMany({
          where: { schoolId, OR: [{ teacherId: teacher.id }, { classSubjects: { some: { teacherId: teacher.id } } }] },
          select: { id: true },
        }),
        this.prisma.subject.findMany({
          where: { schoolId, OR: [{ teacherId: teacher.id }, { classSubjects: { some: { teacherId: teacher.id } } }] },
          select: { id: true, grades: { select: { grade: true, maxScore: true } } },
        }),
        this.prisma.assignment.findMany({
          where: {
            schoolId,
            OR: [
              { teacherId: teacher.id },
              { subject: { schoolId, OR: [{ teacherId: teacher.id }, { classSubjects: { some: { teacherId: teacher.id } } }] } },
            ],
          },
          select: { id: true, submissions: { select: { gradedAt: true } } },
        }),
      ]);
      const validGrades = subjects.flatMap((subject) => subject.grades).filter((grade) =>
        Number(grade.maxScore) > 0 && Number.isFinite(Number(grade.grade)),
      );
      const average = validGrades.length > 0
        ? validGrades.reduce((sum, grade) => sum + (Number(grade.grade) / Number(grade.maxScore)) * 100, 0) / validGrades.length
        : null;
      const gradedCount = assignments.flatMap((assignment) => assignment.submissions).filter((submission) => submission.gradedAt).length;

      return {
        teacherId: teacher.id,
        teacherName: teacher.name || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.email,
        stats: {
          classesCount: classes.length,
          subjectsCount: subjects.length,
          assignmentsCreated: assignments.length,
          assignmentsGraded: gradedCount,
          avgStudentScore: average === null ? null : Math.round(average),
          attendanceRecorded: null,
        },
        lastActivity: teacher.updatedAt,
      };
    }));
  }

  /**
   * Get class activity report
   */
  async getClassActivity(schoolId: string): Promise<ClassActivity[]> {
    const classes = await this.prisma.class.findMany({
      where: { schoolId },
      include: {
        students: { select: { studentId: true } },
        subjects: {
          select: { id: true },
        },
        classSubjects: {
          select: { subjectId: true },
        },
      },
    });

    if (classes.length === 0) return [];

    const classIds = classes.map((classItem) => classItem.id);
    const studentIds = [...new Set(classes.flatMap((classItem) => classItem.students.map((item) => item.studentId)))];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [attendance, grades, assignments] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { classId: { in: classIds }, date: { gte: thirtyDaysAgo } },
        select: { classId: true, studentId: true, status: true },
      }),
      this.prisma.grade.findMany({
          where: {
            studentId: { in: studentIds },
            subject: { OR: [{ classId: { in: classIds } }, { classSubjects: { some: { classId: { in: classIds } } } }] },
            createdAt: { gte: thirtyDaysAgo },
            maxScore: { gt: 0 },
          },
        select: { studentId: true, subjectId: true, grade: true, maxScore: true },
      }),
      this.prisma.assignment.findMany({
        where: {
          schoolId,
          OR: [
            { classId: { in: classIds } },
            { classId: null, subject: { OR: [{ classId: { in: classIds } }, { classSubjects: { some: { classId: { in: classIds } } } }] } },
          ],
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { id: true, classId: true, subject: { select: { classId: true, classSubjects: { select: { classId: true } } } } },
      }),
    ]);

    const relevantAssignmentIds = assignments.map((assignment) => assignment.id);
    const submissions = relevantAssignmentIds.length && studentIds.length
      ? await this.prisma.submission.findMany({
          where: { studentId: { in: studentIds }, assignmentId: { in: relevantAssignmentIds } },
          select: { studentId: true, assignmentId: true },
        })
      : [];

    return classes.map((classItem: any) => {
      const classStudentIds = new Set(classItem.students.map((enrollment: any) => enrollment.studentId));
      const classSubjectIds = new Set([
        ...classItem.subjects.map((subject: any) => subject.id),
        ...classItem.classSubjects.map((subject: any) => subject.subjectId),
      ]);
      const classAttendance = attendance.filter((entry) => entry.classId === classItem.id && entry.status !== 'EXCUSED');
      const presentCount = classAttendance.filter(
        (a: any) => a.status === 'PRESENT' || a.status === 'LATE',
      ).length;
      const avgAttendance = classAttendance.length > 0
        ? Math.round((presentCount / classAttendance.length) * 100)
        : null;
      const classGrades = grades.filter((grade) => classStudentIds.has(grade.studentId) && classSubjectIds.has(grade.subjectId));
      const avgGrade = classGrades.length > 0
        ? Math.round(classGrades.reduce((sum, grade) => sum + (Number(grade.grade) / Number(grade.maxScore)) * 100, 0) / classGrades.length)
        : null;
      const classAssignments = assignments.filter((assignment) =>
        assignment.classId === classItem.id || (assignment.classId === null && (
          assignment.subject.classId === classItem.id || assignment.subject.classSubjects.some((subjectClass: any) => subjectClass.classId === classItem.id)
        )),
      );
      const assignmentIds = new Set(classAssignments.map((assignment) => assignment.id));
      const assignmentsCompleted = new Set(
        submissions
          .filter((submission) => classStudentIds.has(submission.studentId) && assignmentIds.has(submission.assignmentId))
          .map((submission) => `${submission.studentId}:${submission.assignmentId}`),
      ).size;
      const totalAssignments = classAssignments.length * classStudentIds.size;

      // Determine status
      let status: ClassActivity['status'] = 'GOOD';
      if (avgAttendance === null && avgGrade === null) status = 'NO_DATA';
      else if ((avgAttendance !== null && avgAttendance < 60) || (avgGrade !== null && avgGrade < 50)) status = 'CRITICAL';
      else if ((avgAttendance !== null && avgAttendance < 75) || (avgGrade !== null && avgGrade < 60)) status = 'NEEDS_ATTENTION';
      else if (avgAttendance !== null && avgGrade !== null && avgAttendance >= 90 && avgGrade >= 80) status = 'EXCELLENT';

      return {
        classId: classItem.id,
        className: classItem.name,
        studentsCount: classStudentIds.size,
        avgAttendance,
        avgGrade,
        assignmentsCompleted,
        totalAssignments,
        status,
      };
    });
  }

  async getFinancialStats(schoolId: string) {
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        schoolId,
        status: 'PAID',
        paidAt: { gte: lastYear },
      },
      select: { amount: true, currency: true, paidAt: true },
    });

    // Keep currencies separate so reports never add unlike amounts together.
    const monthlyData: Record<string, { name: string; currency: string; total: number }> = {};
    invoices.forEach((inv) => {
      if (!inv.paidAt) return;
      const monthKey = `${inv.paidAt.getFullYear()}-${String(inv.paidAt.getMonth() + 1).padStart(2, '0')}`;
      const key = `${monthKey}:${inv.currency}`;
      const monthName = monthKey;
      const entry = monthlyData[key] || (monthlyData[key] = { name: monthName, currency: inv.currency, total: 0 });
      entry.total += Number(inv.amount);
    });

    return Object.entries(monthlyData)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, entry]) => entry);
  }

  async getEnrollmentStats(schoolId: string) {
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        class: { schoolId },
        enrolledAt: { gte: lastYear },
      },
      select: { enrolledAt: true },
    });

    const monthlyData: Record<string, number> = {};
    enrollments.forEach((enrollment) => {
      const month = `${enrollment.enrolledAt.getUTCFullYear()}-${String(enrollment.enrolledAt.getUTCMonth() + 1).padStart(2, '0')}`;
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });

    return Object.entries(monthlyData).sort(([left], [right]) => left.localeCompare(right)).map(([name, students]) => ({
      name,
      students,
    }));
  }
}

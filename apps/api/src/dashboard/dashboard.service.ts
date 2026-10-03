import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceStatus, InvoiceStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type ChartPoint = { label: string; value: number };

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private getSchoolWhere(schoolId?: string) {
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    return { schoolId };
  }

  private round(value: number) {
    return Math.round(value * 10) / 10;
  }

  private parseJsonOrNull(value: string) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private monthLabel(date: Date) {
    return date.toLocaleString('en-US', { month: 'short' });
  }

  private buildSeries<T extends { createdAt?: Date; paidAt?: Date }>(
    items: T[],
    dateField: 'createdAt' | 'paidAt',
  ) {
    const monthly = new Map<string, number>();

    items.forEach((item) => {
      const value = item[dateField];
      if (!value) {
        return;
      }

      const label = this.monthLabel(value);
      monthly.set(label, (monthly.get(label) ?? 0) + 1);
    });

    return Array.from(monthly.entries()).map(([label, value]) => ({ label, value }));
  }

  private buildRevenueSeries(items: Array<{ paidAt: Date | null; amount: number }>) {
    const monthly = new Map<string, number>();

    items.forEach((item) => {
      if (!item.paidAt) {
        return;
      }

      const label = this.monthLabel(item.paidAt);
      monthly.set(label, (monthly.get(label) ?? 0) + Number(item.amount));
    });

    return Array.from(monthly.entries()).map(([label, value]) => ({
      label,
      value: this.round(value),
    }));
  }

  async getStudentDashboard(userId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        enrollments: {
          include: {
            class: {
              include: {
                teacher: {
                  select: { id: true, name: true, email: true },
                },
                subjects: {
                  include: {
                    teacher: {
                      select: { id: true, name: true, email: true },
                    },
                    lessons: true,
                    assignments: {
                      include: {
                        submissions: {
                          where: { studentId: userId },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        studentGrades: {
          include: {
            subject: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        attendance: {
          orderBy: { date: 'desc' },
          take: 60,
        },
        submissions: {
          include: {
            assignment: {
              include: {
                subject: {
                  select: { id: true, name: true },
                },
              },
            },
          },
          orderBy: { submittedAt: 'desc' },
        },
        achievements: {
          include: {
            achievement: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const subjects = student.enrollments.flatMap((enrollment) => enrollment.class.subjects);
    const subjectMap = new Map<string, (typeof subjects)[number]>();
    subjects.forEach((subject) => subjectMap.set(subject.id, subject));
    const uniqueSubjects = Array.from(subjectMap.values());

    const allAssignments = uniqueSubjects.flatMap((subject) =>
      subject.assignments.map((assignment) => {
        const submission = assignment.submissions[0] ?? null;
        const status = submission?.gradedAt
          ? 'graded'
          : submission
            ? 'submitted'
            : 'pending';

        return {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          dueDate: assignment.dueDate,
          subject: {
            id: subject.id,
            name: subject.name,
          },
          status,
          grade: submission?.grade ?? submission?.score ?? null,
        };
      }),
    );

    const pendingAssignments = allAssignments.filter((assignment) => assignment.status === 'pending');
    const completedAssignments = allAssignments.filter((assignment) => assignment.status !== 'pending');

    const classIds = new Set(student.enrollments.map((enrollment) => enrollment.classId));
    const attendanceRecords = student.attendance.filter((entry) => classIds.has(entry.classId));
    const attendanceBreakdown = {
      present: attendanceRecords.filter((entry) => entry.status === AttendanceStatus.PRESENT).length,
      absent: attendanceRecords.filter((entry) => entry.status === AttendanceStatus.ABSENT).length,
      late: attendanceRecords.filter((entry) => entry.status === AttendanceStatus.LATE).length,
      excused: attendanceRecords.filter((entry) => entry.status === AttendanceStatus.EXCUSED).length,
    };

    const countedAttendance = attendanceBreakdown.present + attendanceBreakdown.absent + attendanceBreakdown.late;
    const attendanceRate = countedAttendance > 0
      ? this.round(((attendanceBreakdown.present + attendanceBreakdown.late) / countedAttendance) * 100)
      : null;
    const gradeRecords = student.studentGrades.filter(
      (grade) => subjectMap.has(grade.subjectId) && Number(grade.maxScore) > 0 && Number.isFinite(Number(grade.grade)),
    );

    const averageGrade =
      gradeRecords.length > 0
        ? gradeRecords.reduce(
            (sum, grade) => sum + (Number(grade.grade) / Number(grade.maxScore)) * 100,
            0,
          ) / gradeRecords.length
        : null;

    const weeklyActivity = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const label = date.toLocaleString('en-US', { weekday: 'short' });
      const submissions = student.submissions.filter(
        (submission) =>
          subjectMap.has(submission.assignment.subject.id) &&
          submission.submittedAt.toDateString() === date.toDateString(),
      ).length;
      const attendanceEntry = attendanceRecords.find(
        (entry) => entry.date.toDateString() === date.toDateString(),
      );
      return {
        label,
        submissions,
        attended:
          attendanceEntry?.status === AttendanceStatus.PRESENT ||
          attendanceEntry?.status === AttendanceStatus.LATE
            ? 1
            : 0,
      };
    });

    const subjectPerformance = uniqueSubjects.map((subject) => {
      const grades = gradeRecords.filter((grade) => grade.subjectId === subject.id);
      const average =
        grades.length > 0
          ? grades.reduce((sum, grade) => sum + (Number(grade.grade) / Number(grade.maxScore)) * 100, 0) /
            grades.length
          : null;

      const totalAssignments = subject.assignments.length;
      const submitted = subject.assignments.filter((assignment) => assignment.submissions.length > 0).length;
      const progress = totalAssignments > 0 ? (submitted / totalAssignments) * 100 : null;

      return {
        id: subject.id,
        name: subject.name,
        teacher: subject.teacher?.name ?? subject.teacher?.email ?? null,
        averageGrade: average === null ? null : this.round(average),
        progress: progress === null ? null : this.round(progress),
        totalLessons: subject.lessons.length,
        totalAssignments,
        submittedAssignments: submitted,
      };
    });

    return {
      student: {
        id: student.id,
        name: student.name ?? student.email,
        schoolId: student.schoolId,
        classes: student.enrollments.map(({ class: enrolledClass }) => ({
          id: enrolledClass.id,
          name: enrolledClass.name,
          teacher: enrolledClass.teacher?.name ?? enrolledClass.teacher?.email ?? null,
        })),
      },
      summary: {
        totalSubjects: uniqueSubjects.length,
        pendingAssignments: pendingAssignments.length,
        completedAssignments: completedAssignments.length,
        attendanceRate,
        averageGrade: averageGrade === null ? null : this.round(averageGrade),
      },
      upcomingAssignments: pendingAssignments
        .sort((a, b) => {
          const first = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          const second = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
          return first - second;
        })
        .slice(0, 5),
      attendance: attendanceBreakdown,
      attendanceRecordCount: attendanceRecords.length,
      achievements: student.achievements.map(({ achievement, unlockedAt }) => ({
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        unlockedAt,
      })),
      weeklyActivity,
      subjectPerformance,
      gamification: {
        level: student.level,
        totalXP: student.totalXP,
        streakDays: student.streakDays,
        achievementsUnlocked: student.achievements.length,
      },
    };
  }

  async getTeacherDashboard(userId: string) {
    const teacher = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, schoolId: true },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    if (!teacher.schoolId) {
      throw new ForbiddenException('The account is not assigned to a school');
    }

    const [taughtClasses, taughtSubjects] = await Promise.all([
      this.prisma.class.findMany({
        where: {
          schoolId: teacher.schoolId,
          OR: [{ teacherId: userId }, { classSubjects: { some: { teacherId: userId } } }],
        },
        include: {
          students: { select: { studentId: true } },
          subjects: { select: { id: true } },
          classSubjects: { where: { teacherId: userId }, select: { subjectId: true } },
        },
      }),
      this.prisma.subject.findMany({
        where: {
          schoolId: teacher.schoolId,
          OR: [{ teacherId: userId }, { classSubjects: { some: { teacherId: userId } } }],
        },
        include: {
          lessons: { select: { id: true } },
          assignments: { select: { id: true } },
          grades: { select: { studentId: true, grade: true, maxScore: true } },
          classSubjects: { where: { teacherId: userId }, select: { classId: true } },
        },
      }),
    ]);

    const classIds = taughtClasses.map((item) => item.id);
    const recentAttendance = await this.prisma.attendance.findMany({
      where: {
        classId: { in: classIds.length > 0 ? classIds : ['__none__'] },
        date: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const [gradingQueue, pendingSubmissionCount] = await Promise.all([
      this.prisma.submission.findMany({
      where: {
        assignment: {
          schoolId: teacher.schoolId,
          OR: [
            { teacherId: userId },
            { subject: { schoolId: teacher.schoolId, classSubjects: { some: { teacherId: userId } } } },
          ],
        },
        gradedAt: null,
      },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
        assignment: {
          select: { id: true, title: true, dueDate: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: 8,
      }),
      this.prisma.submission.count({
        where: {
          assignment: {
            schoolId: teacher.schoolId,
            OR: [
              { teacherId: userId },
              { subject: { schoolId: teacher.schoolId, classSubjects: { some: { teacherId: userId } } } },
            ],
          },
          gradedAt: null,
        },
      }),
    ]);

    const recentAssignments = await this.prisma.assignment.findMany({
      where: {
        schoolId: teacher.schoolId,
        OR: [
          { teacherId: userId },
          { subject: { schoolId: teacher.schoolId, classSubjects: { some: { teacherId: userId } } } },
        ],
      },
      include: {
        subject: {
          select: { id: true, name: true },
        },
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    const earlyInterventionAlerts = await this.prisma.notification.findMany({
      where: {
        userId,
        type: 'EARLY_INTERVENTION',
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const totalStudents = new Set(taughtClasses.flatMap((classItem) => classItem.students.map((enrollment) => enrollment.studentId))).size;
    const totalAssignments = taughtSubjects.reduce(
      (sum, subject) => sum + subject.assignments.length,
      0,
    );
    const totalLessons = taughtSubjects.reduce(
      (sum, subject) => sum + subject.lessons.length,
      0,
    );

    const presentAttendance = recentAttendance.filter(
      (entry) => entry.status === AttendanceStatus.PRESENT || entry.status === AttendanceStatus.LATE,
    ).length;
    const countedAttendance = recentAttendance.filter((entry) => entry.status !== AttendanceStatus.EXCUSED).length;
    const attendanceRate = countedAttendance > 0
      ? this.round((presentAttendance / countedAttendance) * 100)
      : null;

    const classPerformance = taughtClasses.map((classItem) => {
      const subjectIds = new Set([
        ...classItem.subjects.map((subject) => subject.id),
        ...classItem.classSubjects.map((subject) => subject.subjectId),
      ]);
      const classGrades = taughtSubjects
        .filter((subject) => subjectIds.has(subject.id) && subject.classId === classItem.id)
        .flatMap((subject) => subject.grades || []);
      const validGrades = classGrades.filter(
        (grade) => Number(grade.maxScore) > 0 && Number.isFinite(Number(grade.grade)),
      );
      const averageGrade =
        validGrades.length > 0
          ? validGrades.reduce(
              (sum, grade) => {
                const max = Number(grade.maxScore);
                const score = Number(grade.grade);
                return sum + (score / max) * 100;
              },
              0,
            ) / validGrades.length
          : null;

      return {
        id: classItem.id,
        name: classItem.name,
        studentCount: classItem.students.length,
        subjectCount: subjectIds.size,
        averageGrade: averageGrade === null ? null : this.round(averageGrade),
      };
    });

    return {
      teacher: {
        id: teacher.id,
        name: teacher.name ?? teacher.email,
        schoolId: teacher.schoolId,
      },
      summary: {
        totalClasses: taughtClasses.length,
        totalStudents,
        totalAssignments,
        totalLessons,
        pendingSubmissions: pendingSubmissionCount,
        attendanceRate,
      },
      classPerformance,
      recentAssignments: recentAssignments.map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        subject: assignment.subject?.name ?? 'Unknown subject',
        dueDate: assignment.dueDate,
        submissions: assignment._count.submissions,
      })),
      gradingQueue: gradingQueue.map((submission) => ({
        id: submission.id,
        submittedAt: submission.submittedAt,
        assignment: submission.assignment,
        student: submission.student,
      })),
      attendanceSummary: {
        totalRecords: recentAttendance.length,
        present: recentAttendance.filter((entry) => entry.status === AttendanceStatus.PRESENT).length,
        late: recentAttendance.filter((entry) => entry.status === AttendanceStatus.LATE).length,
        absent: recentAttendance.filter((entry) => entry.status === AttendanceStatus.ABSENT).length,
      },
      interventionAlerts: earlyInterventionAlerts.map(alert => ({
        id: alert.id,
        title: alert.title,
        body: alert.body,
        data: alert.data ? this.parseJsonOrNull(alert.data) : null,
        createdAt: alert.createdAt,
      })),
    };
  }

  async getAdminDashboard(userId: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        schoolId: true,
        role: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const scope = this.getSchoolWhere(admin.schoolId);
    const attendanceSince = new Date();
    attendanceSince.setUTCDate(attendanceSince.getUTCDate() - 30);
    const [users, classes, subjects, invoices, auditLogs, attendance] = await Promise.all([
      this.prisma.user.findMany({
        where: scope,
        select: { id: true, role: true, createdAt: true, isActive: true },
      }),
      this.prisma.class.findMany({
        where: scope,
        include: {
          students: true,
        },
      }),
      this.prisma.subject.findMany({
        where: scope,
        select: { id: true },
      }),
      this.prisma.invoice.findMany({
        where: scope,
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          paidAt: true,
        },
      }),
      this.prisma.auditLog.findMany({
        where: scope,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.attendance.findMany({
        where: { date: { gte: attendanceSince }, class: { schoolId: admin.schoolId } },
        select: { status: true },
      }),
    ]);

    const students = users.filter((user) => user.role === Role.STUDENT);
    const teachers = users.filter((user) => user.role === Role.TEACHER);
    const activeUsers = users.filter((user) => user.isActive).length;
    const paidInvoices = invoices.filter((invoice) => invoice.status === InvoiceStatus.PAID);
    const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
    const failedInvoices = invoices.filter((invoice) => invoice.status === InvoiceStatus.FAILED).length;
    const attendanceRate = attendance.length
      ? this.round((attendance.filter((record) => record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.LATE).length / attendance.length) * 100)
      : null;

    return {
      admin: {
        id: admin.id,
        name: admin.name ?? admin.email,
        schoolId: admin.schoolId,
      },
      kpis: {
        totalUsers: users.length,
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalClasses: classes.length,
        totalSubjects: subjects.length,
        activeUsers,
        totalRevenue: this.round(totalRevenue),
        attendanceRate,
      },
      enrollmentSeries: this.buildSeries(students, 'createdAt'),
      revenueSeries: this.buildRevenueSeries(
        paidInvoices.map((invoice) => ({
          paidAt: invoice.paidAt,
          amount: Number(invoice.amount),
        })),
      ),
      invoiceSummary: {
        total: invoices.length,
        paid: paidInvoices.length,
        pending: invoices.filter((invoice) => invoice.status === InvoiceStatus.PENDING).length,
        requiresAction: invoices.filter((invoice) => invoice.status === InvoiceStatus.REQUIRES_ACTION).length,
        failed: failedInvoices,
        refunded: invoices.filter((invoice) => invoice.status === InvoiceStatus.REFUNDED).length,
      },
      recentActivity: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        actor: log.user?.name ?? log.user?.email ?? 'System',
        createdAt: log.createdAt,
      })),
      systemHealth: [
        {
          name: 'Users',
          status: activeUsers > 0 ? 'healthy' : 'warning',
          value: activeUsers,
          detail: `${activeUsers} active users`,
        },
        {
          name: 'Payments',
          status: failedInvoices > 0 ? 'warning' : 'healthy',
          value: paidInvoices.length,
          detail: `${paidInvoices.length} paid invoices`,
        },
        {
          name: 'Classes',
          status: classes.length > 0 ? 'healthy' : 'warning',
          value: classes.length,
          detail: `${classes.reduce((sum, item) => sum + item.students.length, 0)} enrollments`,
        },
      ],
    };
  }

  async getParentDashboard(userId: string) {
    const parent = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        children: {
          include: {
            student: {
              include: {
                studentGrades: { include: { subject: true }, orderBy: { createdAt: 'desc' }, take: 5 },
                attendance: { include: { class: { select: { name: true } } }, orderBy: { date: 'desc' }, take: 30 },
                enrollments: { include: { class: { select: { id: true, name: true } } } },
              }
            }
          }
        }
      }
    });

    if (!parent) throw new NotFoundException('Parent not found');

    const childrenData = await Promise.all((parent.children as any[]).map(async (relation: any) => {
      const student = relation.student;
      const attendanceList = (student.attendance || []) as any[];
      const presentCount = attendanceList.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length;
      const attendanceRate = attendanceList.length > 0 ? this.round((presentCount / attendanceList.length) * 100) : null;

      const validGrades = (student.studentGrades || [] as any[]).filter((grade: any) => Number(grade.maxScore) > 0);
      const gradesList = validGrades.map((g: any) => ({
        subject: g.subject?.name || 'Unknown',
        score: this.round((Number(g.grade) / Number(g.maxScore)) * 100),
        total: 100,
        recordedScore: Number(g.grade),
        recordedMaximum: Number(g.maxScore),
        date: g.createdAt,
      }));

      const classIds = student.enrollments.map((enrollment: any) => enrollment.classId);
      const upcomingAssignments = classIds.length > 0 ? await this.prisma.assignment.findMany({
        where: {
          dueDate: { gte: new Date() },
          OR: [
            { classId: { in: classIds } },
            { classId: null, subject: { classId: { in: classIds } } },
          ],
        },
        include: { subject: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }) : [];
      const submissions = upcomingAssignments.length > 0 ? await this.prisma.submission.findMany({
        where: { studentId: student.id, assignmentId: { in: upcomingAssignments.map((assignment) => assignment.id) } },
        select: { assignmentId: true },
      }) : [];
      const submittedIds = new Set(submissions.map((submission) => submission.assignmentId));

      return {
        id: student.id,
        name: student.name || [student.firstName, student.lastName].filter(Boolean).join(' ') || 'طالب',
        className: student.enrollments.map((enrollment: any) => enrollment.class.name).filter(Boolean).join('، ') || null,
        averageGrade: validGrades.length > 0
          ? this.round(validGrades.reduce((sum: number, grade: any) => sum + (Number(grade.grade) / Number(grade.maxScore)) * 100, 0) / validGrades.length)
          : null,
        gradeRecordCount: validGrades.length,
        attendanceRate,
        attendanceRecordCount: attendanceList.length,
        attendance: attendanceList.length > 0 ? {
          present: attendanceList.filter((record: any) => record.status === 'PRESENT').length,
          absent: attendanceList.filter((record: any) => record.status === 'ABSENT').length,
          late: attendanceList.filter((record: any) => record.status === 'LATE').length,
          excused: attendanceList.filter((record: any) => record.status === 'EXCUSED').length,
        } : null,
        attendanceHistory: attendanceList.map((record: any) => ({
          date: record.date,
          status: record.status,
          className: record.class?.name || null,
        })),
        recentGrades: gradesList,
        upcomingAssignments: upcomingAssignments.map((assignment) => ({
          id: assignment.id,
          title: assignment.title,
          subject: assignment.subject.name,
          dueDate: assignment.dueDate,
          submitted: submittedIds.has(assignment.id),
        })),
      };
    }));

    return {
      children: childrenData
    };
  }
}

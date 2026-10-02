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
  };
  attendance: {
    todayPresent: number;
    todayAbsent: number;
    todayLate: number;
    weeklyRate: number;
  };
  assignments: {
    pending: number;
    submitted: number;
    graded: number;
    overdueRate: number;
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
    avgStudentScore: number;
  attendanceRecorded: number | null;
  };
  lastActivity: Date | null;
}

export interface ClassActivity {
  classId: string;
  className: string;
  studentsCount: number;
  avgAttendance: number;
  avgGrade: number;
  assignmentsCompleted: number;
  totalAssignments: number;
  status: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL';
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
      todayAttendance,
      weeklyAttendance,
    ] = await Promise.all([
      this.prisma.user.count({ where: { schoolId, role: 'STUDENT', isActive: true } }),
      this.prisma.user.count({ where: { schoolId, role: 'TEACHER', isActive: true } }),
      this.prisma.class.count({ where: { schoolId } }),
      this.prisma.subject.count({ where: { schoolId } }),
      this.prisma.assignment.count({ where: { schoolId } }),
      this.prisma.user.count({ where: { schoolId, isActive: true } }),
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

    const weeklyPresent = weeklyAttendance.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE',
    ).length;
    const weeklyRate =
      weeklyAttendance.length > 0
        ? Math.round((weeklyPresent / weeklyAttendance.length) * 100)
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
      },
      attendance: {
        todayPresent,
        todayAbsent,
        todayLate,
        weeklyRate,
      },
      assignments: {
        pending: allSubmissions - gradedSubmissions,
        submitted: allSubmissions,
        graded: gradedSubmissions,
        overdueRate:
          overdueAssignments.length > 0
            ? Math.round(
              (overdueAssignments.filter((a) => a._count.submissions === 0)
                .length /
                overdueAssignments.length) *
              100,
            )
            : 0,
      },
    };
  }

  /**
   * Get teacher performance metrics
   */
  async getTeacherPerformance(schoolId: string): Promise<TeacherPerformance[]> {
    const teachers = await this.prisma.user.findMany({
      where: { schoolId, role: 'TEACHER', isActive: true },
      include: {
        taughtClasses: { where: { schoolId } },
        taughtSubjects: {
          where: { schoolId },
          include: {
            grades: true,
          },
        },
        assignments: {
          where: { schoolId },
          include: {
            submissions: true,
          },
        },
      },
    });

    return teachers.map((teacher: any) => {
      const allGrades = teacher.taughtSubjects.flatMap((s: any) => s.grades);
      const avgScore =
        allGrades.length > 0
          ? allGrades.reduce(
            (sum: any, g: any) =>
              sum + (Number(g.grade) / Number(g.maxScore)) * 100,
            0,
          ) / allGrades.length
          : 0;

      const gradedSubmissions = teacher.assignments
        .flatMap((a: any) => a.submissions)
        .filter((s: any) => s.gradedAt);

        return {
          teacherId: teacher.id,
        teacherName:
          teacher.name ||
          `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() ||
          teacher.email,
        stats: {
          classesCount: teacher.taughtClasses.length,
          subjectsCount: teacher.taughtSubjects.length,
          assignmentsCreated: teacher.assignments.length,
          assignmentsGraded: gradedSubmissions.length,
          avgStudentScore: Math.round(avgScore),
          attendanceRecorded: null,
        },
        lastActivity: teacher.updatedAt,
      };
    });
  }

  /**
   * Get class activity report
   */
  async getClassActivity(schoolId: string): Promise<ClassActivity[]> {
    const classes = await this.prisma.class.findMany({
      where: { schoolId },
      include: {
        students: {
          include: {
            student: {
              include: {
                attendance: {
                  where: {
                    date: {
                      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    },
                  },
                },
                studentGrades: true,
                submissions: true,
              },
            },
          },
        },
        subjects: {
          include: { assignments: true },
        },
      },
    });

    return classes.map((classItem: any) => {
      const students = classItem.students.map((e: any) => e.student);

      // Calculate average attendance
      const allAttendance = students.flatMap((s: any) => s.attendance);
      const presentCount = allAttendance.filter(
        (a: any) => a.status === 'PRESENT' || a.status === 'LATE',
      ).length;
      const avgAttendance =
        allAttendance.length > 0
          ? Math.round((presentCount / allAttendance.length) * 100)
          : 0;

      // Calculate average grade
      const allGrades = students.flatMap((s: any) => s.studentGrades || []);
      const avgGrade =
        allGrades.length > 0
          ? Math.round(
            allGrades.reduce(
              (sum: any, g: any) =>
                sum + (Number(g.grade) / Number(g.maxScore)) * 100,
              0,
            ) / allGrades.length,
          )
          : 0;

      // Calculate assignments completion
      const totalAssignments = classItem.subjects.reduce(
        (sum: any, s: any) => sum + (s.assignments?.length || 0),
        0,
      );
      const assignmentsCompleted = students.reduce(
        (sum: any, s: any) => sum + (s.submissions?.length || 0),
        0,
      );

      // Determine status
      let status: ClassActivity['status'] = 'GOOD';
      if (avgAttendance < 60 || avgGrade < 50) status = 'CRITICAL';
      else if (avgAttendance < 75 || avgGrade < 60) status = 'NEEDS_ATTENTION';
      else if (avgAttendance >= 90 && avgGrade >= 80) status = 'EXCELLENT';

      return {
        classId: classItem.id,
        className: classItem.name,
        studentsCount: students.length,
        avgAttendance,
        avgGrade,
        assignmentsCompleted,
        totalAssignments: totalAssignments * students.length,
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
        createdAt: { gte: lastYear },
      },
      select: { amount: true, createdAt: true },
    });

    // Group by month
    const monthlyData: Record<string, number> = {};
    invoices.forEach((inv) => {
      const month = inv.createdAt.toLocaleString('default', { month: 'short' });
      monthlyData[month] = (monthlyData[month] || 0) + Number(inv.amount);
    });

    return Object.entries(monthlyData).map(([name, total]) => ({
      name,
      total,
    }));
  }

  async getEnrollmentStats(schoolId: string) {
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);

    const students = await this.prisma.user.findMany({
      where: {
        role: 'STUDENT',
        schoolId,
        createdAt: { gte: lastYear },
      },
      select: { createdAt: true },
    });

    const monthlyData: Record<string, number> = {};
    students.forEach((s) => {
      const month = s.createdAt.toLocaleString('default', { month: 'short' });
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });

    return Object.entries(monthlyData).map(([name, students]) => ({
      name,
      students,
    }));
  }
}

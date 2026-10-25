import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) { }

  async getOverview(schoolId: string) {
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    const [
      totalUsers,
      students,
      teachers,
      parents,
      totalClasses,
      totalSubjects,
      totalEnrollments,
      recentUsers,
    ] = await Promise.all([
      this.prisma.user.count({ where: { schoolId, isActive: true } }),
      this.prisma.user.count({ where: { schoolId, role: 'STUDENT', isActive: true } }),
      this.prisma.user.count({ where: { schoolId, role: 'TEACHER', isActive: true } }),
      this.prisma.user.count({ where: { schoolId, role: 'PARENT', isActive: true } }),
      this.prisma.class.count({ where: { schoolId } }),
      this.prisma.subject.count({ where: { schoolId } }),
      this.prisma.enrollment.count({ where: { class: { schoolId } } }),
      this.prisma.user.findMany({
        where: { schoolId, isActive: true },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          name: true,
          role: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        students,
        teachers,
        parents,
      },
      classes: {
        total: totalClasses,
      },
      subjects: {
        total: totalSubjects,
      },
      enrollments: {
        total: totalEnrollments,
      },
      recentActivity: recentUsers.map((user) => ({
        type: 'user_created',
        description: `New ${user.role.toLowerCase()} registered: ${user.firstName || user.name || user.email}`,
        timestamp: user.createdAt,
      })),
    };
  }

  async getUserGrowth(schoolId: string, days: number = 30) {
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    const boundedDays = Number.isFinite(days) ? Math.min(Math.max(Math.trunc(days), 1), 365) : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - boundedDays);

    const users = await this.prisma.user.findMany({
      where: {
        schoolId,
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        createdAt: true,
        role: true,
      },
    });

    // Group by date
    const growth: Record<
      string,
      { students: number; teachers: number; total: number }
    > = {};

    users.forEach((user) => {
      const date = user.createdAt.toISOString().split('T')[0];
      if (!growth[date]) {
        growth[date] = { students: 0, teachers: 0, total: 0 };
      }
      growth[date].total++;
      if (user.role === 'STUDENT') growth[date].students++;
      if (user.role === 'TEACHER') growth[date].teachers++;
    });

    return Object.entries(growth).sort(([left], [right]) => left.localeCompare(right)).map(([date, data]) => ({
      date,
      ...data,
    }));
  }
  async getStudentStats(studentId: string) {
    const enrollments = await this.prisma.enrollment.findMany({ where: { studentId }, select: { classId: true } });
    const classIds = [...new Set(enrollments.map((enrollment) => enrollment.classId))];
    const [grades, attendance, assignments] = await Promise.all([
      this.prisma.grade.findMany({ where: { studentId, maxScore: { gt: 0 } }, select: { grade: true, maxScore: true } }),
      this.prisma.attendance.findMany({ where: { studentId }, select: { status: true } }),
      classIds.length
        ? this.prisma.assignment.findMany({
          where: {
            OR: [
              { classId: { in: classIds } },
              { classId: null, subject: { OR: [
                { classId: { in: classIds } },
                { classSubjects: { some: { classId: { in: classIds } } } },
              ] } },
            ],
          },
          select: { id: true },
        })
        : Promise.resolve([]),
    ]);

    // Calculate Average Grade
    const gradesList = grades;
    const averageGrade = gradesList.length > 0
      ? gradesList.reduce((sum, grade) => sum + (Number(grade.grade) / Number(grade.maxScore)) * 100, 0) / gradesList.length
      : null;

    // Calculate Attendance Percentage
    const countedAttendance = attendance.filter((record) => record.status !== 'EXCUSED');
    const attendancePercentage = countedAttendance.length > 0
      ? (countedAttendance.filter(
        (a) => a.status === 'PRESENT' || a.status === 'LATE',
      ).length / countedAttendance.length) * 100
      : null;

    return {
      totalAssignments: assignments.length,
      averageGrade,
      attendancePercentage,
    };
  }

  async getGradeTrends(studentId: string, limit: number = 10) {
    const boundedLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 100) : 10;
    const grades = await this.prisma.grade.findMany({
      where: { studentId, maxScore: { gt: 0 } },
      include: {
        subject: true,
        assignment: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: boundedLimit,
    });

    return grades.reverse().map(g => ({
      date: g.createdAt.toISOString().split('T')[0],
      subject: g.subject?.name || 'Unknown',
      assignmentTitle: g.assignment?.title || 'تقييم مسجل',
      score: Number(g.grade),
      maxScore: Number(g.maxScore),
      percentage: Math.round((Number(g.grade) / Number(g.maxScore)) * 100),
    }));
  }
}

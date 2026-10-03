import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../notifications/email.service';
import {
  EmailTemplates,
  EmailTemplateData,
} from '../notifications/templates/email-templates';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Role } from '@prisma/client';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

@Injectable()
export class ScheduledReportService {
  private readonly logger = new Logger(ScheduledReportService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) { }

  /**
   * Run every Friday at 10:00 AM
   */
  @Cron('0 10 * * 5') // Every Friday at 10 AM
  async handleWeeklyReports() {
    this.logger.log('Started generating weekly reports...');

    // Get all students with their parents
    const students = await this.prisma.user.findMany({
      where: { role: 'STUDENT', isActive: true, schoolId: { not: null } },
      include: {
        parents: {
          include: {
            parent: true,
          },
        },
        enrollments: {
          include: {
            class: true,
          },
        },
      },
    });

    let sentCount = 0;

    for (const student of students) {
      if (!student.parents.length) continue;

      try {
        const reportData = await this.generateStudentStats(student.id);

        const gradeSummary = reportData.grades.length
          ? reportData.grades.map((grade) => `${grade.name} (${grade.subject}): ${grade.score}/${grade.max}`).join('، ')
          : 'لا توجد درجات مسجلة خلال هذه الفترة.';
        const weeklySummary = `السجلات المسجلة هذا الأسبوع: حضور ${reportData.attendance.present}، غياب ${reportData.attendance.absent}، تأخير ${reportData.attendance.late}؛ واجبات مستحقة غير مسلمة: ${reportData.pendingAssignments}. الدرجات: ${gradeSummary}`;

        // Send to each parent
        for (const relation of student.parents) {
          if (relation.parent.email) {
            const emailData: EmailTemplateData = {
              studentName: student.name || student.firstName || '',
              parentName:
                relation.parent.name || relation.parent.firstName || '',
              date: new Date().toLocaleDateString('ar-EG'),
              attendanceStats: reportData.attendance,
              recentGrades: reportData.grades,
              assignmentsPending: reportData.pendingAssignments,
              weeklySummary,
            };

            await this.emailService.sendEmail({
              to: relation.parent.email,
              subject: `التقرير الأسبوعي للطالب ${student.name}`,
              html: EmailTemplates.weeklyReport(emailData),
            });

            sentCount++;
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to send report for student ${student.id}`,
          error,
        );
      }
    }

    this.logger.log(`Weekly reports job finished. Sent ${sentCount} emails.`);
  }

  /**
   * Run every day at 5:00 PM for Principal/VP Executive Report
   */
  @Cron('0 17 * * *')
  async handleDailyExecutiveReport() {
    this.logger.log('Generating Daily Executive Report for Principals and VPs...');
    const schools = await this.prisma.school.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const school of schools) {
      const schoolName = escapeHtml(school.name);
      const [executives, activeTeachers, students, todayAttendance] = await Promise.all([
        this.prisma.user.findMany({
          where: {
            schoolId: school.id,
            role: { in: [Role.PRINCIPAL, Role.VICE_PRINCIPAL] },
            isActive: true,
          },
          select: { id: true, email: true, name: true, firstName: true },
        }),
        this.prisma.user.count({ where: { schoolId: school.id, role: Role.TEACHER, isActive: true } }),
        this.prisma.user.count({ where: { schoolId: school.id, role: Role.STUDENT, isActive: true } }),
        this.prisma.attendance.count({
          where: { date: { gte: today }, class: { schoolId: school.id } },
        }),
      ]);

      for (const exec of executives) {
        if (!exec.email) continue;
        await this.emailService.sendEmail({
          to: exec.email,
          subject: `التقرير اليومي المجمع - ${school.name}`,
          html: `<div dir="rtl">
            <h2>التقرير الإحصائي اليومي - ${schoolName}</h2>
            <p>إجمالي المعلمين النشطين: ${activeTeachers}</p>
            <p>إجمالي الطلاب النشطين: ${students}</p>
            <p>سجلات الحضور المسجلة اليوم للطلاب: ${todayAttendance}</p>
            <hr/>
            <p>تم استخراج هذا التقرير تلقائياً بواسطة نظام نكسس.</p>
          </div>`
        });
      }
    }
  }

  /**
   * Aggregate statistics for the last 7 days
   */
  private async generateStudentStats(studentId: string) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // 1. Attendance
    const attendance = await this.prisma.attendance.findMany({
      where: {
        studentId,
        date: { gte: oneWeekAgo },
      },
    });

    const attendanceStats = {
      present: attendance.filter((a) => a.status === 'PRESENT').length,
      absent: attendance.filter((a) => a.status === 'ABSENT').length,
      late: attendance.filter((a) => a.status === 'LATE').length,
    };

    // 2. Recent Grades
    // 2. Recent Grades (from Submissions)
    const recentSubmissions = await this.prisma.submission.findMany({
      where: {
        studentId,
        gradedAt: { gte: oneWeekAgo },
        grade: { not: null },
      },
      include: {
        assignment: {
          include: { subject: true },
        },
      },
      take: 5,
      orderBy: { gradedAt: 'desc' },
    });

    const grades = recentSubmissions.map((s) => ({
      subject: s.assignment.subject?.name || 'Unknown Subject',
      score: Number(s.grade) || 0,
      max: Number(s.assignment.maxScore) || 100,
      name: s.assignment.title,
    }));

    // Count only assignments for the student's enrolled classes that have no submission.
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId },
      select: { classId: true },
    });
    const pendingAssignments = await this.prisma.assignment.count({
      where: {
        classId: { in: enrollments.map((enrollment) => enrollment.classId) },
        dueDate: { gte: new Date() },
        submissions: { none: { studentId } },
      },
    });

    return {
      attendance: attendanceStats,
      grades,
      pendingAssignments,
    };
  }
}

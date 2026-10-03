import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmailService } from './email.service';
import { EventsGateway } from '../gateway/events.gateway';
import { EmailTemplates, EmailTemplateData } from './templates/email-templates';

export type NotificationType =
  | 'STUDENT_ABSENT'
  | 'EXAM_REMINDER'
  | 'ASSIGNMENT_LATE'
  | 'GRADE_POSTED'
  | 'LOW_ATTENDANCE'
  | 'PARENT_REPORT'
  | 'ANNOUNCEMENT'
  | 'HOMEWORK_COMPLETED'
  | 'HOMEWORK_MISSING'
  | 'MISSED_PREP';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  priority: NotificationPriority;
  recipientId: string;
  recipientType: 'STUDENT' | 'PARENT' | 'TEACHER' | 'ADMIN';
  relatedId?: string; // e.g., assignmentId, studentId
  actionUrl?: string;
  expiresAt?: Date;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

import { WhatsAppService } from './whatsapp.service';

@Injectable()
export class SmartNotificationService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private whatsAppService: WhatsAppService,
    @Optional() private eventsGateway: EventsGateway,
  ) {}

  /**
   * Notify parent about student absence
   */
  async notifyStudentAbsence(
    studentId: string,
    date: Date,
  ): Promise<NotificationResult[]> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        parents: {
          include: {
            parent: true,
          },
        },
      },
    });

    if (!student) return [{ success: false, error: 'Student not found' }];

    const results: NotificationResult[] = [];
    const formattedDate = date.toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    for (const parentRelation of student.parents) {
      const payload: NotificationPayload = {
        type: 'STUDENT_ABSENT',
        title: 'Absence Notification',
        titleAr: 'إشعار غياب',
        body: `${student.name || student.firstName} was absent on ${date.toLocaleDateString()}`,
        bodyAr: `تم تسجيل غياب الطالب/ة ${student.name || student.firstName} يوم ${formattedDate}`,
        priority: 'HIGH',
        recipientId: parentRelation.parentId,
        recipientType: 'PARENT',
        relatedId: studentId,
        actionUrl: `/parent/attendance/${studentId}`,
      };

      const result = await this.sendNotification(payload);
      results.push(result);

      // Send email notification
      const parentUser = await this.prisma.user.findUnique({
        where: { id: parentRelation.parentId },
      });

      if (parentUser?.email) {
        const emailData: EmailTemplateData = {
          studentName: student.name || student.firstName || '',
          parentName: parentUser.name || parentUser.firstName || '',
          className: 'الصف الدراسي', // TODO: get from student enrollment
          date: formattedDate,
        };

        await this.emailService.sendEmail({
          to: parentUser.email,
          subject: payload.titleAr,
          html: EmailTemplates.absenceNotification(emailData),
        });
      }
    }

    return results;
  }

  /**
   * Remind student about upcoming exam
   */
  async notifyExamReminder(
    studentId: string,
    examTitle: string,
    examDate: Date,
    subjectName: string,
  ): Promise<NotificationResult> {
    const formattedDate = examDate.toLocaleDateString('ar-EG', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = examDate.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const payload: NotificationPayload = {
      type: 'EXAM_REMINDER',
      title: 'Exam Reminder',
      titleAr: 'تذكير بالامتحان',
      body: `Reminder: ${examTitle} exam tomorrow at ${formattedTime}`,
      bodyAr: `تذكير: امتحان ${examTitle} في مادة ${subjectName} يوم ${formattedDate} الساعة ${formattedTime}`,
      priority: 'HIGH',
      recipientId: studentId,
      recipientType: 'STUDENT',
      actionUrl: '/student/exams',
    };

    const result = await this.sendNotification(payload);

    // Send email reminder
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });

    if (student?.email) {
      const emailData: EmailTemplateData = {
        studentName: student.name || student.firstName || '',
        subjectName,
        examTitle,
        date: formattedDate,
      };

      await this.emailService.sendEmail({
        to: student.email,
        subject: payload.titleAr,
        html: EmailTemplates.examReminder(emailData),
      });
    }

    return result;
  }

  /**
   * Notify about late assignment
   */
  async notifyLateAssignment(
    studentId: string,
    assignmentTitle: string,
    assignmentId: string,
    daysLate: number,
  ): Promise<NotificationResult[]> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        parents: {
          include: { parent: true },
        },
      },
    });

    if (!student) return [{ success: false, error: 'Student not found' }];

    const results: NotificationResult[] = [];

    // Notify student
    const studentPayload: NotificationPayload = {
      type: 'ASSIGNMENT_LATE',
      title: 'Late Assignment',
      titleAr: 'واجب متأخر',
      body: `Your assignment "${assignmentTitle}" is ${daysLate} days late`,
      bodyAr: `الواجب "${assignmentTitle}" متأخر ${daysLate} ${daysLate === 1 ? 'يوم' : 'أيام'}. يرجى التسليم فوراً.`,
      priority: daysLate > 3 ? 'URGENT' : 'HIGH',
      recipientId: studentId,
      recipientType: 'STUDENT',
      relatedId: assignmentId,
      actionUrl: `/student/assignments/${assignmentId}`,
    };
    results.push(await this.sendNotification(studentPayload));

    // Notify parents if more than 2 days late
    if (daysLate >= 2) {
      for (const parentRelation of student.parents) {
        const parentPayload: NotificationPayload = {
          type: 'ASSIGNMENT_LATE',
          title: 'Late Assignment Alert',
          titleAr: 'تنبيه واجب متأخر',
          body: `${student.name}'s assignment "${assignmentTitle}" is ${daysLate} days late`,
          bodyAr: `واجب ${student.name || student.firstName} "${assignmentTitle}" متأخر ${daysLate} أيام. يرجى المتابعة.`,
          priority: 'HIGH',
          recipientId: parentRelation.parentId,
          recipientType: 'PARENT',
          relatedId: assignmentId,
        };
        results.push(await this.sendNotification(parentPayload));
      }
    }

    return results;
  }

  /**
   * Notify about new grade
   */
  async notifyGradePosted(
    studentId: string,
    subjectName: string,
    score: number,
    maxScore: number,
    assignmentTitle?: string,
  ): Promise<NotificationResult[]> {
    const percentage = Math.round((score / maxScore) * 100);
    const results: NotificationResult[] = [];

    // Notify student
    const studentPayload: NotificationPayload = {
      type: 'GRADE_POSTED',
      title: 'New Grade',
      titleAr: 'درجة جديدة',
      body: `You got ${score}/${maxScore} (${percentage}%) in ${subjectName}`,
      bodyAr: `حصلت على ${score}/${maxScore} (${percentage}%) في ${assignmentTitle ? `"${assignmentTitle}" - ` : ''}${subjectName}`,
      priority: percentage < 50 ? 'HIGH' : 'MEDIUM',
      recipientId: studentId,
      recipientType: 'STUDENT',
      actionUrl: '/student/grades',
    };
    results.push(await this.sendNotification(studentPayload));

    // Send grade email to student
    const studentUser = await this.prisma.user.findUnique({
      where: { id: studentId },
    });

    if (studentUser?.email) {
      const emailData: EmailTemplateData = {
        studentName: studentUser.name || studentUser.firstName || '',
        subjectName,
        assignmentTitle,
        grade: score,
        date: new Date().toLocaleDateString('ar-EG'),
      };

      await this.emailService.sendEmail({
        to: studentUser.email,
        subject: studentPayload.titleAr,
        html: EmailTemplates.gradeNotification(emailData),
      });
    }

    // Notify parents for low grades
    if (percentage < 60) {
      const student = await this.prisma.user.findUnique({
        where: { id: studentId },
        include: {
          parents: { include: { parent: true } },
        },
      });

      if (student) {
        for (const parentRelation of student.parents) {
          const parentPayload: NotificationPayload = {
            type: 'GRADE_POSTED',
            title: 'Grade Alert',
            titleAr: 'تنبيه درجة',
            body: `${student.name} got ${percentage}% in ${subjectName}`,
            bodyAr: `حصل ${student.name || student.firstName} على ${percentage}% في ${subjectName}. قد يحتاج لمتابعة.`,
            priority: 'HIGH',
            recipientId: parentRelation.parentId,
            recipientType: 'PARENT',
          };
          results.push(await this.sendNotification(parentPayload));

          // Send email to parent
          const parentUser = await this.prisma.user.findUnique({
            where: { id: parentRelation.parentId },
          });

          if (parentUser?.email) {
            const emailData: EmailTemplateData = {
              studentName: student.name || student.firstName || '',
              parentName: parentUser.name || parentUser.firstName || '',
              subjectName: 'المادة الدراسية', // TODO
              assignmentTitle,
              dueDate: 'الموعد المحدد', // TODO
            };

            await this.emailService.sendEmail({
              to: parentUser.email,
              subject: parentPayload.titleAr,
              html: EmailTemplates.lateAssignment(emailData),
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Notify parent homework completed (Green Alert)
   */
  async notifyHomeworkCompleted(studentId: string, assignmentTitle: string): Promise<NotificationResult[]> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: { parents: { include: { parent: true } } },
    });
    if (!student) return [];
    
    const results: NotificationResult[] = [];
    for (const relation of student.parents) {
      results.push(await this.sendNotification({
        type: 'HOMEWORK_COMPLETED',
        title: 'Homework Completed',
        titleAr: 'إنجاز رائع ✅',
        body: `Your child has completed the assignment ${assignmentTitle}`,
        bodyAr: `قام ابنك/ابنتك (${student.name || student.firstName}) بإنجاز الواجب الموكل إليه: ${assignmentTitle} بنجاح.`,
        priority: 'MEDIUM',
        recipientId: relation.parentId,
        recipientType: 'PARENT',
      }));
    }
    return results;
  }

  /**
   * Notify parent missed homework (12:00 AM Alert)
   */
  async notifyMissingHomework(studentId: string, assignmentTitle: string): Promise<NotificationResult[]> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: { parents: { include: { parent: true } } },
    });
    if (!student) return [];
    
    const results: NotificationResult[] = [];
    for (const relation of student.parents) {
      results.push(await this.sendNotification({
        type: 'HOMEWORK_MISSING',
        title: 'Missing Homework',
        titleAr: 'تنبيه تأخير واجب ❌',
        body: `Your child missed the deadline for ${assignmentTitle}`,
        bodyAr: `انتهى اليوم ولم يقم ابنك/ابنتك (${student.name || student.firstName}) بتسليم الواجب: ${assignmentTitle}. يرجى المتابعة.`,
        priority: 'HIGH',
        recipientId: relation.parentId,
        recipientType: 'PARENT',
      }));
    }
    return results;
  }

  /**
   * Notify teacher missed prep
   */
  async notifyTeacherMissedPrep(teacherId: string, className: string): Promise<NotificationResult> {
    return await this.sendNotification({
      type: 'MISSED_PREP',
      title: 'Missed Lesson Prep',
      titleAr: 'تنبيه: عدم تجهيز وتحضير حصة ⚠️',
      body: `You have not prepared the lesson for ${className} today.`,
      bodyAr: `عزيزي المعلم، لم تقم بتحضير الدرس الخاص بصف ${className} لهذا اليوم. يرجى تدارك الأمر وإضافة التحضير في منصة المعلم.`,
      priority: 'HIGH',
      recipientId: teacherId,
      recipientType: 'TEACHER',
    });
  }

  /**
   * Check and notify late assignments (cron job compatible)
   */
  async checkLateAssignments(): Promise<{
    processed: number;
    notified: number;
  }> {
    const now = new Date();

    // Find assignments with due dates in the past
    const lateAssignments = await this.prisma.assignment.findMany({
      where: {
        dueDate: { lt: now },
      },
      include: { submissions: true },
    });

    const classIds = [...new Set(lateAssignments
      .map((assignment) => assignment.classId)
      .filter((classId): classId is string => Boolean(classId)))];
    const enrollments = classIds.length
      ? await this.prisma.enrollment.findMany({
          where: { classId: { in: classIds } },
          select: { classId: true, studentId: true },
        })
      : [];
    const studentsByClass = new Map<string, string[]>();
    for (const enrollment of enrollments) {
      const students = studentsByClass.get(enrollment.classId) ?? [];
      students.push(enrollment.studentId);
      studentsByClass.set(enrollment.classId, students);
    }

    let notified = 0;

    for (const assignment of lateAssignments) {
      if (!assignment.classId) continue;

      const daysLate = Math.floor(
        (now.getTime() - (assignment.dueDate?.getTime() || 0)) /
        (1000 * 60 * 60 * 24),
      );

      // Get students who haven't submitted
      const submittedStudentIds = assignment.submissions.map((submission) => submission.studentId);
      const students = (studentsByClass.get(assignment.classId) ?? [])
        .filter((studentId) => !submittedStudentIds.includes(studentId));

      for (const studentId of students) {
        await this.notifyLateAssignment(
          studentId,
          assignment.title,
          assignment.id,
          daysLate,
        );
        notified++;
      }
    }

    return { processed: lateAssignments.length, notified };
  }

  /**
   * Core notification sender (can be extended for push, email, etc.)
   */
  private async sendNotification(
    payload: NotificationPayload,
  ): Promise<NotificationResult> {
    try {
      // For now, we'll store in-app notifications
      // Later: integrate with Firebase FCM, OneSignal, or email service

      let prismaType: any = 'INFO';
      if (payload.type === 'STUDENT_ABSENT' || payload.type === 'ASSIGNMENT_LATE' || payload.type === 'LOW_ATTENDANCE' || payload.type === 'HOMEWORK_MISSING' || payload.type === 'MISSED_PREP') prismaType = 'WARNING';
      if (payload.type === 'EXAM_REMINDER') prismaType = 'REMINDER';
      if (payload.type === 'GRADE_POSTED') prismaType = 'GRADE';
      if (payload.type === 'HOMEWORK_COMPLETED') prismaType = 'SUCCESS';

      const notification = await this.prisma.notification.create({
        data: {
          type: prismaType,
          title: payload.titleAr,
          body: payload.bodyAr,
          userId: payload.recipientId,
          data: payload.actionUrl ? JSON.stringify({ actionUrl: payload.actionUrl }) : null,
          isRead: false,
        },
      });

      console.log(
        `[Notification] ${payload.type} to ${payload.recipientType}:${payload.recipientId}`,
      );
      console.log(`  Title: ${payload.titleAr}`);
      console.log(`  Body: ${payload.bodyAr}`);

      // Send WhatsApp if enabled and user has phone
      if (process.env.TWILIO_AUTH_TOKEN) {
        const user = await this.prisma.user.findUnique({
          where: { id: payload.recipientId },
          select: { phone: true, name: true },
        });

        if (user?.phone) {
          await this.whatsAppService.sendWhatsApp(
            user.phone,
            `*${payload.titleAr}*\n\n${payload.bodyAr}\n\n${payload.actionUrl ? `الرابط: ${process.env.CORS_ORIGIN}${payload.actionUrl}` : ''}`,
          );
        }
      }

      // Push real-time notification via WebSocket
      this.eventsGateway?.emitNotification(payload.recipientId, {
        id: notification.id,
        title: payload.titleAr,
        body: payload.bodyAr,
        type: notification.type,
        isRead: false,
        createdAt: notification.createdAt,
        actionUrl: payload.actionUrl,
      });

      return {
        success: true,
        notificationId: notification.id,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to send notification',
      };
    }
  }

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}

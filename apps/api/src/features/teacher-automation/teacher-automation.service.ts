import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

const OPERATORS = new Set(['gte', 'gt', 'lte', 'lt']);

@Injectable()
export class TeacherAutomationService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyRules(teacherId: string) {
    return this.prisma.automationRule.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { logs: true } } },
    });
  }

  async createRule(teacherId: string, data: any) {
    const name = this.text(data.name, 2, 120, 'اسم القاعدة');
    const triggerType = ['ABSENCE', 'LOW_GRADE', 'BEHAVIOR'].includes(data.triggerType) ? data.triggerType : null;
    if (!triggerType) throw new BadRequestException('نوع المحفز غير مدعوم');
    const threshold = Number(data.condition?.threshold);
    const defaultOperator = triggerType === 'ABSENCE' ? 'gte' : 'lte';
    const operator = data.condition?.operator || defaultOperator;
    const max = triggerType === 'ABSENCE' ? 60 : 100;
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > max || !OPERATORS.has(operator)) {
      throw new BadRequestException('قيمة شرط القاعدة غير صالحة');
    }
    const recipient = ['STUDENT', 'PARENT', 'BOTH'].includes(data.actionData?.recipient) ? data.actionData.recipient : 'BOTH';
    const message = this.text(data.actionData?.message || 'تنبيه من المدرسة بخصوص {{metric}}', 2, 500, 'رسالة الإجراء');
    return this.prisma.automationRule.create({
      data: {
        teacherId,
        name,
        triggerType,
        condition: { operator, threshold, periodDays: triggerType === 'ABSENCE' ? Math.max(1, Math.min(90, Number(data.condition?.periodDays) || 7)) : 0 } as Prisma.InputJsonValue,
        actionType: 'NOTIFY',
        actionData: { recipient, message } as Prisma.InputJsonValue,
        isActive: data.isActive !== false,
      },
    });
  }

  async toggleRule(teacherId: string, ruleId: string) {
    const rule = await this.findRule(teacherId, ruleId);
    return this.prisma.automationRule.update({ where: { id: ruleId }, data: { isActive: !rule.isActive } });
  }

  async deleteRule(teacherId: string, ruleId: string) {
    await this.findRule(teacherId, ruleId);
    return this.prisma.automationRule.delete({ where: { id: ruleId } });
  }

  async getRuleLogs(teacherId: string, ruleId: string) {
    await this.findRule(teacherId, ruleId);
    return this.prisma.automationLog.findMany({ where: { ruleId }, orderBy: { executedAt: 'desc' }, take: 100 });
  }

  async runTeacherRules(teacherId: string) {
    const rules = await this.prisma.automationRule.findMany({ where: { teacherId, isActive: true } });
    let notificationsCreated = 0;
    for (const rule of rules) notificationsCreated += await this.evaluateRule(rule);
    return { rulesEvaluated: rules.length, notificationsCreated };
  }

  @Cron('*/15 * * * *')
  async runScheduledRules() {
    if (process.env.VERCEL === '1') return;
    const teachers = await this.prisma.automationRule.findMany({ where: { isActive: true }, select: { teacherId: true }, distinct: ['teacherId'] });
    for (const { teacherId } of teachers) await this.runTeacherRules(teacherId);
  }

  async runAllActiveRules() {
    const teachers = await this.prisma.automationRule.findMany({ where: { isActive: true }, select: { teacherId: true }, distinct: ['teacherId'] });
    let rulesEvaluated = 0;
    let notificationsCreated = 0;
    for (const { teacherId } of teachers) {
      const result = await this.runTeacherRules(teacherId);
      rulesEvaluated += result.rulesEvaluated;
      notificationsCreated += result.notificationsCreated;
    }
    return { rulesEvaluated, notificationsCreated };
  }

  private async evaluateRule(rule: any) {
    const teacher = await this.prisma.user.findFirst({
      where: { id: rule.teacherId, isActive: true, role: 'TEACHER', schoolId: { not: null } },
      select: { id: true, schoolId: true },
    });
    if (!teacher?.schoolId) return 0;
    const classes = await this.prisma.class.findMany({
      where: { schoolId: teacher.schoolId, OR: [{ teacherId: teacher.id }, { classSubjects: { some: { teacherId: teacher.id } } }] },
      select: { id: true, students: { select: { studentId: true } }, subjects: { select: { id: true } } },
    });
    const studentIds = [...new Set(classes.flatMap((item) => item.students.map((enrollment) => enrollment.studentId)))];
    const classIds = classes.map((item) => item.id);
    const subjectIds = [...new Set(classes.flatMap((item) => item.subjects.map((subject) => subject.id)))];
    if (!studentIds.length) return 0;

    const condition = rule.condition as { operator?: string; threshold?: number; periodDays?: number };
    const threshold = Number(condition?.threshold);
    if (!Number.isFinite(threshold)) return 0;
    const metricByStudent = new Map<string, number>();
    if (rule.triggerType === 'ABSENCE') {
      const periodDays = Math.max(1, Math.min(90, Number(condition.periodDays) || 7));
      const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
      const rows = await this.prisma.attendance.groupBy({
        by: ['studentId'],
        where: { classId: { in: classIds }, studentId: { in: studentIds }, status: 'ABSENT', date: { gte: since } },
        _count: { studentId: true },
      });
      for (const row of rows) metricByStudent.set(row.studentId, row._count.studentId);
    } else if (rule.triggerType === 'LOW_GRADE') {
      const rows = await this.prisma.grade.findMany({
        where: { studentId: { in: studentIds }, subjectId: { in: subjectIds } },
        select: { studentId: true, score: true, maxScore: true },
      });
      const aggregates = new Map<string, { score: number; max: number }>();
      for (const row of rows) {
        const previous = aggregates.get(row.studentId) || { score: 0, max: 0 };
        aggregates.set(row.studentId, { score: previous.score + row.score, max: previous.max + row.maxScore });
      }
      for (const [studentId, value] of aggregates) metricByStudent.set(studentId, value.max > 0 ? (value.score / value.max) * 100 : 0);
    } else if (rule.triggerType === 'BEHAVIOR') {
      const students = await this.prisma.user.findMany({ where: { id: { in: studentIds }, behaviorScore: { not: null } }, select: { id: true, behaviorScore: true } });
      for (const student of students) metricByStudent.set(student.id, student.behaviorScore ?? 0);
    }

    const operator = condition.operator || (rule.triggerType === 'ABSENCE' ? 'gte' : 'lte');
    const action = rule.actionData as { recipient?: string; message?: string };
    const title = rule.triggerType === 'ABSENCE' ? 'تنبيه غياب' : rule.triggerType === 'LOW_GRADE' ? 'تنبيه مستوى دراسي' : 'تنبيه سلوكي';
    let notificationsCreated = 0;
    for (const studentId of studentIds) {
      const metric = metricByStudent.get(studentId);
      if (metric === undefined || !this.matches(metric, operator, threshold)) continue;
      const eventKey = `${rule.id}:${studentId}:${new Date().toISOString().slice(0, 10)}`;
      const student = await this.prisma.user.findUnique({ where: { id: studentId }, select: { name: true } });
      const parents = action.recipient === 'STUDENT'
        ? []
        : await this.prisma.parentStudent.findMany({ where: { studentId, parent: { schoolId: teacher.schoolId, isActive: true } }, select: { parentId: true } });
      const recipients = new Set<string>(action.recipient === 'PARENT' ? [] : [studentId]);
      for (const parent of parents) recipients.add(parent.parentId);
      if (recipients.size === 0) continue;
      const formattedMetric = rule.triggerType === 'ABSENCE' ? `${metric} يوم غياب` : `${metric.toFixed(1)}%`;
      const body = String(action.message || 'تنبيه بخصوص {{metric}}')
        .replaceAll('{{studentName}}', student?.name || 'الطالب')
        .replaceAll('{{metric}}', formattedMetric);
      try {
        const created = await this.prisma.$transaction(async (tx) => {
          const alreadyRun = await tx.automationLog.findUnique({ where: { eventKey } });
          if (alreadyRun) return 0;
          for (const userId of recipients) {
            await tx.notification.create({ data: { userId, title, body, type: 'WARNING', data: JSON.stringify({ ruleId: rule.id, studentId, metric }) } });
          }
          await tx.automationLog.create({ data: { ruleId: rule.id, targetId: studentId, status: 'SUCCESS', eventKey, details: { metric, threshold, recipients: recipients.size } } });
          return recipients.size;
        });
        notificationsCreated += created;
      } catch (error: any) {
        if (error?.code !== 'P2002') {
          await this.prisma.automationLog.create({
            data: { ruleId: rule.id, targetId: studentId, status: 'FAILED', details: { message: 'تعذر إنشاء تنبيه القاعدة' } },
          }).catch(() => undefined);
        }
      }
    }
    await this.prisma.automationRule.update({ where: { id: rule.id }, data: { lastRunAt: new Date() } });
    return notificationsCreated;
  }

  private async findRule(teacherId: string, ruleId: string) {
    const rule = await this.prisma.automationRule.findUnique({ where: { id: ruleId } });
    if (!rule || rule.teacherId !== teacherId) throw new NotFoundException('القاعدة غير موجودة');
    return rule;
  }

  private matches(actual: number, operator: string, threshold: number) {
    if (operator === 'gt') return actual > threshold;
    if (operator === 'lt') return actual < threshold;
    if (operator === 'lte') return actual <= threshold;
    return actual >= threshold;
  }

  private text(value: unknown, min: number, max: number, label: string) {
    if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new BadRequestException(`${label} غير صالح`);
    return value.trim();
  }
}

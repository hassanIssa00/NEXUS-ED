import { BadRequestException, Controller, Post, Body, Get, UseGuards, Request, Param, ForbiddenException, Headers, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SmartNotificationService } from './smart-notification.service';
import { PrismaService } from '../prisma.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { timingSafeEqual } from 'node:crypto';

@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth()
export class NotificationController {
  constructor(
    private readonly notificationService: SmartNotificationService,
    private readonly prisma: PrismaService,
  ) {}


  @Post('absence')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Send absence notification to parents' })
  @ApiResponse({ status: 200, description: 'Notification sent successfully' })
  async notifyAbsence(@Request() req: any, @Body() body: { studentId: string; date: string }) {
    const date = new Date(body.date);
    if (!body.studentId || !body.date || !Number.isFinite(date.getTime())) throw new BadRequestException('A valid student and attendance date are required');
    const start = new Date(date); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
    const schoolId = this.requireSchool(req.user);
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        studentId: body.studentId, status: 'ABSENT', date: { gte: start, lt: end },
        class: { schoolId, ...(req.user.role === Role.TEACHER ? { OR: [{ teacherId: this.actorId(req.user) }, { classSubjects: { some: { teacherId: this.actorId(req.user) } } }] } : {}) },
      },
      select: { classId: true },
    });
    if (!attendance) throw new ForbiddenException('No matching absence record exists in your school scope');
    return this.notificationService.notifyStudentAbsence(
      body.studentId,
      start,
    );
  }

  @Post('exam-reminder')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Send exam reminder to student' })
  async notifyExamReminder(
    @Request() req: any,
    @Body()
    body: {
      studentId: string; quizId: string;
    },
  ) {
    if (!body.studentId || !body.quizId) throw new BadRequestException('A student and published quiz are required');
    const schoolId = this.requireSchool(req.user);
    const quiz = await this.prisma.teacherQuiz.findFirst({
      where: { id: body.quizId, schoolId, published: true, class: { students: { some: { studentId: body.studentId } } } },
      include: { subject: { select: { name: true } }, class: { select: { teacherId: true, classSubjects: { select: { teacherId: true } } } } },
    });
    if (!quiz || (req.user.role === Role.TEACHER && quiz.teacherId !== this.actorId(req.user) && !quiz.class.classSubjects.some((entry) => entry.teacherId === this.actorId(req.user)))) {
      throw new ForbiddenException('The published assessment is outside your assigned school classes');
    }
    return this.notificationService.notifyExamReminder(
      body.studentId,
      quiz.title,
      quiz.dueAt ?? new Date(),
      quiz.subject.name,
    );
  }

  @Post('late-assignment')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Notify about late assignment' })
  async notifyLateAssignment(
    @Request() req: any,
    @Body()
    body: {
      studentId: string;
      assignmentId: string;
    },
  ) {
    if (!body.studentId || !body.assignmentId) throw new BadRequestException('A student and assignment are required');
    const schoolId = this.requireSchool(req.user);
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: body.assignmentId, schoolId, dueDate: { lt: new Date() } },
      include: { submissions: { where: { studentId: body.studentId }, select: { id: true } } },
    });
    if (!assignment || !assignment.dueDate || !assignment.classId) {
      throw new ForbiddenException('The assignment is outside your assigned school classes');
    }
    const [schoolClass, enrollment] = await Promise.all([
      this.prisma.class.findFirst({
        where: { id: assignment.classId, schoolId },
        select: { teacherId: true, classSubjects: { select: { teacherId: true } } },
      }),
      this.prisma.enrollment.findFirst({
        where: { classId: assignment.classId, studentId: body.studentId },
        select: { id: true },
      }),
    ]);
    if (!schoolClass || !enrollment || (req.user.role === Role.TEACHER && assignment.teacherId !== this.actorId(req.user) && schoolClass.teacherId !== this.actorId(req.user) && !schoolClass.classSubjects.some((entry) => entry.teacherId === this.actorId(req.user)))) {
      throw new ForbiddenException('The assignment is outside your assigned school classes');
    }
    if (assignment.submissions.length) throw new BadRequestException('The student has already submitted this assignment');
    const daysLate = Math.max(0, Math.floor((Date.now() - assignment.dueDate.getTime()) / 86_400_000));
    return this.notificationService.notifyLateAssignment(
      body.studentId,
      assignment.title,
      assignment.id,
      daysLate,
    );
  }

  @Post('grade')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Notify about new grade' })
  async notifyGrade(
    @Request() req: any,
    @Body()
    body: {
      studentId: string;
      subjectName: string;
      assignmentTitle?: string;
    },
  ) {
    if (!body.studentId || !body.subjectName?.trim()) throw new BadRequestException('A student and recorded subject grade are required');
    const schoolId = this.requireSchool(req.user);
    const grade = await this.prisma.grade.findFirst({
      where: {
        studentId: body.studentId,
        subject: {
          name: body.subjectName.trim(), schoolId,
          class: { students: { some: { studentId: body.studentId } }, ...(req.user.role === Role.TEACHER ? { OR: [{ teacherId: this.actorId(req.user) }, { classSubjects: { some: { teacherId: this.actorId(req.user) } } }] } : {}) },
        },
        ...(body.assignmentTitle ? { assignment: { title: body.assignmentTitle.trim() } } : {}),
      },
      include: { subject: { select: { name: true } }, assignment: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (!grade) throw new ForbiddenException('No matching recorded grade exists in your school scope');
    return this.notificationService.notifyGradePosted(
      body.studentId,
      grade.subject.name,
      grade.grade,
      grade.maxScore,
      grade.assignment?.title,
    );
  }

  @Post('check-late-assignments')
  @ApiOperation({ summary: 'Check and notify all late assignments (cron)' })
  async checkLateAssignments(@Headers('authorization') authorization?: string) {
    const secret = process.env.CRON_SECRET;
    if (!secret || secret.length < 16) throw new ServiceUnavailableException('Notification schedule is not configured');
    const expected = Buffer.from(`Bearer ${secret}`);
    const provided = Buffer.from(authorization || '');
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) throw new UnauthorizedException();
    return this.notificationService.checkLateAssignments();
  }

  private actorId(user: any): string { return user?.userId || user?.sub || user?.id || ''; }

  private requireSchool(user: any): string {
    if (!user?.schoolId || !this.actorId(user)) throw new ForbiddenException('The account is not assigned to a school');
    return user.schoolId;
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOperation({ summary: 'Get user notifications' })
  async getUserNotifications(@Request() req: any) {
    return this.notificationService.getUserNotifications(req.user.userId);
  }

  @Post(':id/read')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationService.markAsRead(id, req.user.userId);
  }

  @Post('read-all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Request() req: any) {
    return this.notificationService.markAllAsRead(req.user.userId || req.user.sub);
  }

  /** Teacher: Get their classes to populate dropdown */
  @Get('my-classes')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Get teacher classes for notification targeting' })
  async getMyClasses(@Request() req: any) {
    const teacherId = req.user?.userId || req.user?.sub || req.user?.id;
    const subjects = await this.prisma.subject.findMany({
      where: { teacherId },
      include: {
        class: { select: { id: true, name: true } },
      },
    });
    // Unique classes
    const classMap = new Map<string, { id: string; name: string }>();
    for (const s of subjects) {
      if (s.class && !classMap.has(s.class.id)) {
        classMap.set(s.class.id, s.class);
      }
    }
    return Array.from(classMap.values());
  }

  /** Teacher: Send a custom notification to a class or all students */
  @Post('send')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  @ApiOperation({ summary: 'Send a custom notification to students' })
  async sendCustomNotification(
    @Request() req: any,
    @Body() body: { title: string; message: string; targetClassId?: string; targetType: 'all-students' | 'class' | 'parents' },
  ) {
    const teacherId = req.user?.userId || req.user?.sub || req.user?.id;
    const schoolId = req.user?.schoolId;
    if (!schoolId || !body.title?.trim() || !body.message?.trim()) {
      throw new BadRequestException('School, title, and message are required');
    }

    // Find target users
    let userIds: string[] = [];

    if (body.targetType === 'class' && body.targetClassId) {
      const schoolClass = await this.prisma.class.findUnique({
        where: { id: body.targetClassId },
        select: {
          schoolId: true,
          teacherId: true,
          classSubjects: { select: { teacherId: true } },
          teacherAssignments: { where: { teacherId }, select: { teacherId: true } },
        },
      });
      if (!schoolClass || schoolClass.schoolId !== schoolId) {
        throw new ForbiddenException('The class is outside your school');
      }
      if (req.user.role === Role.TEACHER && schoolClass.teacherId !== teacherId &&
          !schoolClass.classSubjects.some((subject) => subject.teacherId === teacherId) &&
          schoolClass.teacherAssignments.length === 0) {
        throw new ForbiddenException('You do not teach this class');
      }
      const enrollments = await this.prisma.enrollment.findMany({
        where: { classId: body.targetClassId },
        select: { studentId: true },
      });
      userIds = enrollments.map((e) => e.studentId);
    } else if (body.targetType === 'all-students') {
      // Find all students in teacher's classes via direct enrollment query
      const subjects = await this.prisma.subject.findMany({
        where: req.user.role === Role.ADMIN ? { schoolId } : { teacherId, schoolId },
        select: { classId: true },
      });
      const classIds = subjects
        .filter((s) => s.classId)
        .map((s) => s.classId);
      if (classIds.length > 0) {
        const enrollments = await this.prisma.enrollment.findMany({
          where: { classId: { in: classIds } },
          select: { studentId: true },
        });
        userIds = [...new Set(enrollments.map((e) => e.studentId))];
      }
    } else if (body.targetType === 'parents') {
      // Find all parents of students in teacher's classes
      const subjects = await this.prisma.subject.findMany({
        where: req.user.role === Role.ADMIN ? { schoolId } : { teacherId, schoolId },
        select: { classId: true },
      });
      const classIds = subjects
        .filter((s) => s.classId)
        .map((s) => s.classId);
      if (classIds.length > 0) {
        const enrollments = await this.prisma.enrollment.findMany({
          where: { classId: { in: classIds } },
          include: {
            student: {
              include: { parents: { select: { parentId: true } } },
            },
          },
        });
        const idSet = new Set<string>();
        for (const e of enrollments) {
          (e.student as any)?.parents?.forEach((p: any) => idSet.add(p.parentId));
        }
        userIds = Array.from(idSet);
      }
    }

    userIds = [...new Set(userIds)];
    if (userIds.length === 0) throw new BadRequestException('There are no recipients in the selected scope');

    const result = await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        type: 'INFO' as const,
        title: body.title.trim(),
        body: body.message.trim(),
        userId,
        isRead: false,
      })),
    });

    return {
      success: result.count === userIds.length,
      sent: result.count,
      total: userIds.length,
    };
  }
}


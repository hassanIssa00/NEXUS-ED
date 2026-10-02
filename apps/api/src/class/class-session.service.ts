import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GamificationService } from '../gamification/gamification.service';

@Injectable()
export class ClassSessionService {
  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
  ) {}

  private async authorizeClass(classId: string, actorId: string, role: string, schoolId?: string) {
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    const classroom = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: { id: true, schoolId: true, teacherId: true, classSubjects: { select: { teacherId: true } } },
    });
    if (!classroom) throw new NotFoundException('Class not found');

    if (role === 'TEACHER') {
      const assigned = classroom.teacherId === actorId || classroom.classSubjects.some((item) => item.teacherId === actorId);
      if (!assigned) throw new ForbiddenException('You are not assigned to this class');
    } else if (role === 'STUDENT') {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { classId, studentId: actorId },
        select: { id: true },
      });
      if (!enrollment) throw new ForbiddenException('You are not enrolled in this class');
    }
    return classroom;
  }

  private validateMeetingUrl(value: string) {
    const allowedHosts = (process.env.MEETING_ALLOWED_HOSTS || '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);
    if (!allowedHosts.length) {
      throw new ServiceUnavailableException('Live meetings are not configured for this school');
    }

    let meeting: URL;
    try {
      meeting = new URL(value);
    } catch {
      throw new BadRequestException('A valid school-approved meeting URL is required');
    }
    if (
      meeting.protocol !== 'https:' ||
      meeting.username ||
      meeting.password ||
      !allowedHosts.includes(meeting.hostname.toLowerCase())
    ) {
      throw new BadRequestException('The meeting URL host is not approved by the school');
    }
    return meeting.toString();
  }

  async startSession(
    classId: string,
    teacherId: string,
    schoolId: string,
    title: string,
    meetingUrl: string,
    duration = 60,
  ) {
    await this.authorizeClass(classId, teacherId, 'TEACHER', schoolId);
    if (!title?.trim()) throw new BadRequestException('Session title is required');
    if (!Number.isInteger(duration) || duration < 1 || duration > 240) {
      throw new BadRequestException('Session duration must be between 1 and 240 minutes');
    }
    const approvedMeetingUrl = this.validateMeetingUrl(meetingUrl);
    return this.prisma.$transaction(async (tx) => {
      await tx.classSession.updateMany({ where: { classId, isActive: true }, data: { isActive: false } });
      const session = await tx.classSession.create({
        data: {
          classId,
          teacherId,
          title: title.trim(),
          startTime: new Date(),
          duration,
          isActive: true,
          meetingUrl: approvedMeetingUrl,
        },
        include: { teacher: { select: { name: true, avatar: true } } },
      });
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: teacherId,
          action: 'class_session.started',
          entityType: 'class_session',
          entityId: session.id,
          metadata: { classId, title: session.title, duration },
        },
      });
      return session;
    });
  }

  async endSession(sessionId: string, actorId: string, role: string, schoolId?: string) {
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    const session = await this.prisma.classSession.findFirst({
      where: { id: sessionId, class: { schoolId } },
      include: { class: { select: { id: true, schoolId: true, teacherId: true, classSubjects: { select: { teacherId: true } } } } },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (role === 'TEACHER') {
      const assigned = session.class.teacherId === actorId || session.class.classSubjects.some((item) => item.teacherId === actorId);
      if (!assigned || session.teacherId !== actorId) throw new ForbiddenException('Only the session teacher can end this session');
    }
    if (!session.isActive) return session;
    const ended = await this.prisma.classSession.update({ where: { id: sessionId }, data: { isActive: false } });
    await this.prisma.auditLog.create({
      data: { schoolId, userId: actorId, action: 'class_session.ended', entityType: 'class_session', entityId: sessionId },
    });
    return ended;
  }

  async getActiveSession(classId: string, actorId: string, role: string, schoolId?: string) {
    await this.authorizeClass(classId, actorId, role, schoolId);
    return this.prisma.classSession.findFirst({
      where: { classId, isActive: true, class: { schoolId } },
      include: { teacher: { select: { name: true } } },
      orderBy: { startTime: 'desc' },
    });
  }

  async getSessionHistory(classId: string, actorId: string, role: string, schoolId?: string) {
    await this.authorizeClass(classId, actorId, role, schoolId);
    return this.prisma.classSession.findMany({
      where: { classId, class: { schoolId } },
      orderBy: { startTime: 'desc' },
      take: 20,
    });
  }

  async markAttendance(classId: string, sessionId: string, studentId: string, teacherId: string, schoolId?: string) {
    await this.authorizeClass(classId, teacherId, 'TEACHER', schoolId);
    const session = await this.prisma.classSession.findFirst({
      where: { id: sessionId, classId, isActive: true, class: { schoolId } },
      select: { id: true, classId: true, startTime: true, title: true },
    });
    if (!session) throw new NotFoundException('Active session not found for this class');
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { classId, studentId, class: { schoolId } },
      select: { id: true },
    });
    if (!enrollment) throw new ForbiddenException('Student is not enrolled in this class');

    const date = new Date(Date.UTC(session.startTime.getUTCFullYear(), session.startTime.getUTCMonth(), session.startTime.getUTCDate()));
    const existing = await this.prisma.attendance.findUnique({
      where: { studentId_classId_date: { studentId, classId, date } },
      select: { id: true },
    });
    const attendance = await this.prisma.attendance.upsert({
      where: { studentId_classId_date: { studentId, classId, date } },
      update: { status: 'PRESENT', notes: `Joined approved session: ${session.title}` },
      create: { studentId, classId, date, status: 'PRESENT', notes: `Joined approved session: ${session.title}` },
    });
    if (!existing && this.gamification) {
      await this.gamification.awardXp(studentId, 10, 'حضور حصة', attendance.id);
    }
    return attendance;
  }
}

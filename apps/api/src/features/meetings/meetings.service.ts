import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { Role } from '../../auth/role.enum';
import { PrismaService } from '../../core/database/prisma.service';
import { EventsGateway } from '../../gateway/events.gateway';
import { CreateMeetingDto } from './dto/create-meeting.dto';

export const MEETING_STAFF_ROLES = [
  Role.TEACHER,
  Role.ADMIN,
  Role.PRINCIPAL,
  Role.VICE_PRINCIPAL,
  Role.COUNSELOR,
  Role.SUPERVISOR,
  Role.ACCOUNTANT,
  Role.HR,
] as const;

export const MEETING_ACCOUNT_ROLES = [...MEETING_STAFF_ROLES, Role.STUDENT, Role.PARENT] as const;
export const MEETING_SCHOOL_MANAGER_ROLES = [Role.PRINCIPAL, Role.HR] as const;
const MEETING_MANAGER_ROLES = new Set<Role>(MEETING_SCHOOL_MANAGER_ROLES);
const MEETING_EMPLOYEE_ROLES = [...MEETING_STAFF_ROLES];
const meetingSummary = {
  id: true,
  title: true,
  description: true,
  scheduledAt: true,
  startedAt: true,
  endedAt: true,
  status: true,
  meetingType: true,
  classId: true,
  createdAt: true,
} as const;

export interface MeetingActor {
  userId: string;
  role: Role;
  schoolId?: string;
}

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  private schoolId(actor: MeetingActor) {
    if (!actor.schoolId) throw new ForbiddenException('الحساب غير مرتبط بمدرسة.');
    if (!MEETING_ACCOUNT_ROLES.includes(actor.role)) {
      throw new ForbiddenException('هذه الخدمة متاحة لحسابات المدرسة والطلاب وأولياء الأمور فقط.');
    }
    return actor.schoolId;
  }

  private async assertActiveAccount(actor: MeetingActor, schoolId = this.schoolId(actor)) {
    const account = await this.prisma.user.findFirst({
      where: { id: actor.userId, schoolId, role: actor.role, isActive: true },
      select: { id: true },
    });
    if (!account) throw new ForbiddenException('حساب المنصة غير نشط أو لم يعد مرتبطًا بهذه المدرسة.');
  }

  private assertClassOrganizer(actor: MeetingActor) {
    if (actor.role !== Role.TEACHER) throw new ForbiddenException('إنشاء لقاءات الفصول وأولياء الأمور متاح للمعلم فقط.');
  }

  private assertSchoolMeetingOrganizer(actor: MeetingActor) {
    if (!MEETING_MANAGER_ROLES.has(actor.role)) {
      throw new ForbiddenException('إنشاء اجتماع لجميع موظفي المدرسة متاح لمدير المدرسة أو الشؤون الإدارية فقط.');
    }
  }

  private liveKitConfig() {
    const internalUrl = process.env.LIVEKIT_INTERNAL_URL?.trim();
    const publicUrl = process.env.LIVEKIT_PUBLIC_URL?.trim();
    const apiKey = process.env.LIVEKIT_API_KEY?.trim();
    const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
    if (!internalUrl || !publicUrl || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException('خادم اجتماعات نكسس غير مهيأ بعد.');
    }

    let parsedPublicUrl: URL;
    let parsedInternalUrl: URL;
    try {
      parsedPublicUrl = new URL(publicUrl);
      parsedInternalUrl = new URL(internalUrl);
    } catch {
      throw new ServiceUnavailableException('إعداد عنوان خادم الاجتماعات غير صالح.');
    }
    if (parsedPublicUrl.protocol !== 'wss:' && !(parsedPublicUrl.protocol === 'ws:' && parsedPublicUrl.hostname === 'localhost')) {
      throw new ServiceUnavailableException('يجب أن يستخدم رابط الاجتماعات العام اتصالًا آمنًا.');
    }
    if (!['http:', 'https:'].includes(parsedInternalUrl.protocol)) {
      throw new ServiceUnavailableException('عنوان خادم الاجتماعات الداخلي غير صالح.');
    }
    return { internalUrl: parsedInternalUrl.toString().replace(/\/$/, ''), publicUrl, apiKey, apiSecret };
  }

  private roomService(config = this.liveKitConfig()) {
    return new RoomServiceClient(config.internalUrl, config.apiKey, config.apiSecret);
  }

  private async ensureRoom(rooms: RoomServiceClient, meeting: { id: string; schoolId: string; roomName: string; participantCount?: number }) {
    const existing = await rooms.listRooms([meeting.roomName]).catch((error) => {
      throw new ServiceUnavailableException('تعذر الاتصال بخادم غرفة الاجتماع.', { cause: error });
    });
    if (existing.some((room) => room.name === meeting.roomName)) return;
    try {
      await rooms.createRoom({
        name: meeting.roomName,
        emptyTimeout: 120,
        departureTimeout: 30,
        maxParticipants: Math.max(100, meeting.participantCount || 0),
        metadata: JSON.stringify({ meetingId: meeting.id, schoolId: meeting.schoolId }),
      });
    } catch (error) {
      const createdByAnotherJoin = await rooms.listRooms([meeting.roomName])
        .then((active) => active.some((room) => room.name === meeting.roomName))
        .catch(() => false);
      if (!createdByAnotherJoin) {
        throw new ServiceUnavailableException('تعذر تشغيل غرفة الاجتماع. تحقق من خادم نكسس وحاول مجددًا.', { cause: error });
      }
    }
  }

  async findStaff(actor: MeetingActor, query = '') {
    this.assertSchoolMeetingOrganizer(actor);
    const schoolId = this.schoolId(actor);
    await this.assertActiveAccount(actor, schoolId);
    const normalizedQuery = query.trim().slice(0, 80);
    if (normalizedQuery.length === 1) return [];
    const users = await this.prisma.user.findMany({
      where: {
        schoolId,
        isActive: true,
        role: { in: [...MEETING_STAFF_ROLES] },
        id: { not: actor.userId },
        ...(normalizedQuery ? {
          OR: [
            { name: { contains: normalizedQuery, mode: 'insensitive' } },
            { firstName: { contains: normalizedQuery, mode: 'insensitive' } },
            { lastName: { contains: normalizedQuery, mode: 'insensitive' } },
          ],
        } : {}),
      },
      select: { id: true, name: true, firstName: true, lastName: true, avatar: true, role: true },
      orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
      take: 30,
    });
    return users.map(({ firstName, lastName, ...user }) => ({
      ...user,
      name: user.name || [firstName, lastName].filter(Boolean).join(' ') || 'عضو المدرسة',
    }));
  }

  async list(actor: MeetingActor) {
    const schoolId = this.schoolId(actor);
    await this.assertActiveAccount(actor, schoolId);
    const items = await this.prisma.nexusMeeting.findMany({
      where: {
        schoolId,
        OR: [{ hostId: actor.userId }, { participants: { some: { userId: actor.userId } } }],
        scheduledAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
      },
      select: {
        ...meetingSummary,
        class: { select: { id: true, name: true } },
        host: { select: { id: true, name: true, firstName: true, lastName: true, role: true, avatar: true } },
        participants: {
          select: { userId: true, joinedAt: true, leftAt: true, user: { select: { id: true, name: true, firstName: true, lastName: true, role: true, avatar: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ status: 'asc' }, { scheduledAt: 'asc' }],
      take: 80,
    });
    return items.map(({ host, participants, class: classroom, ...meeting }) => ({
      ...meeting,
      classroom,
      host: this.publicUser(host),
      participants: participants.map(({ userId, joinedAt, leftAt, user }) => ({ userId, joinedAt, leftAt, user: this.publicUser(user) })),
    }));
  }

  async create(actor: MeetingActor, input: CreateMeetingDto) {
    const schoolId = this.schoolId(actor);
    await this.assertActiveAccount(actor, schoolId);
    const meetingType = input.meetingType;
    let classId: string | null = null;
    let participantIds: string[] = [];

    if (meetingType === 'STAFF') {
      this.assertSchoolMeetingOrganizer(actor);
      if (input.classId) throw new BadRequestException('اجتماع المدرسة لا يرتبط بفصل محدد.');
      const staff = await this.prisma.user.findMany({
        where: { schoolId, isActive: true, role: { in: MEETING_EMPLOYEE_ROLES } },
        select: { id: true },
      });
      participantIds = staff.map((user) => user.id);
    } else {
      this.assertClassOrganizer(actor);
      if (!input.classId) throw new BadRequestException('اختر الفصل المرتبط بهذا الاجتماع.');
      const classroom = await this.prisma.class.findFirst({
        where: {
          id: input.classId,
          schoolId,
          OR: [{ teacherId: actor.userId }, { classSubjects: { some: { teacherId: actor.userId } } }],
        },
        select: { id: true },
      });
      if (!classroom) throw new ForbiddenException('الفصل غير تابع لنطاقك التدريسي.');
      classId = classroom.id;

      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          classId,
          class: { schoolId },
          student: { schoolId, role: Role.STUDENT, isActive: true },
        },
        select: {
          student: {
            select: {
              id: true,
              parents: { select: { parent: { select: { id: true, schoolId: true, role: true, isActive: true } } } },
            },
          },
        },
      });
      if (meetingType === 'CLASS') {
        participantIds = enrollments.map(({ student }) => student.id);
        if (participantIds.length === 0) throw new BadRequestException('لا يوجد طلاب مسجلون في الفصل لدعوتهم.');
      } else {
        const requestedParentIds = [...new Set((input.participantIds || []).filter((id) => id !== actor.userId))];
        if (requestedParentIds.length === 0) throw new BadRequestException('اختر ولي أمر واحدًا على الأقل من أولياء أمور الفصل.');
        const linkedParentIds = new Set(enrollments.flatMap(({ student }) => student.parents
          .map(({ parent }) => parent)
          .filter((parent) => parent.schoolId === schoolId && String(parent.role) === String(Role.PARENT) && parent.isActive)
          .map((parent) => parent.id)));
        if (requestedParentIds.some((id) => !linkedParentIds.has(id))) {
          throw new BadRequestException('يمكن دعوة أولياء الأمور المرتبطين بطلاب الفصل المحدد فقط.');
        }
        participantIds = requestedParentIds;
      }
    }

    const title = input.title.trim();
    const scheduledAt = new Date(input.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) throw new BadRequestException('موعد الاجتماع غير صالح.');
    if (scheduledAt.getTime() < Date.now() - 60_000) throw new BadRequestException('اختر موعدًا حاليًا أو قادمًا.');
    if (scheduledAt.getTime() > Date.now() + 1000 * 60 * 60 * 24 * 365) throw new BadRequestException('لا يمكن جدولة اجتماع لأكثر من سنة مقدمًا.');

    participantIds = [...new Set([...participantIds.filter((id) => id !== actor.userId), actor.userId])];
    const invitees = participantIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: participantIds }, schoolId, isActive: true },
          select: { id: true, role: true },
        })
      : [];
    const allowedInviteeRoles = meetingType === 'CLASS'
      ? new Set<string>([Role.TEACHER, Role.STUDENT])
      : meetingType === 'PARENT'
        ? new Set<string>([Role.TEACHER, Role.PARENT])
        : new Set<string>(MEETING_EMPLOYEE_ROLES);
    if (invitees.length !== participantIds.length || invitees.some((user) => !allowedInviteeRoles.has(user.role))) {
      throw new BadRequestException('تعذر التحقق من أحد المدعوين. تأكد أن الحساب نشط في المدرسة نفسها.');
    }

    const roomName = `nexus-${randomUUID().replace(/-/g, '')}`;
    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.nexusMeeting.create({
        data: {
          schoolId,
          hostId: actor.userId,
          classId,
          meetingType,
          roomName,
          title,
          description: input.description?.trim() || null,
          scheduledAt,
          participants: {
            create: participantIds.map((userId) => ({ userId, invitedById: actor.userId })),
          },
        },
        select: { id: true, title: true, scheduledAt: true, status: true },
      });
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: actor.userId,
          action: 'nexus_meeting.created',
          entityType: 'nexus_meeting',
          entityId: created.id,
          metadata: { title, meetingType, inviteeCount: participantIds.filter((userId) => userId !== actor.userId).length },
        },
      });
      const recipients = participantIds.filter((userId) => userId !== actor.userId);
      const notifications = recipients.length
        ? await Promise.all(recipients.map((userId) => tx.notification.create({
          data: {
            userId,
            title: 'دعوة اجتماع جديد في نكسس',
            body: `${title} · اضغط لفتح غرفة الاجتماع من حسابك المدرسي.`,
            type: 'REMINDER',
            data: JSON.stringify({ actionUrl: `/meetings/${created.id}`, meetingId: created.id }),
          },
        })))
        : [];
      return { meeting: created, notifications };
    });
    for (const notification of result.notifications) {
      this.eventsGateway.emitNotification(notification.userId, {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        isRead: false,
        createdAt: notification.createdAt,
        actionUrl: `/meetings/${result.meeting.id}`,
      });
    }
    return result.meeting;
  }

  private async findAuthorizedMeeting(actor: MeetingActor, meetingId: string) {
    const schoolId = this.schoolId(actor);
    await this.assertActiveAccount(actor, schoolId);
    const meeting = await this.prisma.nexusMeeting.findFirst({
      where: { id: meetingId, schoolId },
      include: {
        class: { select: { id: true, name: true } },
        host: { select: { id: true, name: true, firstName: true, lastName: true, role: true, avatar: true } },
        participants: {
          select: { userId: true, joinedAt: true, leftAt: true, user: { select: { id: true, name: true, firstName: true, lastName: true, role: true, avatar: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!meeting) throw new NotFoundException('الاجتماع غير موجود في مدرسة حسابك.');
    const isParticipant = meeting.participants.some((participant) => participant.userId === actor.userId);
    if (!isParticipant) throw new ForbiddenException('هذا الاجتماع غير موجه لحسابك.');
    return meeting;
  }

  async get(actor: MeetingActor, meetingId: string) {
    const meeting = await this.findAuthorizedMeeting(actor, meetingId);
    const { roomName: _roomName, host, participants, class: classroom, ...safeMeeting } = meeting;
    return {
      ...safeMeeting,
      classroom,
      host: this.publicUser(host),
      participants: participants.map(({ userId, joinedAt, leftAt, user }) => ({ userId, joinedAt, leftAt, user: this.publicUser(user) })),
    };
  }

  async join(actor: MeetingActor, meetingId: string) {
    const meeting = await this.findAuthorizedMeeting(actor, meetingId);
    if (meeting.status === 'ENDED' || meeting.status === 'CANCELLED') throw new ConflictException('الاجتماع انتهى أو تم إلغاؤه.');
    const config = this.liveKitConfig();
    const rooms = this.roomService(config);

    if (meeting.status === 'SCHEDULED') {
      if (meeting.hostId !== actor.userId) throw new ConflictException('بانتظار منظم الاجتماع لفتحه.');
      await this.ensureRoom(rooms, { ...meeting, participantCount: meeting.participants.length });
      const started = await this.prisma.nexusMeeting.updateMany({
        where: { id: meeting.id, status: 'SCHEDULED' },
        data: { status: 'LIVE', startedAt: new Date() },
      });
      if (started.count > 0) {
        await this.prisma.auditLog.create({
          data: { schoolId: meeting.schoolId, userId: actor.userId, action: 'nexus_meeting.started', entityType: 'nexus_meeting', entityId: meeting.id },
        });
      }
    } else if (meeting.status === 'LIVE') {
      // LiveKit removes empty rooms after their timeout; recreate the same private room
      // when an invited participant returns after that cleanup.
      await this.ensureRoom(rooms, { ...meeting, participantCount: meeting.participants.length });
    }

    const current = await this.prisma.nexusMeeting.findFirst({ where: { id: meetingId, schoolId: meeting.schoolId } });
    if (!current || current.status !== 'LIVE') throw new ConflictException('غرفة الاجتماع غير مفتوحة الآن.');

    const participant = meeting.participants.find((item) => item.userId === actor.userId);
    if (!participant) throw new ForbiddenException('الحساب غير مدعو لهذا الاجتماع.');
    await this.prisma.nexusMeetingParticipant.update({
      where: { meetingId_userId: { meetingId, userId: actor.userId } },
      data: { joinedAt: new Date(), leftAt: null },
    });

    const displayName = this.displayName(actor.userId === meeting.host.id ? meeting.host : participant.user);
    const accessToken = new AccessToken(config.apiKey, config.apiSecret, {
      identity: actor.userId,
      name: displayName,
      ttl: '4h',
    });
    accessToken.addGrant({
      roomJoin: true,
      room: meeting.roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return {
      url: config.publicUrl,
      token: await accessToken.toJwt(),
      meeting: { id: meeting.id, title: meeting.title, status: current.status, hostId: meeting.hostId },
    };
  }

  async leave(actor: MeetingActor, meetingId: string) {
    const meeting = await this.findAuthorizedMeeting(actor, meetingId);
    await this.prisma.nexusMeetingParticipant.updateMany({
      where: { meetingId: meeting.id, userId: actor.userId, joinedAt: { not: null } },
      data: { leftAt: new Date() },
    });
    return { ok: true };
  }

  async end(actor: MeetingActor, meetingId: string) {
    const meeting = await this.findMeetingForManagement(actor, meetingId);
    if (meeting.status === 'ENDED' || meeting.status === 'CANCELLED') return { ok: true, status: meeting.status };
    if (meeting.status === 'LIVE') {
      const rooms = this.roomService();
      const active = await rooms.listRooms([meeting.roomName]).catch((error) => {
        throw new ServiceUnavailableException('تعذر التحقق من اتصال غرفة الاجتماع.', { cause: error });
      });
      if (active.some((room) => room.name === meeting.roomName)) {
        await rooms.deleteRoom(meeting.roomName).catch((error) => {
          throw new ServiceUnavailableException('تعذر إغلاق اتصال الغرفة بالكامل. حاول مرة أخرى.', { cause: error });
        });
      }
    }
    await this.prisma.nexusMeeting.update({ where: { id: meeting.id }, data: { status: 'ENDED', endedAt: new Date() } });
    await this.prisma.auditLog.create({
      data: { schoolId: meeting.schoolId, userId: actor.userId, action: 'nexus_meeting.ended', entityType: 'nexus_meeting', entityId: meeting.id },
    });
    return { ok: true, status: 'ENDED' };
  }

  async cancel(actor: MeetingActor, meetingId: string) {
    const meeting = await this.findMeetingForManagement(actor, meetingId);
    if (meeting.status !== 'SCHEDULED') throw new ConflictException('لا يمكن إلغاء اجتماع بدأ بالفعل. استخدم إنهاء الاجتماع.');
    await this.prisma.nexusMeeting.update({ where: { id: meeting.id }, data: { status: 'CANCELLED', endedAt: new Date() } });
    await this.prisma.auditLog.create({
      data: { schoolId: meeting.schoolId, userId: actor.userId, action: 'nexus_meeting.cancelled', entityType: 'nexus_meeting', entityId: meeting.id },
    });
    return { ok: true, status: 'CANCELLED' };
  }

  async removeParticipant(actor: MeetingActor, meetingId: string, participantId: string) {
    const meeting = await this.findMeetingForManagement(actor, meetingId);
    if (actor.userId === participantId) throw new BadRequestException('استخدم زر مغادرة الاجتماع لمغادرة الغرفة.');
    if (meeting.status !== 'LIVE') throw new ConflictException('إدارة المشاركين متاحة أثناء الاجتماع فقط.');
    const isParticipant = await this.prisma.nexusMeetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId: participantId } },
      select: { userId: true },
    });
    if (!isParticipant) throw new NotFoundException('المشارك غير موجود في هذا الاجتماع.');
    await this.roomService().removeParticipant(meeting.roomName, participantId, { revokeTokenTs: BigInt(Math.floor(Date.now() / 1000)) }).catch((error) => {
      throw new ServiceUnavailableException('تعذر إخراج المشارك من الغرفة. حاول مرة أخرى.', { cause: error });
    });
    await this.prisma.nexusMeetingParticipant.updateMany({ where: { meetingId, userId: participantId }, data: { leftAt: new Date() } });
    return { ok: true };
  }

  private async findMeetingForManagement(actor: MeetingActor, meetingId: string) {
    const schoolId = this.schoolId(actor);
    await this.assertActiveAccount(actor, schoolId);
    const meeting = await this.prisma.nexusMeeting.findFirst({ where: { id: meetingId, schoolId }, select: { id: true, schoolId: true, hostId: true, roomName: true, status: true } });
    if (!meeting) throw new NotFoundException('الاجتماع غير موجود.');
    if (meeting.hostId !== actor.userId && !MEETING_MANAGER_ROLES.has(actor.role)) throw new ForbiddenException('إدارة هذا الاجتماع متاحة للمنظم أو مدير المدرسة أو الشؤون الإدارية فقط.');
    return meeting;
  }

  private displayName(user: { name?: string | null; firstName?: string | null; lastName?: string | null }) {
    return user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'عضو المدرسة';
  }

  private publicUser<T extends { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; role: string; avatar?: string | null }>(user: T) {
    return { id: user.id, name: this.displayName(user), role: user.role, avatar: user.avatar };
  }
}

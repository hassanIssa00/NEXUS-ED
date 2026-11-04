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
import { MeetingChatDto, MeetingHeartbeatDto, MeetingSignalDto } from './dto/meeting-webrtc.dto';

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
    if (!actor.schoolId) throw new ForbiddenException('المدرسة غير محددة.');
    if (!MEETING_ACCOUNT_ROLES.includes(actor.role)) {
      throw new ForbiddenException('لا يمكنك الوصول لاجتماعات نكسس بهذه الرتبة.');
    }
    return actor.schoolId;
  }

  private async assertActiveAccount(actor: MeetingActor, schoolId = this.schoolId(actor)) {
    const account = await this.prisma.user.findFirst({
      where: { id: actor.userId, schoolId, role: actor.role, isActive: true },
      select: { id: true },
    });
    if (!account) throw new ForbiddenException('الحساب غير نشط أو لا يحق له الوصول للاجتماع.');
  }

  private assertClassOrganizer(actor: MeetingActor) {
    if (actor.role !== Role.TEACHER) throw new ForbiddenException('معلم الفصل فقط هو المخول بجدولة هذا الاجتماع.');
  }

  private assertSchoolMeetingOrganizer(actor: MeetingActor) {
    if (!MEETING_MANAGER_ROLES.has(actor.role)) {
      throw new ForbiddenException('إدارة المدرسة والموارد البشرية فقط هي المخولة بجدولة اجتماعات الكادر.');
    }
  }

  private liveKitConfig(): { internalUrl: string; publicUrl: string; apiKey: string; apiSecret: string } | null {
    const internalUrl = process.env.LIVEKIT_INTERNAL_URL?.trim();
    const publicUrl = process.env.LIVEKIT_PUBLIC_URL?.trim();
    const apiKey = process.env.LIVEKIT_API_KEY?.trim();
    const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
    if (!internalUrl || !publicUrl || !apiKey || !apiSecret) return null;

    let parsedPublicUrl: URL;
    let parsedInternalUrl: URL;
    try {
      parsedPublicUrl = new URL(publicUrl);
      parsedInternalUrl = new URL(internalUrl);
    } catch {
      return null;
    }
    if (parsedPublicUrl.protocol !== 'wss:' && !(parsedPublicUrl.protocol === 'ws:' && parsedPublicUrl.hostname === 'localhost')) {
      return null;
    }
    if (!['http:', 'https:'].includes(parsedInternalUrl.protocol)) {
      return null;
    }
    return { internalUrl: parsedInternalUrl.toString().replace(/\/$/, ''), publicUrl, apiKey, apiSecret };
  }

  private roomService(config: { internalUrl: string; apiKey: string; apiSecret: string }) {
    return new RoomServiceClient(config.internalUrl, config.apiKey, config.apiSecret);
  }

  private async ensureRoom(rooms: RoomServiceClient, meeting: { id: string; schoolId: string; roomName: string; participantCount?: number }) {
    const existing = await rooms.listRooms([meeting.roomName]).catch((error) => {
      throw new ServiceUnavailableException('تعذر التحقق من حالة خادم الاجتماعات.', { cause: error });
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
        throw new ServiceUnavailableException('تعذر تهيئة غرفة الاجتماع. تحقق من إعداد خادم الاجتماعات.', { cause: error });
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
        OR: [
          { hostId: actor.userId },
          { participants: { some: { userId: actor.userId } } },
          { status: 'LIVE' },
        ],
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
      if (input.classId) throw new BadRequestException('اجتماع الموظفين لا يرتبط بفصل دراسي.');
      const staff = await this.prisma.user.findMany({
        where: { schoolId, isActive: true, role: { in: MEETING_EMPLOYEE_ROLES } },
        select: { id: true },
      });
      participantIds = staff.map((user) => user.id);
    } else {
      this.assertClassOrganizer(actor);
      if (!input.classId) throw new BadRequestException('حدد الفصل الدراسي لهذا الاجتماع.');
      const classroom = await this.prisma.class.findFirst({
        where: {
          id: input.classId,
          schoolId,
          OR: [{ teacherId: actor.userId }, { classSubjects: { some: { teacherId: actor.userId } } }],
        },
        select: { id: true },
      });
      if (!classroom) throw new ForbiddenException('لست معلماً لهذا الفصل الدراسي.');
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
        if (participantIds.length === 0) throw new BadRequestException('لا يوجد طلاب مسجلون في هذا الفصل.');
      } else {
        const requestedParentIds = [...new Set((input.participantIds || []).filter((id) => id !== actor.userId))];
        if (requestedParentIds.length === 0) throw new BadRequestException('حدد ولي أمر واحد على الأقل للاجتماع.');
        const linkedParentIds = new Set(enrollments.flatMap(({ student }) => student.parents
          .map(({ parent }) => parent)
          .filter((parent) => parent.schoolId === schoolId && String(parent.role) === String(Role.PARENT) && parent.isActive)
          .map((parent) => parent.id)));
        if (requestedParentIds.some((id) => !linkedParentIds.has(id))) {
          throw new BadRequestException('يمكن دعوة أولياء أمور طلاب هذا الفصل فقط.');
        }
        participantIds = requestedParentIds;
      }
    }

    const title = input.title.trim();
    const scheduledAt = new Date(input.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) throw new BadRequestException('تاريخ ووقت غير صالح.');
    if (scheduledAt.getTime() < Date.now() - 60_000) throw new BadRequestException('وقت الاجتماع لا يمكن أن يكون في الماضي.');
    if (scheduledAt.getTime() > Date.now() + 1000 * 60 * 60 * 24 * 365) throw new BadRequestException('لا يمكن جدولة اجتماع بعد أكثر من عام.');

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
      throw new BadRequestException('بعض المدعوين غير مؤهلين للمشاركة.');
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
      const notifications = participantIds.filter((userId) => userId !== actor.userId).length
        ? await Promise.all(participantIds.filter((userId) => userId !== actor.userId).map((userId) => tx.notification.create({
          data: {
            userId,
            type: 'INFO',
            title: 'دعوة لاجتماع مدرسي جديد',
            body: `تمت دعوتك لاجتماع: ${title}`,
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
    if (!meeting) throw new NotFoundException('الاجتماع غير موجود أو لا ينتمي لمدرستك.');
    let isParticipant = meeting.participants.some((participant) => participant.userId === actor.userId);
    if (!isParticipant) {
      if (meeting.schoolId === schoolId) {
        // Auto-enroll participant so any school student/teacher with the link can join!
        await this.prisma.nexusMeetingParticipant.create({
          data: {
            meetingId: meeting.id,
            userId: actor.userId,
            invitedById: meeting.hostId,
          },
        }).catch(() => undefined);
        const meUser = await this.prisma.user.findUnique({
          where: { id: actor.userId },
          select: { id: true, name: true, firstName: true, lastName: true, role: true, avatar: true },
        });
        if (meUser) {
          meeting.participants.push({
            userId: actor.userId,
            joinedAt: null,
            leftAt: null,
            user: meUser,
          });
        }
        isParticipant = true;
      } else {
        throw new ForbiddenException('غير مصرح لك بدخول هذا الاجتماع.');
      }
    }
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
    if (meeting.status === 'ENDED' || meeting.status === 'CANCELLED') {
      throw new ConflictException('الاجتماع منتهي ولا يمكن الدخول.');
    }

    const isHost = meeting.hostId === actor.userId;
    const scheduledTimeReached = meeting.scheduledAt.getTime() <= Date.now();

    if (meeting.status === 'SCHEDULED') {
      if (!isHost && !scheduledTimeReached) {
        throw new ConflictException('الاجتماع مجدول ولم يحن موعده بعد.');
      }
    }

    // Mark meeting LIVE if needed
    if (meeting.status === 'SCHEDULED') {
      const started = await this.prisma.nexusMeeting.updateMany({
        where: { id: meeting.id, status: 'SCHEDULED' },
        data: { status: 'LIVE', startedAt: new Date() },
      });
      if (started.count > 0) {
        await this.prisma.auditLog.create({
          data: { schoolId: meeting.schoolId, userId: actor.userId, action: 'nexus_meeting.started', entityType: 'nexus_meeting', entityId: meeting.id },
        });
      }
    }

    await this.prisma.nexusMeetingParticipant.update({
      where: { meetingId_userId: { meetingId, userId: actor.userId } },
      data: { joinedAt: new Date(), leftAt: null },
    });

    const participant = meeting.participants.find((item) => item.userId === actor.userId);
    const displayName = this.displayName(actor.userId === meeting.host.id ? meeting.host : (participant?.user || {}));

    const config = this.liveKitConfig();

    // ── Native WebRTC Mesh Path (100% platform-native, zero third-party dependency) ──
    if (!config) {
      await this.prisma.nexusMeetingActivePeer.upsert({
        where: { meetingId_userId: { meetingId: meeting.id, userId: actor.userId } },
        create: {
          meetingId: meeting.id,
          userId: actor.userId,
          userName: displayName,
          role: actor.role,
          isHost,
          micOn: true,
          cameraOn: true,
          raisedHand: false,
          isScreenSharing: false,
          lastSeen: new Date(),
        },
        update: {
          userName: displayName,
          lastSeen: new Date(),
        },
      });

      return {
        mode: 'webrtc',
        meeting: { id: meeting.id, title: meeting.title, status: 'LIVE', hostId: meeting.hostId },
        user: { id: actor.userId, name: displayName, role: actor.role },
        isHost,
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      };
    }

    // ── Optional LiveKit SFU Path (if LiveKit credentials configured in environment) ──
    const rooms = this.roomService(config);
    await this.ensureRoom(rooms, { ...meeting, participantCount: meeting.participants.length });

    const accessToken = new AccessToken(config.apiKey, config.apiSecret, {
      identity: actor.userId,
      name: displayName,
      ttl: '4h',
    });
    accessToken.addGrant({
      room: meeting.roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return {
      mode: 'livekit',
      url: config.publicUrl,
      token: await accessToken.toJwt(),
      meeting: { id: meeting.id, title: meeting.title, status: 'LIVE', hostId: meeting.hostId },
      user: { id: actor.userId, name: displayName, role: actor.role },
      isHost,
    };
  }

  async heartbeat(actor: MeetingActor, meetingId: string, input: MeetingHeartbeatDto) {
    const meeting = await this.prisma.nexusMeeting.findUnique({
      where: { id: meetingId },
      select: { id: true, status: true, hostId: true },
    });
    if (!meeting || meeting.status === 'ENDED' || meeting.status === 'CANCELLED') {
      return { meetingStatus: meeting?.status || 'ENDED', peers: [], messages: [] };
    }

    const isHost = meeting.hostId === actor.userId;
    const participant = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      select: { name: true, firstName: true, lastName: true },
    });
    const displayName = this.displayName(participant || {});

    // Upsert peer presence with latest heartbeat state
    await this.prisma.nexusMeetingActivePeer.upsert({
      where: { meetingId_userId: { meetingId, userId: actor.userId } },
      create: {
        meetingId,
        userId: actor.userId,
        userName: displayName,
        role: actor.role,
        isHost,
        micOn: input.micOn ?? true,
        cameraOn: input.cameraOn ?? false,
        raisedHand: input.raisedHand ?? false,
        isScreenSharing: input.isScreenSharing ?? false,
        lastSeen: new Date(),
      },
      update: {
        micOn: input.micOn !== undefined ? input.micOn : undefined,
        cameraOn: input.cameraOn !== undefined ? input.cameraOn : undefined,
        raisedHand: input.raisedHand !== undefined ? input.raisedHand : undefined,
        isScreenSharing: input.isScreenSharing !== undefined ? input.isScreenSharing : undefined,
        lastSeen: new Date(),
      },
    });

    // Prune stale peers not seen in last 25 seconds
    const staleThreshold = new Date(Date.now() - 25_000);
    await this.prisma.nexusMeetingActivePeer.deleteMany({
      where: { meetingId, lastSeen: { lt: staleThreshold } },
    });

    // Query active peers
    const peers = await this.prisma.nexusMeetingActivePeer.findMany({
      where: { meetingId },
      orderBy: [{ isHost: 'desc' }, { userName: 'asc' }],
    });

    // Query new messages
    const lastTime = input.lastMessageTime ? new Date(input.lastMessageTime) : new Date(Date.now() - 60_000);
    const messages = await this.prisma.nexusMeetingMessage.findMany({
      where: { meetingId, createdAt: { gt: lastTime } },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    return {
      meetingStatus: meeting.status,
      peers: peers.map((p) => ({
        userId: p.userId,
        userName: p.userName,
        role: p.role,
        isHost: p.isHost,
        micOn: p.micOn,
        cameraOn: p.cameraOn,
        raisedHand: p.raisedHand,
        isScreenSharing: p.isScreenSharing,
      })),
      messages: messages.map((m) => ({
        id: m.id,
        userId: m.userId,
        userName: m.userName,
        message: m.message,
        createdAt: m.createdAt.getTime(),
      })),
    };
  }

  async sendSignal(actor: MeetingActor, meetingId: string, input: MeetingSignalDto) {
    await this.prisma.nexusMeetingSignal.create({
      data: {
        meetingId,
        fromUserId: actor.userId,
        toUserId: input.toUserId,
        signalData: JSON.stringify(input.signal),
      },
    });
    return { ok: true };
  }

  async getSignals(actor: MeetingActor, meetingId: string) {
    const signals = await this.prisma.nexusMeetingSignal.findMany({
      where: { meetingId, toUserId: actor.userId },
      orderBy: { createdAt: 'asc' },
    });

    if (signals.length > 0) {
      await this.prisma.nexusMeetingSignal.deleteMany({
        where: { id: { in: signals.map((s) => s.id) } },
      });
    }

    // Opportunistically prune signals older than 60 seconds
    const oldThreshold = new Date(Date.now() - 60_000);
    await this.prisma.nexusMeetingSignal.deleteMany({
      where: { createdAt: { lt: oldThreshold } },
    });

    return signals.map((s) => {
      let parsed = null;
      try {
        parsed = JSON.parse(s.signalData);
      } catch {
        parsed = s.signalData;
      }
      return {
        id: s.id,
        fromUserId: s.fromUserId,
        signal: parsed,
        createdAt: s.createdAt.toISOString(),
      };
    });
  }

  async sendChat(actor: MeetingActor, meetingId: string, input: MeetingChatDto) {
    const meeting = await this.findAuthorizedMeeting(actor, meetingId);
    const participant = meeting.participants.find((item) => item.userId === actor.userId);
    const displayName = this.displayName(actor.userId === meeting.host.id ? meeting.host : (participant?.user || {}));
    const cleanMessage = input.message.trim().slice(0, 1200);

    const msg = await this.prisma.nexusMeetingMessage.create({
      data: {
        meetingId,
        userId: actor.userId,
        userName: displayName,
        message: cleanMessage,
      },
    });

    return {
      id: msg.id,
      userId: msg.userId,
      userName: msg.userName,
      message: msg.message,
      createdAt: msg.createdAt.getTime(),
    };
  }

  async leave(actor: MeetingActor, meetingId: string) {
    const meeting = await this.findAuthorizedMeeting(actor, meetingId);
    await this.prisma.nexusMeetingParticipant.updateMany({
      where: { meetingId: meeting.id, userId: actor.userId, joinedAt: { not: null } },
      data: { leftAt: new Date() },
    });
    await this.prisma.nexusMeetingActivePeer.deleteMany({
      where: { meetingId: meeting.id, userId: actor.userId },
    });
    return { ok: true };
  }

  async end(actor: MeetingActor, meetingId: string) {
    const meeting = await this.findMeetingForManagement(actor, meetingId);
    if (meeting.status === 'ENDED' || meeting.status === 'CANCELLED') return { ok: true, status: meeting.status };
    const config = this.liveKitConfig();
    if (meeting.status === 'LIVE' && config) {
      const rooms = this.roomService(config);
      const active = await rooms.listRooms([meeting.roomName]).catch(() => []);
      if (active.some((room) => room.name === meeting.roomName)) {
        await rooms.deleteRoom(meeting.roomName).catch(() => undefined);
      }
    }
    await this.prisma.nexusMeeting.update({ where: { id: meeting.id }, data: { status: 'ENDED', endedAt: new Date() } });
    await this.prisma.nexusMeetingActivePeer.deleteMany({ where: { meetingId: meeting.id } });
    await this.prisma.nexusMeetingSignal.deleteMany({ where: { meetingId: meeting.id } });
    await this.prisma.auditLog.create({
      data: { schoolId: meeting.schoolId, userId: actor.userId, action: 'nexus_meeting.ended', entityType: 'nexus_meeting', entityId: meeting.id },
    });
    return { ok: true, status: 'ENDED' };
  }

  async cancel(actor: MeetingActor, meetingId: string) {
    const meeting = await this.findMeetingForManagement(actor, meetingId);
    if (meeting.status !== 'SCHEDULED') throw new ConflictException('لا يمكن إلغاء اجتماع بدأ بالفعل.');
    await this.prisma.nexusMeeting.update({ where: { id: meeting.id }, data: { status: 'CANCELLED', endedAt: new Date() } });
    await this.prisma.auditLog.create({
      data: { schoolId: meeting.schoolId, userId: actor.userId, action: 'nexus_meeting.cancelled', entityType: 'nexus_meeting', entityId: meeting.id },
    });
    return { ok: true, status: 'CANCELLED' };
  }

  async removeParticipant(actor: MeetingActor, meetingId: string, participantId: string) {
    const meeting = await this.findMeetingForManagement(actor, meetingId);
    if (actor.userId === participantId) throw new BadRequestException('لا يمكن للمنظم إزالة نفسه.');
    if (meeting.status !== 'LIVE') throw new ConflictException('الاجتماع ليس في حالة بث مباشر.');
    const isParticipant = await this.prisma.nexusMeetingParticipant.findUnique({
      where: { meetingId_userId: { meetingId, userId: participantId } },
      select: { userId: true },
    });
    if (!isParticipant) throw new NotFoundException('المشارك غير موجود في هذا الاجتماع.');
    const config = this.liveKitConfig();
    if (config) {
      await this.roomService(config).removeParticipant(meeting.roomName, participantId, { revokeTokenTs: BigInt(Math.floor(Date.now() / 1000)) }).catch(() => undefined);
    }
    await this.prisma.nexusMeetingParticipant.updateMany({ where: { meetingId, userId: participantId }, data: { leftAt: new Date() } });
    await this.prisma.nexusMeetingActivePeer.deleteMany({ where: { meetingId, userId: participantId } });
    
    // Broadcast kick signal to the participant
    await this.prisma.nexusMeetingSignal.create({
      data: {
        meetingId,
        fromUserId: actor.userId,
        toUserId: participantId,
        signalData: JSON.stringify({ type: 'kick', reason: 'removed_by_host' }),
      },
    });
    return { ok: true };
  }

  async muteParticipant(actor: MeetingActor, meetingId: string, participantId: string) {
    const meeting = await this.findMeetingForManagement(actor, meetingId);
    if (meeting.status !== 'LIVE') throw new ConflictException('الاجتماع ليس في حالة بث مباشر.');
    await this.prisma.nexusMeetingActivePeer.updateMany({
      where: { meetingId, userId: participantId },
      data: { micOn: false },
    });
    
    // Broadcast mute signal to the participant
    await this.prisma.nexusMeetingSignal.create({
      data: {
        meetingId,
        fromUserId: actor.userId,
        toUserId: participantId,
        signalData: JSON.stringify({ type: 'mute', fromUserId: actor.userId }),
      },
    });
    return { ok: true };
  }

  private async findMeetingForManagement(actor: MeetingActor, meetingId: string) {
    const schoolId = this.schoolId(actor);
    await this.assertActiveAccount(actor, schoolId);
    const meeting = await this.prisma.nexusMeeting.findFirst({ where: { id: meetingId, schoolId }, select: { id: true, schoolId: true, hostId: true, roomName: true, status: true } });
    if (!meeting) throw new NotFoundException('الاجتماع غير موجود.');
    if (meeting.hostId !== actor.userId && !MEETING_MANAGER_ROLES.has(actor.role)) throw new ForbiddenException('إدارة الاجتماع محصورة على المنظم أو إدارة المدرسة.');
    return meeting;
  }

  private displayName(user: { name?: string | null; firstName?: string | null; lastName?: string | null }) {
    return user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'عضو نكسس';
  }

  private publicUser<T extends { id: string; name?: string | null; firstName?: string | null; lastName?: string | null; role: string; avatar?: string | null }>(user: T) {
    return { id: user.id, name: this.displayName(user), role: user.role, avatar: user.avatar };
  }
}

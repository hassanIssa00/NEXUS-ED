import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
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
export class MeetingsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async onModuleInit() {
    await this.ensureTables().catch((err) => {
      // Non-fatal if tables cannot be created immediately (e.g. offline dev or pool startup)
      console.warn('Nexus meeting tables init warning:', err?.message || err);
    });
  }

  private async ensureTables() {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS nexus_meeting_signals (
        id TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL,
        from_user_id TEXT NOT NULL,
        to_user_id TEXT NOT NULL,
        signal_data TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_signals_meeting_to ON nexus_meeting_signals (meeting_id, to_user_id);

      CREATE TABLE IF NOT EXISTS nexus_meeting_active_peers (
        meeting_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        role TEXT NOT NULL,
        is_host BOOLEAN NOT NULL DEFAULT FALSE,
        mic_on BOOLEAN NOT NULL DEFAULT TRUE,
        camera_on BOOLEAN NOT NULL DEFAULT TRUE,
        raised_hand BOOLEAN NOT NULL DEFAULT FALSE,
        is_screen_sharing BOOLEAN NOT NULL DEFAULT FALSE,
        last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (meeting_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS nexus_meeting_messages (
        id TEXT PRIMARY KEY,
        meeting_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_messages_meeting ON nexus_meeting_messages (meeting_id, created_at);
    `);
  }

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
      // Register or refresh active peer in the database
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO nexus_meeting_active_peers (meeting_id, user_id, user_name, role, is_host, mic_on, camera_on, raised_hand, is_screen_sharing, last_seen)
         VALUES ($1, $2, $3, $4, $5, true, false, false, false, NOW())
         ON CONFLICT (meeting_id, user_id) DO UPDATE SET
           user_name = EXCLUDED.user_name,
           last_seen = NOW()`,
        meeting.id,
        actor.userId,
        displayName,
        actor.role,
        isHost,
      ).catch(() => undefined);

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

    // Update active peer presence
    await this.prisma.$executeRawUnsafe(
      `UPDATE nexus_meeting_active_peers
       SET mic_on = COALESCE($1, mic_on),
           camera_on = COALESCE($2, camera_on),
           raised_hand = COALESCE($3, raised_hand),
           is_screen_sharing = COALESCE($4, is_screen_sharing),
           last_seen = NOW()
       WHERE meeting_id = $5 AND user_id = $6`,
      input.micOn ?? null,
      input.cameraOn ?? null,
      input.raisedHand ?? null,
      input.isScreenSharing ?? null,
      meetingId,
      actor.userId,
    ).catch(() => undefined);

    // Prune peers not seen for 25 seconds
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM nexus_meeting_active_peers WHERE meeting_id = $1 AND last_seen < NOW() - INTERVAL '25 seconds'`,
      meetingId,
    ).catch(() => undefined);

    // Query active peers
    const rawPeers = await this.prisma.$queryRawUnsafe(
      `SELECT user_id as "userId", user_name as "userName", role, is_host as "isHost",
              mic_on as "micOn", camera_on as "cameraOn", raised_hand as "raisedHand",
              is_screen_sharing as "isScreenSharing"
       FROM nexus_meeting_active_peers
       WHERE meeting_id = $1
       ORDER BY is_host DESC, user_name ASC`,
      meetingId,
    ).catch(() => []);
    const peers = Array.isArray(rawPeers) ? rawPeers : [];

    // Query new chat messages
    const lastTime = input.lastMessageTime ? new Date(input.lastMessageTime) : new Date(Date.now() - 60_000);
    const rawMessages = await this.prisma.$queryRawUnsafe(
      `SELECT id, user_id as "userId", user_name as "userName", message, created_at as "createdAt"
       FROM nexus_meeting_messages
       WHERE meeting_id = $1 AND created_at > $2
       ORDER BY created_at ASC
       LIMIT 50`,
      meetingId,
      lastTime,
    ).catch(() => []);
    const messages = Array.isArray(rawMessages) ? rawMessages : [];

    return {
      meetingStatus: meeting.status,
      peers,
      messages: messages.map((m) => ({
        id: m.id,
        userId: m.userId,
        userName: m.userName,
        message: m.message,
        createdAt: new Date(m.createdAt).getTime(),
      })),
    };
  }

  async sendSignal(actor: MeetingActor, meetingId: string, input: MeetingSignalDto) {
    const id = randomUUID();
    const signalData = JSON.stringify(input.signal);
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO nexus_meeting_signals (id, meeting_id, from_user_id, to_user_id, signal_data, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      id,
      meetingId,
      actor.userId,
      input.toUserId,
      signalData,
    ).catch(() => undefined);
    return { ok: true };
  }

  async getSignals(actor: MeetingActor, meetingId: string) {
    const rawSignals = await this.prisma.$queryRawUnsafe(
      `SELECT id, from_user_id as "fromUserId", signal_data as "signalData", created_at as "createdAt"
       FROM nexus_meeting_signals
       WHERE meeting_id = $1 AND to_user_id = $2
       ORDER BY created_at ASC`,
      meetingId,
      actor.userId,
    ).catch(() => []);
    const signals = Array.isArray(rawSignals) ? rawSignals : [];

    if (signals.length > 0) {
      await this.prisma.$executeRawUnsafe(
        `DELETE FROM nexus_meeting_signals WHERE meeting_id = $1 AND to_user_id = $2`,
        meetingId,
        actor.userId,
      ).catch(() => undefined);
    }

    // Opportunistically prune signals older than 60 seconds
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM nexus_meeting_signals WHERE created_at < NOW() - INTERVAL '60 seconds'`,
    ).catch(() => undefined);

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
        createdAt: s.createdAt,
      };
    });
  }

  async sendChat(actor: MeetingActor, meetingId: string, input: MeetingChatDto) {
    const meeting = await this.findAuthorizedMeeting(actor, meetingId);
    const participant = meeting.participants.find((item) => item.userId === actor.userId);
    const displayName = this.displayName(actor.userId === meeting.host.id ? meeting.host : (participant?.user || {}));
    const id = randomUUID();
    const cleanMessage = input.message.trim().slice(0, 1200);

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO nexus_meeting_messages (id, meeting_id, user_id, user_name, message, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      id,
      meetingId,
      actor.userId,
      displayName,
      cleanMessage,
    );

    return {
      id,
      userId: actor.userId,
      userName: displayName,
      message: cleanMessage,
      createdAt: Date.now(),
    };
  }

  async leave(actor: MeetingActor, meetingId: string) {
    const meeting = await this.findAuthorizedMeeting(actor, meetingId);
    await this.prisma.nexusMeetingParticipant.updateMany({
      where: { meetingId: meeting.id, userId: actor.userId, joinedAt: { not: null } },
      data: { leftAt: new Date() },
    });
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM nexus_meeting_active_peers WHERE meeting_id = $1 AND user_id = $2`,
      meeting.id,
      actor.userId,
    ).catch(() => undefined);
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
    await this.prisma.$executeRawUnsafe(`DELETE FROM nexus_meeting_active_peers WHERE meeting_id = $1`, meeting.id).catch(() => undefined);
    await this.prisma.$executeRawUnsafe(`DELETE FROM nexus_meeting_signals WHERE meeting_id = $1`, meeting.id).catch(() => undefined);
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
    await this.prisma.$executeRawUnsafe(`DELETE FROM nexus_meeting_active_peers WHERE meeting_id = $1 AND user_id = $2`, meetingId, participantId).catch(() => undefined);
    
    // Broadcast kick signal to the participant
    const kickSignal = JSON.stringify({ type: 'kick', reason: 'removed_by_host' });
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO nexus_meeting_signals (id, meeting_id, from_user_id, to_user_id, signal_data, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      randomUUID(),
      meetingId,
      actor.userId,
      participantId,
      kickSignal,
    ).catch(() => undefined);
    return { ok: true };
  }

  async muteParticipant(actor: MeetingActor, meetingId: string, participantId: string) {
    const meeting = await this.findMeetingForManagement(actor, meetingId);
    if (meeting.status !== 'LIVE') throw new ConflictException('الاجتماع ليس في حالة بث مباشر.');
    await this.prisma.$executeRawUnsafe(
      `UPDATE nexus_meeting_active_peers SET mic_on = false WHERE meeting_id = $1 AND user_id = $2`,
      meetingId,
      participantId,
    ).catch(() => undefined);
    
    // Broadcast mute signal to the participant
    const muteSignal = JSON.stringify({ type: 'mute', fromUserId: actor.userId });
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO nexus_meeting_signals (id, meeting_id, from_user_id, to_user_id, signal_data, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      randomUUID(),
      meetingId,
      actor.userId,
      participantId,
      muteSignal,
    ).catch(() => undefined);
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

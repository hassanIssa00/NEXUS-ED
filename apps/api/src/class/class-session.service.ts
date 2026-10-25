import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AccessToken, EgressClient, EgressStatus, EncodedFileOutput, EncodedFileType, RoomServiceClient, S3Upload } from 'livekit-server-sdk';
import { PrismaService } from '../prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { UploadService } from '../upload/upload.service';

type LiveKitConfig = { internalUrl: string; publicUrl: string; apiKey: string; apiSecret: string };

@Injectable()
export class ClassSessionService {
  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
    private uploads: UploadService,
  ) {}

  private async authorizeClass(classId: string, actorId: string, role: string, schoolId?: string) {
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    const classroom = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
      select: {
        id: true,
        schoolId: true,
        teacherId: true,
        classSubjects: { select: { teacherId: true } },
        teacherAssignments: { where: { teacherId: actorId }, select: { teacherId: true } },
      },
    });
    if (!classroom) throw new NotFoundException('Class not found');

    if (role === 'TEACHER') {
      const assigned = classroom.teacherId === actorId
        || classroom.classSubjects.some((item) => item.teacherId === actorId)
        || classroom.teacherAssignments.length > 0;
      if (!assigned) throw new ForbiddenException('You are not assigned to this class');
    } else if (role === 'STUDENT') {
      const enrollment = await this.prisma.enrollment.findFirst({ where: { classId, studentId: actorId }, select: { id: true } });
      if (!enrollment) throw new ForbiddenException('You are not enrolled in this class');
    }
    return classroom;
  }

  private liveKitConfig(): LiveKitConfig {
    const internalUrl = process.env.LIVEKIT_INTERNAL_URL?.trim();
    const publicUrl = process.env.LIVEKIT_PUBLIC_URL?.trim();
    const apiKey = process.env.LIVEKIT_API_KEY?.trim();
    const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
    if (!internalUrl || !publicUrl || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException('البث الداخلي غير مهيأ. أضف إعدادات خادم LiveKit للمدرسة.');
    }
    let internal: URL;
    let publicAddress: URL;
    try { internal = new URL(internalUrl); publicAddress = new URL(publicUrl); }
    catch { throw new ServiceUnavailableException('عنوان خادم البث غير صالح.'); }
    if (!['http:', 'https:'].includes(internal.protocol) ||
      (publicAddress.protocol !== 'wss:' && !(publicAddress.protocol === 'ws:' && publicAddress.hostname === 'localhost'))) {
      throw new ServiceUnavailableException('يجب إعداد عنوان داخلي صالح واتصال بث عام آمن.');
    }
    return { internalUrl: internalUrl.replace(/\/$/, ''), publicUrl, apiKey, apiSecret };
  }

  private roomService(config = this.liveKitConfig()) {
    return new RoomServiceClient(config.internalUrl, config.apiKey, config.apiSecret);
  }

  private recordingStorageConfig() {
    const endpoint = process.env.LIVEKIT_RECORDING_S3_ENDPOINT?.trim();
    const accessKey = process.env.LIVEKIT_RECORDING_S3_ACCESS_KEY?.trim();
    const secret = process.env.LIVEKIT_RECORDING_S3_SECRET?.trim();
    const bucket = process.env.LIVEKIT_RECORDING_S3_BUCKET?.trim() || 'assignments';
    const region = process.env.LIVEKIT_RECORDING_S3_REGION?.trim() || 'ap-southeast-1';
    if (!endpoint || !accessKey || !secret) return null;
    try {
      const parsed = new URL(endpoint);
      if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) return null;
    } catch { return null; }
    return { endpoint: endpoint.replace(/\/$/, ''), accessKey, secret, bucket, region };
  }

  private async beginRecording(session: { id: string; classId: string; roomName: string | null }, schoolId: string) {
    const storage = this.recordingStorageConfig();
    if (!session.roomName || !storage) {
      return this.prisma.classSession.update({
        where: { id: session.id }, data: { recordingStatus: 'NOT_CONFIGURED' },
      });
    }
    const config = this.liveKitConfig();
    const objectKey = `live-recordings/${schoolId}/${session.id}.mp4`;
    try {
      const egress = new EgressClient(config.internalUrl, config.apiKey, config.apiSecret);
      const file = new EncodedFileOutput({
        fileType: EncodedFileType.MP4,
        filepath: objectKey,
        output: {
          case: 's3',
          value: new S3Upload({
            accessKey: storage.accessKey,
            secret: storage.secret,
            bucket: storage.bucket,
            region: storage.region,
            endpoint: storage.endpoint,
            forcePathStyle: true,
          }),
        },
      });
      const info = await egress.startRoomCompositeEgress(session.roomName, { file }, { layout: 'grid' });
      return await this.prisma.classSession.update({
        where: { id: session.id },
        data: { recordingEgressId: info.egressId, recordingObjectKey: objectKey, recordingStatus: 'RECORDING' },
      });
    } catch {
      return this.prisma.classSession.update({
        where: { id: session.id }, data: { recordingObjectKey: objectKey, recordingStatus: 'FAILED' },
      });
    }
  }

  private async stopRecording(session: { id: string; recordingEgressId: string | null; recordingStatus: string }) {
    if (!session.recordingEgressId || session.recordingStatus !== 'RECORDING') return;
    try {
      const config = this.liveKitConfig();
      await new EgressClient(config.internalUrl, config.apiKey, config.apiSecret).stopEgress(session.recordingEgressId);
      await this.prisma.classSession.update({ where: { id: session.id }, data: { recordingStatus: 'PROCESSING' } });
    } catch {
      // The reconciliation job checks the egress state and finalizes the recording later.
    }
  }

  private async reconcileRecordings() {
    const rows = await this.prisma.classSession.findMany({
      where: { recordingEgressId: { not: null }, recordingStatus: { in: ['RECORDING', 'PROCESSING'] } },
      select: { id: true, recordingEgressId: true }, take: 500,
    });
    if (!rows.length) return 0;
    let updated = 0;
    let config: LiveKitConfig;
    try { config = this.liveKitConfig(); } catch { return 0; }
    const egress = new EgressClient(config.internalUrl, config.apiKey, config.apiSecret);
    for (const row of rows) {
      try {
        const [info] = await egress.listEgress({ egressId: row.recordingEgressId! });
        if (!info) continue;
        let status = 'PROCESSING';
        if (info.status === EgressStatus.EGRESS_COMPLETE) status = 'READY';
        else if ([EgressStatus.EGRESS_FAILED, EgressStatus.EGRESS_ABORTED, EgressStatus.EGRESS_LIMIT_REACHED].includes(info.status)) status = 'FAILED';
        else if (info.status === EgressStatus.EGRESS_ACTIVE) status = 'RECORDING';
        const result = await this.prisma.classSession.updateMany({ where: { id: row.id, recordingStatus: { not: status } }, data: { recordingStatus: status } });
        updated += result.count;
      } catch {
        // Keep the previous state and retry on the next reconciliation interval.
      }
    }
    return updated;
  }

  private async ensureRoom(rooms: RoomServiceClient, roomName: string, metadata: Record<string, string>) {
    const existing = await rooms.listRooms([roomName]).catch((error) => {
      throw new ServiceUnavailableException('تعذر الاتصال بخادم البث المباشر.', { cause: error });
    });
    if (existing.some((room) => room.name === roomName)) return;
    try {
      await rooms.createRoom({ name: roomName, emptyTimeout: 120, departureTimeout: 30, maxParticipants: 64, metadata: JSON.stringify(metadata) });
    } catch (error) {
      const appeared = await rooms.listRooms([roomName]).then((rows) => rows.some((room) => room.name === roomName)).catch(() => false);
      if (!appeared) throw new ServiceUnavailableException('تعذر إنشاء غرفة البث. تحقق من خدمة LiveKit.', { cause: error });
    }
  }

  private meetingEnd(session: { startTime: Date; duration: number }) {
    return session.startTime.getTime() + session.duration * 60_000;
  }

  private schoolDayStart(value: Date) {
    const timeZone = process.env.SCHOOL_TIME_ZONE?.trim() || 'Asia/Riyadh';
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(value).map((part) => [part.type, part.value]));
    return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`);
  }

  private schoolClock(value = new Date()) {
    const timeZone = process.env.SCHOOL_TIME_ZONE?.trim() || 'Asia/Riyadh';
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(value).map((part) => [part.type, part.value]));
    const dayOfWeek = ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[parts.weekday];
    return { dayOfWeek, date: new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`), minuteOfDay: Number(parts.hour) * 60 + Number(parts.minute) };
  }

  private scheduleMinute(value: string) {
    const match = /^(\d{1,2}):([0-5]\d)$/.exec(value || '');
    if (!match) return null;
    const hour = Number(match[1]);
    if (hour > 23) return null;
    return hour * 60 + Number(match[2]);
  }

  private async recordScheduledAbsences(classId?: string) {
    const clock = this.schoolClock();
    if (clock.dayOfWeek === undefined) return 0;
    const schedule = await this.prisma.scheduleEvent.findMany({
      where: { dayOfWeek: clock.dayOfWeek, ...(classId ? { classId } : {}) },
      select: { endTime: true, subject: { select: { name: true } }, class: { select: { id: true, schoolId: true, students: { select: { studentId: true } } } } },
    });
    const dueByClass = new Map<string, { schoolId: string; subjectNames: Set<string>; studentIds: Set<string> }>();
    for (const event of schedule) {
      const endMinute = this.scheduleMinute(event.endTime);
      if (endMinute === null || endMinute > clock.minuteOfDay) continue;
      const item = dueByClass.get(event.class.id) || { schoolId: event.class.schoolId, subjectNames: new Set<string>(), studentIds: new Set<string>() };
      item.subjectNames.add(event.subject.name);
      for (const enrollment of event.class.students) item.studentIds.add(enrollment.studentId);
      dueByClass.set(event.class.id, item);
    }
    let absentCount = 0;
    for (const [classId, item] of dueByClass) {
      if (!item.studentIds.size) continue;
      const existing = await this.prisma.attendance.findMany({
        where: { classId, date: clock.date, studentId: { in: [...item.studentIds] } },
        select: { studentId: true },
      });
      const existingIds = new Set(existing.map((row) => row.studentId));
      const missingIds = [...item.studentIds].filter((studentId) => !existingIds.has(studentId));
      if (!missingIds.length) continue;
      const result = await this.prisma.attendance.createMany({
        data: missingIds.map((studentId) => ({
          studentId, classId, date: clock.date, status: 'ABSENT' as const,
          notes: `غياب تلقائي بعد انتهاء الحصة: ${[...item.subjectNames].join('، ')}`,
        })),
        skipDuplicates: true,
      });
      absentCount += result.count;
      if (item.schoolId) await this.prisma.auditLog.create({
        data: { schoolId: item.schoolId, action: 'attendance.scheduled_absences.finalized', entityType: 'class', entityId: classId, metadata: { date: clock.date.toISOString(), absentCount: result.count, subjects: [...item.subjectNames] } },
      });
    }
    return absentCount;
  }

  async startSession(classId: string, teacherId: string, schoolId: string, title: string, duration = 60) {
    await this.authorizeClass(classId, teacherId, 'TEACHER', schoolId);
    if (!title?.trim()) throw new BadRequestException('Session title is required');
    if (!Number.isInteger(duration) || duration < 1 || duration > 240) throw new BadRequestException('Session duration must be between 1 and 240 minutes');

    const config = this.liveKitConfig();
    const rooms = this.roomService(config);
    const activeSessions = await this.prisma.classSession.findMany({ where: { classId, isActive: true } });
    const id = randomUUID();
    const roomName = `nexus-class-${id.replace(/-/g, '')}`;
    await this.ensureRoom(rooms, roomName, { sessionId: id, classId, schoolId });

    let session;
    try {
      session = await this.prisma.$transaction(async (tx) => {
        const now = new Date();
        await tx.classSession.updateMany({ where: { classId, isActive: true }, data: { isActive: false, endedAt: now } });
        const created = await tx.classSession.create({
          data: { id, classId, teacherId, title: title.trim(), startTime: now, duration, isActive: true, roomName },
          include: { teacher: { select: { name: true, avatar: true } } },
        });
        await tx.auditLog.create({ data: { schoolId, userId: teacherId, action: 'class_session.started', entityType: 'class_session', entityId: created.id, metadata: { classId, title: created.title, duration, liveKit: true } } });
        return created;
      });
    } catch (error) {
      await rooms.deleteRoom(roomName).catch(() => undefined);
      throw error;
    }

    for (const old of activeSessions) {
      await this.stopRecording(old);
      await this.recordAbsentStudents(old, schoolId);
      if (old.roomName) await rooms.deleteRoom(old.roomName).catch(() => undefined);
    }
    return this.beginRecording(session, schoolId);
  }

  private async recordAbsentStudents(session: { id: string; classId: string; startTime: Date; title: string }, schoolId?: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classId: session.classId }, select: { studentId: true },
    });
    if (!enrollments.length) return;
    const joined = await this.prisma.classSessionAttendance.findMany({ where: { sessionId: session.id, status: 'PRESENT' }, select: { studentId: true } });
    const presentIds = new Set(joined.map((row) => row.studentId));
    const absentIds = enrollments.map((row) => row.studentId).filter((studentId) => !presentIds.has(studentId));
    if (!absentIds.length) return;

    const date = this.schoolDayStart(session.startTime);
    await this.prisma.$transaction(async (tx) => {
      await tx.classSessionAttendance.createMany({
        data: absentIds.map((studentId) => ({ sessionId: session.id, studentId, status: 'ABSENT' as const })),
        skipDuplicates: true,
      });
      const existingDaily = await tx.attendance.findMany({ where: { classId: session.classId, date: { gte: date, lt: new Date(date.getTime() + 86_400_000) } }, select: { studentId: true, status: true } });
      const dailyStatus = new Map(existingDaily.map((row) => [row.studentId, row.status]));
      const absentDaily = absentIds.filter((studentId) => !dailyStatus.has(studentId));
      if (absentDaily.length) {
        await tx.attendance.createMany({ data: absentDaily.map((studentId) => ({
          studentId, classId: session.classId, date, status: 'ABSENT' as const, notes: `غياب تلقائي بعد انتهاء البث: ${session.title}`,
        })), skipDuplicates: true });
      }
      if (schoolId) await tx.auditLog.create({ data: { schoolId, userId: null, action: 'class_session.absences_finalized', entityType: 'class_session', entityId: session.id, metadata: { classId: session.classId, absentCount: absentIds.length } } });
    });
  }

  private async finishExpired(session: { id: string; classId: string; teacherId: string; title: string; startTime: Date; duration: number; isActive: boolean; roomName: string | null; recordingEgressId: string | null; recordingStatus: string }, schoolId?: string, force = false) {
    if (!session.isActive || (!force && this.meetingEnd(session) > Date.now())) return false;
    const endedAt = new Date();
    const updated = await this.prisma.classSession.updateMany({ where: { id: session.id, isActive: true }, data: { isActive: false, endedAt } });
    if (!updated.count) return false;
    await this.stopRecording(session);
    if (session.roomName) {
      try { await this.roomService().deleteRoom(session.roomName); } catch { /* preserve end-of-class attendance if LiveKit is unreachable */ }
    }
    await this.recordAbsentStudents(session, schoolId);
    return true;
  }

  async endSession(sessionId: string, actorId: string, role: string, schoolId?: string) {
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    const session = await this.prisma.classSession.findFirst({
      where: { id: sessionId, class: { schoolId } },
      include: { class: { select: {
        id: true,
        schoolId: true,
        teacherId: true,
        classSubjects: { select: { teacherId: true } },
        teacherAssignments: { where: { teacherId: actorId }, select: { teacherId: true } },
      } } },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (role === 'TEACHER') {
      const assigned = session.class.teacherId === actorId
        || session.class.classSubjects.some((item) => item.teacherId === actorId)
        || session.class.teacherAssignments.length > 0;
      if (!assigned || session.teacherId !== actorId) throw new ForbiddenException('Only the session teacher can end this session');
    }
    if (session.isActive) await this.finishExpired(session, schoolId, true);
    const ended = await this.prisma.classSession.findUnique({ where: { id: sessionId } });
    if (!ended) return null;
    const { roomName: _roomName, meetingUrl: _meetingUrl, recordingEgressId: _recordingEgressId, recordingObjectKey: _recordingObjectKey, ...safeSession } = ended;
    return safeSession;
  }

  async getActiveSession(classId: string, actorId: string, role: string, schoolId?: string) {
    await this.authorizeClass(classId, actorId, role, schoolId);
    const active = await this.prisma.classSession.findFirst({ where: { classId, isActive: true, class: { schoolId } }, orderBy: { startTime: 'desc' } });
    if (active && await this.finishExpired(active, schoolId)) return null;
    const session = active ? active : await this.prisma.classSession.findFirst({ where: { classId, isActive: true, class: { schoolId } }, orderBy: { startTime: 'desc' } });
    if (!session) return null;
    const { roomName: _roomName, meetingUrl: _meetingUrl, recordingEgressId: _recordingEgressId, recordingObjectKey: _recordingObjectKey, ...safeSession } = session;
    return safeSession;
  }

  async getSessionHistory(classId: string, actorId: string, role: string, schoolId?: string) {
    await this.authorizeClass(classId, actorId, role, schoolId);
    await this.recordScheduledAbsences(classId);
    const sessions = await this.prisma.classSession.findMany({ where: { classId, class: { schoolId } }, orderBy: { startTime: 'desc' }, take: 30 });
    for (const session of sessions) await this.finishExpired(session, schoolId);
    await this.reconcileRecordings();
    return this.prisma.classSession.findMany({
      where: { classId, class: { schoolId } }, orderBy: { startTime: 'desc' }, take: 30,
      include: { attendance: { select: { studentId: true, status: true, joinedAt: true } } },
    }).then((rows) => rows.map(({ roomName: _roomName, meetingUrl: _meetingUrl, recordingEgressId: _recordingEgressId, recordingObjectKey: _recordingObjectKey, ...row }) => row));
  }

  async joinSession(classId: string, sessionId: string, actorId: string, role: string, schoolId?: string) {
    await this.authorizeClass(classId, actorId, role, schoolId);
    if (role !== 'TEACHER' && role !== 'STUDENT') throw new ForbiddenException('This class broadcast is available to enrolled students and the teacher');
    const session = await this.prisma.classSession.findFirst({ where: { id: sessionId, classId, class: { schoolId } } });
    if (!session) throw new NotFoundException('جلسة الفصل غير موجودة.');
    if (!session.isActive || this.meetingEnd(session) <= Date.now()) {
      if (session.isActive) await this.finishExpired(session, schoolId);
      throw new ConflictException('انتهت هذه الجلسة أو لم تعد مفتوحة.');
    }
    if (!session.roomName) throw new ServiceUnavailableException('هذه الجلسة قديمة ولا تحتوي على غرفة بث داخلية.');
    const config = this.liveKitConfig();
    const rooms = this.roomService(config);
    await this.ensureRoom(rooms, session.roomName, { sessionId: session.id, classId, schoolId: schoolId || '' });
    const user = await this.prisma.user.findFirst({ where: { id: actorId, schoolId, isActive: true }, select: { name: true, firstName: true, lastName: true } });
    if (!user) throw new ForbiddenException('الحساب غير نشط.');
    const token = new AccessToken(config.apiKey, config.apiSecret, {
      identity: actorId,
      name: user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || (role === 'STUDENT' ? 'طالب' : 'معلم'),
      ttl: '2h',
    });
    token.addGrant({ roomJoin: true, room: session.roomName, canPublish: true, canSubscribe: true, canPublishData: true });
    return { url: config.publicUrl, token: await token.toJwt(), session: { id: session.id, title: session.title, classId: session.classId, teacherId: session.teacherId, startTime: session.startTime, duration: session.duration } };
  }

  async retryRecording(classId: string, sessionId: string, actorId: string, schoolId?: string) {
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    const session = await this.prisma.classSession.findFirst({ where: { id: sessionId, classId, isActive: true, teacherId: actorId, class: { schoolId } } });
    if (!session) throw new NotFoundException('جلسة البث غير متاحة لهذا المعلم.');
    if (session.recordingStatus === 'RECORDING' || session.recordingStatus === 'PROCESSING' || session.recordingStatus === 'READY') {
      throw new ConflictException('يوجد تسجيل نشط أو محفوظ لهذه الجلسة بالفعل.');
    }
    return this.beginRecording(session, schoolId);
  }

  async getRecordingDownload(classId: string, sessionId: string, actorId: string, role: string, schoolId?: string) {
    await this.authorizeClass(classId, actorId, role, schoolId);
    const session = await this.prisma.classSession.findFirst({
      where: { id: sessionId, classId, class: { schoolId } },
      select: { id: true, recordingObjectKey: true, recordingStatus: true },
    });
    if (!session) throw new NotFoundException('التسجيل غير موجود.');
    if (session.recordingStatus !== 'READY' || !session.recordingObjectKey) {
      throw new ConflictException('ملف التسجيل لم يجهز للتنزيل بعد.');
    }
    const bucket = process.env.LIVEKIT_RECORDING_S3_BUCKET?.trim() || 'assignments';
    const url = await this.uploads.getSignedUrlForReference(`storage://${bucket}/${session.recordingObjectKey}`, 60 * 60);
    return { url, expiresInSeconds: 60 * 60 };
  }

  async recordStudentJoin(classId: string, sessionId: string, studentId: string, schoolId?: string) {
    const session = await this.prisma.classSession.findFirst({ where: { id: sessionId, classId, isActive: true, class: { schoolId } } });
    if (!session || !session.roomName) throw new NotFoundException('جلسة البث غير متاحة.');
    if (await this.finishExpired(session, schoolId)) throw new ConflictException('انتهى وقت الحصة ولم يعد تسجيل الحضور متاحًا.');
    await this.prisma.enrollment.findFirstOrThrow({ where: { classId, studentId, class: { schoolId } }, select: { id: true } }).catch(() => {
      throw new ForbiddenException('الطالب غير مسجل في هذا الفصل.');
    });
    await this.roomService().getParticipant(session.roomName, studentId).catch(() => {
      throw new ConflictException('لم يتم رصد اتصال الطالب بالبث بعد. أعد المحاولة بعد ظهور الفيديو.');
    });
    const now = new Date();
    const dailyDate = this.schoolDayStart(now);
    const existingDaily = await this.prisma.attendance.findUnique({ where: { studentId_classId_date: { studentId, classId, date: dailyDate } }, select: { id: true } });
    await this.prisma.$transaction([
      this.prisma.classSessionAttendance.upsert({
        where: { sessionId_studentId: { sessionId, studentId } },
        update: { status: 'PRESENT', joinedAt: now },
        create: { sessionId, studentId, status: 'PRESENT', joinedAt: now },
      }),
      this.prisma.attendance.upsert({
        where: { studentId_classId_date: { studentId, classId, date: dailyDate } },
        update: { status: 'PRESENT', notes: `حضور تلقائي من بث الحصة: ${session.title}` },
        create: { studentId, classId, date: dailyDate, status: 'PRESENT', notes: `حضور تلقائي من بث الحصة: ${session.title}` },
      }),
    ]);
    if (!existingDaily && this.gamification) await this.gamification.awardXp(studentId, 10, 'حضور حصة مباشرة', sessionId);
    return { status: 'PRESENT', joinedAt: now, sessionId };
  }

  async reconcileExpiredSessions() {
    const activeSessions = await this.prisma.classSession.findMany({ where: { isActive: true }, take: 500 });
    let endedCount = 0;
    for (const session of activeSessions) {
      const classRow = await this.prisma.class.findUnique({ where: { id: session.classId }, select: { schoolId: true } });
      if (await this.finishExpired(session, classRow?.schoolId)) endedCount += 1;
    }
    const scheduledAbsentCount = await this.recordScheduledAbsences();
    const recordingUpdates = await this.reconcileRecordings();
    return { endedCount, scheduledAbsentCount, recordingUpdates };
  }
}

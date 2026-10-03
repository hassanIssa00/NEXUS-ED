import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service';
import { Role } from '../shared/enums/roles.enum';
import { getJwtSecret } from '../config/jwt';

function isAllowedFrontendOrigin(origin?: string) {
  if (!origin) return true;
  const configuredOrigins =
    process.env.FRONTEND_URL ||
    (process.env.NODE_ENV === 'production'
      ? ''
      : 'http://localhost:3002,http://localhost:3000');
  return configuredOrigins
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(origin);
}

const SCHOOL_STAFF_ROLES = new Set<string>([
  Role.ADMIN,
  Role.PRINCIPAL,
  Role.VICE_PRINCIPAL,
  Role.COUNSELOR,
  Role.SUPERVISOR,
]);

interface AuthSocketUser {
  userId: string;
  role: string;
  schoolId: string;
}

interface SocketAccessTokenPayload {
  sub?: unknown;
  userId?: unknown;
  id?: unknown;
  schoolId?: unknown;
}

function setSocketUser(client: Socket, user: AuthSocketUser) {
  (client.data as unknown as { user: AuthSocketUser }).user = user;
}

function getSocketUser(client: Socket) {
  return (client.data as unknown as { user: AuthSocketUser }).user;
}

/**
 * Platform-wide real-time events gateway.
 * Handles notifications, assignments, grades, attendance, and more.
 *
 * Room Strategy:
 *   user:{userId}      – personal user room (notifications, grades, DMs)
 *   class:{classId}    – class room (new assignments, announcements)
 *   school:{schoolId}  – school-wide broadcasts
 */
@WebSocketGateway({
  cors: {
    origin: (origin, callback) =>
      callback(null, isAllowedFrontendOrigin(origin)),
    credentials: true,
  },
  namespace: 'events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  // Map of userId → socket ids (a user can have multiple tabs open)
  private userSocketMap = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  // ─────────────────────────────────────────
  // Connection lifecycle
  // ─────────────────────────────────────────
  async handleConnection(client: Socket) {
    try {
      const token: unknown =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (typeof token !== 'string' || !token) {
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify<SocketAccessTokenPayload>(token, {
        secret: getJwtSecret(),
      });
      const userId = [payload.sub, payload.userId, payload.id].find(
        (value): value is string =>
          typeof value === 'string' && value.length > 0,
      );
      if (!userId) {
        client.disconnect(true);
        return;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, schoolId: true, isActive: true },
      });
      const tokenSchoolId =
        typeof payload.schoolId === 'string' ? payload.schoolId : null;
      if (!user?.isActive || user.schoolId !== tokenSchoolId) {
        client.disconnect(true);
        return;
      }

      setSocketUser(client, {
        userId: user.id,
        role: user.role,
        schoolId: user.schoolId,
      });
      const schoolId = user.schoolId;

      // Personal room
      await client.join(`user:${userId}`);

      // School room
      if (schoolId) {
        await client.join(`school:${schoolId}`);
      }

      // Track sockets per user
      const userSockets = this.userSocketMap.get(userId) ?? new Set<string>();
      userSockets.add(client.id);
      this.userSocketMap.set(userId, userSockets);

      this.logger.log(`[CONNECT] user:${userId} socket:${client.id}`);

      // Confirm connection to client
      client.emit('connected', { userId, timestamp: new Date().toISOString() });
    } catch (e) {
      this.logger.warn(`[AUTH FAIL] ${client.id}: ${(e as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const socketUser = getSocketUser(client);
    const userId = socketUser?.userId;
    if (userId) {
      const userSockets = this.userSocketMap.get(userId);
      if (!userSockets) return;
      userSockets.delete(client.id);
      if (userSockets.size === 0) {
        this.userSocketMap.delete(userId);
      }
    }
    this.logger.log(`[DISCONNECT] socket:${client.id}`);
  }

  // ─────────────────────────────────────────
  // Client → Server: Join class rooms
  // ─────────────────────────────────────────
  @SubscribeMessage('joinClass')
  async handleJoinClass(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { classId?: unknown },
  ) {
    const user = getSocketUser(client);
    const classId =
      typeof data?.classId === 'string' ? data.classId.trim() : '';
    if (
      !user ||
      !user.userId ||
      !classId ||
      classId.length > 128 ||
      !user.schoolId
    ) {
      return { event: 'classJoinDenied', data: { classId: classId || null } };
    }

    const access = this.classAccessWhere(user.userId, user.role);
    if (!access) return { event: 'classJoinDenied', data: { classId } };

    const enrolledClass = await this.prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: user.schoolId,
        ...(access.length ? { OR: access } : {}),
      },
      select: { id: true },
    });
    if (!enrolledClass) return { event: 'classJoinDenied', data: { classId } };

    await client.join(`class:${classId}`);
    return { event: 'classJoined', data: { classId } };
  }

  @SubscribeMessage('leaveClass')
  async handleLeaveClass(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { classId: string },
  ) {
    if (typeof data?.classId === 'string' && data.classId.length <= 128) {
      await client.leave(`class:${data.classId}`);
    }
  }

  private classAccessWhere(userId: string, role: string) {
    if (role === 'STUDENT')
      return [{ students: { some: { studentId: userId } } }];
    if (role === 'PARENT') {
      return [
        {
          students: {
            some: { student: { parents: { some: { parentId: userId } } } },
          },
        },
      ];
    }
    if (role === 'TEACHER') {
      return [
        { teacherId: userId },
        { classSubjects: { some: { teacherId: userId } } },
      ];
    }
    if (SCHOOL_STAFF_ROLES.has(role)) return [];
    return null;
  }

  // ─────────────────────────────────────────
  // Server → Client: Emitters (called by services)
  // ─────────────────────────────────────────

  /** Push a new assignment to an entire class */
  emitNewAssignment(classId: string, assignment: Record<string, any>) {
    this.server.to(`class:${classId}`).emit('new_assignment', assignment);
    this.logger.log(`[EMIT] new_assignment → class:${classId}`);
  }

  /** Push a grade update to a specific student (and their parents) */
  emitGradeUpdate(userId: string, grade: Record<string, any>) {
    this.server.to(`user:${userId}`).emit('grade_updated', grade);
    this.logger.log(`[EMIT] grade_updated → user:${userId}`);
  }

  /** Push attendance status to a user (student / parents) */
  emitAttendanceMarked(userId: string, attendance: Record<string, any>) {
    this.server.to(`user:${userId}`).emit('attendance_marked', attendance);
    this.logger.log(`[EMIT] attendance_marked → user:${userId}`);
  }

  /** Push a notification to a specific user */
  emitNotification(userId: string, notification: Record<string, any>) {
    this.server.to(`user:${userId}`).emit('new_notification', notification);
    this.logger.log(`[EMIT] new_notification → user:${userId}`);
  }

  /** Push a real-time message to a user */
  emitMessage(userId: string, message: Record<string, any>) {
    this.server.to(`user:${userId}`).emit('new_message', message);
    this.logger.log(`[EMIT] new_message → user:${userId}`);
  }

  /** Broadcast a school-wide announcement */
  emitSchoolAnnouncement(schoolId: string, announcement: Record<string, any>) {
    this.server
      .to(`school:${schoolId}`)
      .emit('school_announcement', announcement);
    this.logger.log(`[EMIT] school_announcement → school:${schoolId}`);
  }

  /** Assignment auto-graded by AI — notify teacher */
  emitAssignmentGraded(teacherId: string, result: Record<string, any>) {
    this.server.to(`user:${teacherId}`).emit('assignment_graded', result);
    this.logger.log(`[EMIT] assignment_graded → user:${teacherId}`);
  }

  /** Check if a user is currently online */
  isUserOnline(userId: string): boolean {
    return (
      this.userSocketMap.has(userId) && this.userSocketMap.get(userId).size > 0
    );
  }

  /** Get count of connected users */
  getConnectedUsersCount(): number {
    return this.userSocketMap.size;
  }
}

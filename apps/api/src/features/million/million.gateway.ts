import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Namespace, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaService } from '../../core/database/prisma.service';
import { getJwtSecret } from '../../config/jwt';
import { Role } from '../../auth/role.enum';
import { validateRoomSettings } from '../../config/million.config';
import millionService from './million.service';
import type { RoomType, RoomSettings } from '../../types/million.types';

type MillionUser = { id: string; name: string; role: Role };
type MillionSocket = Socket & { data: { user?: MillionUser } };

function isAllowedFrontendOrigin(origin?: string) {
  if (!origin) return true;
  const configuredOrigins = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3002,http://localhost:3000');
  return configuredOrigins.split(',').map((value) => value.trim()).filter(Boolean).includes(origin);
}

@WebSocketGateway({
  namespace: 'million',
  cors: {
    origin: (origin, callback) => callback(null, isAllowedFrontendOrigin(origin)),
    credentials: true,
  },
})
export class MillionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Namespace;
  private readonly logger = new Logger(MillionGateway.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleConnection(client: MillionSocket) {
    try {
      const token = client.handshake.auth?.token;
      if (typeof token !== 'string' || !token) throw new Error('Authentication required');
      const claims = jwt.verify(token, getJwtSecret()) as Record<string, unknown>;
      const userId = [claims.userId, claims.sub, claims.id].find((value): value is string => typeof value === 'string' && value.length > 0);
      if (!userId) throw new Error('Invalid user');
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true, isActive: true } });
      if (!user?.isActive || String(user.role) !== String(Role.STUDENT)) throw new Error('Student account required');
      client.data.user = { id: user.id, name: user.name ?? 'طالب', role: user.role };
      client.emit('connected', { userId: user.id, timestamp: new Date().toISOString() });
    } catch (error) {
      this.logger.warn(`Rejected Million socket ${client.id}: ${(error as Error).message}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: MillionSocket) {
    const user = client.data?.user;
    if (!user) return;
    for (const roomId of client.rooms) {
      if (roomId === client.id) continue;
      try { await millionService.leaveRoom(user.id, roomId); } catch { /* The room may have already expired. */ }
      const sockets = await this.server.in(roomId).fetchSockets().catch(() => []);
      this.server.to(roomId).emit('room.left', { roomId, playerId: user.id, participantCount: sockets.length });
    }
  }

  @SubscribeMessage('create-room')
  async createRoom(@ConnectedSocket() client: MillionSocket, @MessageBody() data: { title?: string; type?: RoomType; settings?: RoomSettings }) {
    const user = client.data.user;
    if (!user) return { success: false, error: 'Not authenticated' };
    const title = data?.title?.trim();
    const type = data?.type;
    const settings = data?.settings ?? {};
    if (!title || title.length < 3 || title.length > 255 || !['public', 'private'].includes(type ?? '') || !validateRoomSettings(settings)) {
      return { success: false, error: 'بيانات الغرفة غير مكتملة أو غير صالحة.' };
    }
    try {
      const room = await millionService.createRoom(user.id, title, type, settings);
      await client.join(room.id);
      const fullRoom = await millionService.getRoom(room.id);
      this.server.emit('room.created', { roomId: room.id, room: fullRoom });
      return { success: true, room: fullRoom };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  @SubscribeMessage('join-room')
  async joinRoom(@ConnectedSocket() client: MillionSocket, @MessageBody() data: { roomId?: string }) {
    const user = client.data.user;
    const roomId = data?.roomId;
    if (!user || !roomId) return { success: false, error: 'بيانات الغرفة غير صالحة.' };
    try {
      const room = await millionService.getRoom(roomId);
      if (room.type === 'private' && room.host_id !== user.id) return { success: false, error: 'هذه الغرفة خاصة.' };
      const joinedRoom = await millionService.joinRoom(user.id, roomId);
      await client.join(roomId);
      const sockets = await this.server.in(roomId).fetchSockets();
      const fullRoom = await millionService.getRoom(roomId);
      this.server.to(roomId).emit('room.joined', { roomId, player: { id: user.id, name: user.name, isHost: joinedRoom.host_id === user.id }, participantCount: sockets.length });
      return { success: true, room: fullRoom };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  @SubscribeMessage('leave-room')
  async leaveRoom(@ConnectedSocket() client: MillionSocket, @MessageBody() data: { roomId?: string }) {
    const user = client.data.user;
    const roomId = data?.roomId;
    if (!user || !roomId) return { success: false, error: 'بيانات الغرفة غير صالحة.' };
    try {
      await millionService.leaveRoom(user.id, roomId);
      await client.leave(roomId);
      const sockets = await this.server.in(roomId).fetchSockets();
      this.server.to(roomId).emit('room.left', { roomId, playerId: user.id, participantCount: sockets.length });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  @SubscribeMessage('start-round')
  async startRound(@ConnectedSocket() client: MillionSocket, @MessageBody() data: { roomId?: string }) {
    const user = client.data.user;
    const roomId = data?.roomId;
    if (!user || !roomId) return { success: false, error: 'بيانات الغرفة غير صالحة.' };
    try {
      const round = await millionService.startRound(roomId, user.id);
      const questions = await millionService.getRoundQuestions(round.id);
      if (!questions.length) {
        await millionService.finishRound(round.id);
        return { success: false, error: 'لا توجد أسئلة منشورة لبدء الجولة.' };
      }
      const room = await millionService.getRoom(roomId);
      this.server.to(roomId).emit('round.started', { roomId, roundId: round.id, roundNumber: round.round_number, questionCount: questions.length, startedAt: round.started_at });
      void this.sendQuestions(roomId, round.id, questions, Number(room.settings?.timeLimit ?? 15));
      return { success: true, round };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  @SubscribeMessage('submit-answer')
  async submitAnswer(@ConnectedSocket() client: MillionSocket, @MessageBody() data: { roomId?: string; questionId?: number; chosenIndex?: number; timeTaken?: number }) {
    const user = client.data.user;
    const { roomId, questionId, chosenIndex, timeTaken } = data ?? {};
    if (!user || !roomId || !Number.isInteger(questionId) || !Number.isInteger(chosenIndex) || !Number.isFinite(timeTaken) || timeTaken < 0) {
      return { success: false, error: 'الإجابة غير مكتملة أو غير صالحة.' };
    }
    try {
      const result = await millionService.submitAnswer(user.id, roomId, questionId, chosenIndex, timeTaken);
      client.emit('answer.received', { acknowledged: true });
      const leaderboard = await millionService.getLeaderboard(roomId);
      // Keep the answer key private to the student who submitted it. Broadcasting
      // it to the room would reveal the correct answer to everyone else mid-round.
      client.emit('question.result', { questionId, correctIndex: result.correctIndex, scores: [{ userId: user.id, points: result.pointsAwarded, isCorrect: result.isCorrect }] });
      this.server.to(roomId).emit('leaderboard.updated', { roomId, leaderboard });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async sendQuestions(roomId: string, roundId: string, questions: any[], timeLimit: number) {
    for (let index = 0; index < questions.length; index += 1) {
      if (index) await new Promise((resolve) => setTimeout(resolve, 3000));
      const question = questions[index];
      this.server.to(roomId).emit('question.sent', { roomId, roundId, question: { id: question.id, text_ar: question.text_ar, options: question.options }, timeLimit, orderIndex: index, totalQuestions: questions.length });
      await new Promise((resolve) => setTimeout(resolve, timeLimit * 1000));
    }
    await millionService.finishRound(roundId);
    const leaderboard = await millionService.getLeaderboard(roomId);
    this.server.to(roomId).emit('round.finished', { roomId, roundId, finalLeaderboard: leaderboard, winner: leaderboard[0] });
  }
}

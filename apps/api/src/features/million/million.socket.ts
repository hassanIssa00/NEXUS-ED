import { Server, Socket, Namespace } from 'socket.io';
import jwt from 'jsonwebtoken';
import millionService from './million.service';
import type { RoomType } from '../../types/million.types';
import { getJwtSecret } from '../../config/jwt';

const JWT_SECRET = getJwtSecret();

interface SocketUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

interface Question {
  id: number;
  text_ar: string;
  options: string[];
}

interface CreateRoomDto {
  title: string;
  type: RoomType;
  settings: any;
}

interface JoinRoomDto {
  roomId: string;
}

interface StartRoundDto {
  roomId: string;
}

interface SubmitAnswerDto {
  roomId: string;
  questionId: number;
  chosenIndex: number;
  timeTaken: number;
}

/**
 * Setup Million Dialogue WebSocket Server
 */
export function setupMillionSocket(io: Server) {
  // Socket.IO namespace for Million Dialogue
  const millionNamespace = io.of('/million');

  // Authentication middleware
  millionNamespace.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      socket.user = {
        id: decoded.id || decoded.userId || decoded.sub,
        email: decoded.email,
        role: decoded.role || 'student',
        name: decoded.name || decoded.full_name,
      };

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  millionNamespace.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`✅ User connected: ${socket.user?.name} (${socket.id})`);

    /**
     * Event: create-room
     * Create a new game room
     */
    socket.on(
      'create-room',
      async (data: CreateRoomDto, callback: (response: any) => void) => {
        try {
          const { title, type, settings } = data;

          if (!socket.user) {
            return callback({ success: false, error: 'Not authenticated' });
          }

          const room = await millionService.createRoom(
            socket.user.id,
            title,
            type,
            settings,
          );

          // Join the socket room
          await socket.join(room.id);

          // Emit to the creator
          callback({ success: true, room });

          // Broadcast to all users
          millionNamespace.emit('room.created', { roomId: room.id, room });
        } catch (error: any) {
          console.error('Socket create-room error:', error);
          callback({ success: false, error: (error as Error).message });
        }
      },
    );

    /**
     * Event: join-room
     * Join an existing room
     */
    socket.on(
      'join-room',
      async (data: JoinRoomDto, callback: (response: any) => void) => {
        try {
          const { roomId } = data;

          if (!socket.user) {
            return callback({ success: false, error: 'Not authenticated' });
          }

          const room = await millionService.joinRoom(socket.user.id, roomId);

          // Join the socket room
          await socket.join(roomId);

          // Get participant count
          const sockets = await millionNamespace.in(roomId).fetchSockets();

          // Emit to the joiner
          callback({ success: true, room });

          // Broadcast to room
          millionNamespace.to(roomId).emit('room.joined', {
            roomId,
            player: {
              id: socket.user.id,
              name: socket.user.name,
              isHost: room.host_id === socket.user.id,
            },
            participantCount: sockets.length,
          });
        } catch (error: any) {
          console.error('Socket join-room error:', error);
          callback({ success: false, error: (error as Error).message });
        }
      },
    );

    /**
     * Event: leave-room
     * Leave a room
     */
    socket.on(
      'leave-room',
      async (data: JoinRoomDto, callback: (response: any) => void) => {
        try {
          const { roomId } = data;

          if (!socket.user) {
            return callback({ success: false, error: 'Not authenticated' });
          }

          await millionService.leaveRoom(socket.user.id, roomId);

          // Leave the socket room
          await socket.leave(roomId);

          // Get updated participant count
          const sockets = await millionNamespace.in(roomId).fetchSockets();

          // Emit to the leaver
          callback({ success: true });

          // Broadcast to room
          millionNamespace.to(roomId).emit('room.left', {
            roomId,
            playerId: socket.user.id,
            participantCount: sockets.length,
          });
        } catch (error: any) {
          console.error('Socket leave-room error:', error);
          callback({ success: false, error: (error as Error).message });
        }
      },
    );

    /**
     * Event: start-round
     * Start a new round (host only)
     */
    socket.on(
      'start-round',
      async (data: StartRoundDto, callback: (response: any) => void) => {
        try {
          const { roomId } = data;

          if (!socket.user) {
            return callback({ success: false, error: 'Not authenticated' });
          }

          const round = await millionService.startRound(roomId, socket.user.id);

          // Get questions for this round
          const questions = await millionService.getRoundQuestions(round.id);

          // Emit to the host
          callback({ success: true, round });

          // Broadcast round started to room
          millionNamespace.to(roomId).emit('round.started', {
            roomId,
            roundId: round.id,
            roundNumber: round.round_number,
            questionCount: questions.length,
            startedAt: round.started_at,
          });

          // Start sending questions
          sendQuestionsSequentially(
            millionNamespace,
            roomId,
            round.id,
            questions,
          );
        } catch (error: any) {
          console.error('Socket start-round error:', error);
          callback({ success: false, error: (error as Error).message });
        }
      },
    );

    /**
     * Event: submit-answer
     * Submit an answer to a question
     */
    socket.on(
      'submit-answer',
      async (data: SubmitAnswerDto, callback: (response: any) => void) => {
        try {
          const { roomId, questionId, chosenIndex, timeTaken } = data;

          if (!socket.user) {
            return callback({ success: false, error: 'Not authenticated' });
          }

          const result = await millionService.submitAnswer(
            socket.user.id,
            roomId,
            questionId,
            chosenIndex,
            timeTaken,
          );

          // Acknowledge answer received
          callback({ success: true });
          socket.emit('answer.received', { acknowledged: true });

          // Get updated leaderboard
          const leaderboard = await millionService.getLeaderboard(roomId);

          // Send the answer key only to the player who submitted this answer.
          // Broadcasting it to the room would reveal it during the active round.
          socket.emit('question.result', {
            questionId,
            correctIndex: result.correctIndex,
            scores: [
              {
                userId: socket.user.id,
                points: result.pointsAwarded,
                isCorrect: result.isCorrect,
              },
            ],
          });

          // Broadcast updated leaderboard
          millionNamespace.to(roomId).emit('leaderboard.updated', {
            roomId,
            leaderboard,
          });
        } catch (error: any) {
          console.error('Socket submit-answer error:', error);
          callback({ success: false, error: (error as Error).message });
        }
      },
    );

    /**
     * Event: disconnect
     * Handle disconnection
     */
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.user?.name} (${socket.id})`);
    });
  });

  console.log('✅ Million Dialogue WebSocket server initialized');
}

/**
 * Send questions sequentially with delays
 */
async function sendQuestionsSequentially(
  namespace: Namespace,
  roomId: string,
  roundId: string,
  questions: Question[],
) {
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];

    // Wait before sending next question (except first)
    if (i > 0) {
      await delay(3000); // 3 second delay between questions
    }

    // Send question without correct_index (prevent cheating)
    namespace.to(roomId).emit('question.sent', {
      roomId,
      roundId,
      question: {
        id: question.id,
        text_ar: question.text_ar,
        options: question.options,
        // Note: correct_index NOT included
      },
      timeLimit: 15, // Get from room settings
      orderIndex: i,
      totalQuestions: questions.length,
    });
  }

  // After all questions, finish the round
  await delay(15000); // Wait for last question time limit

  await millionService.finishRound(roundId);

  const leaderboard = await millionService.getLeaderboard(roomId);
  const winner = leaderboard[0];

  namespace.to(roomId).emit('round.finished', {
    roomId,
    roundId,
    finalLeaderboard: leaderboard,
    winner,
  });
}

/**
 * Helper: Delay function
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default setupMillionSocket;

import { generateToken } from '../../middleware/auth.middleware';
import setupMillionSocket from './million.socket';
import millionService from './million.service';

jest.mock('./million.service', () => ({
  __esModule: true,
  default: {
    createRoom: jest.fn(),
    joinRoom: jest.fn(),
    leaveRoom: jest.fn(),
    startRound: jest.fn(),
    getRoundQuestions: jest.fn(),
    submitAnswer: jest.fn(),
    getLeaderboard: jest.fn(),
    finishRound: jest.fn(),
  },
}));

type EventHandler = (data: any, callback: (response: any) => void) => Promise<void> | void;

function flushPromises() {
  return Promise.resolve().then(() => Promise.resolve());
}

describe('Million WebSocket', () => {
  const mockedMillionService = millionService as jest.Mocked<typeof millionService>;
  const socketHandlers: Record<string, EventHandler> = {};
  let authMiddleware: (socket: any, next: (error?: Error) => void) => void;
  let connectionHandler: (socket: any) => void;
  let roomEmitter: { emit: jest.Mock };
  let namespaceMock: any;
  let serverMock: any;

  beforeEach(() => {
    jest.clearAllMocks();

    roomEmitter = {
      emit: jest.fn(),
    };

    namespaceMock = {
      use: jest.fn((handler) => {
        authMiddleware = handler;
      }),
      on: jest.fn((event, handler) => {
        if (event === 'connection') {
          connectionHandler = handler;
        }
      }),
      emit: jest.fn(),
      to: jest.fn(() => roomEmitter),
      in: jest.fn(() => ({
        fetchSockets: jest.fn().mockResolvedValue([{ id: 'socket-1' }, { id: 'socket-2' }]),
      })),
    };

    serverMock = {
      of: jest.fn(() => namespaceMock),
    };

    setupMillionSocket(serverMock);
  });

  function createSocket(token?: string) {
    return {
      id: 'socket-1',
      handshake: {
        auth: token ? { token } : {},
      },
      user: undefined,
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      on: jest.fn((event, handler) => {
        socketHandlers[event] = handler;
      }),
    };
  }

  async function authenticateAndConnect(socket: any) {
    await new Promise<void>((resolve, reject) => {
      authMiddleware(socket, (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    connectionHandler(socket);
  }

  describe('authentication middleware', () => {
    it('accepts a valid token', async () => {
      const socket = createSocket(
        generateToken({
          id: 'user-123',
          email: 'test@example.com',
          role: 'student',
          name: 'Test User',
        }),
      );

      await expect(authenticateAndConnect(socket)).resolves.toBeUndefined();
      expect(socket.user).toMatchObject({
        id: 'user-123',
        email: 'test@example.com',
        role: 'student',
        name: 'Test User',
      });
    });

    it('rejects missing tokens', async () => {
      await expect(authenticateAndConnect(createSocket())).rejects.toThrow(
        'Authentication required',
      );
    });

    it('rejects invalid tokens', async () => {
      await expect(authenticateAndConnect(createSocket('bad-token'))).rejects.toThrow(
        'Invalid token',
      );
    });
  });

  it('creates a room and broadcasts room.created', async () => {
    const room = {
      id: 'room-123',
      title: 'غرفة العلوم',
      type: 'public',
      host_id: 'user-123',
    };
    const callback = jest.fn();
    const socket = createSocket(
      generateToken({
        id: 'user-123',
        email: 'test@example.com',
        role: 'teacher',
        name: 'Teacher',
      }),
    );

    mockedMillionService.createRoom.mockResolvedValue(room as any);

    await authenticateAndConnect(socket);
    await socketHandlers['create-room'](
      { title: room.title, type: room.type, settings: { questionCount: 5 } },
      callback,
    );

    expect(mockedMillionService.createRoom.mock.calls).toContainEqual([
      'user-123', room.title, room.type, { questionCount: 5 },
    ]);
    expect(socket.join).toHaveBeenCalledWith(room.id);
    expect(callback).toHaveBeenCalledWith({ success: true, room });
    expect(namespaceMock.emit).toHaveBeenCalledWith('room.created', {
      roomId: room.id,
      room,
    });
  });

  it('joins a room and broadcasts room.joined with participant count', async () => {
    const room = {
      id: 'room-123',
      host_id: 'host-999',
      title: 'غرفة العلوم',
      type: 'public',
    };
    const callback = jest.fn();
    const socket = createSocket(
      generateToken({
        id: 'user-123',
        email: 'student@example.com',
        role: 'student',
        name: 'Student',
      }),
    );

    mockedMillionService.joinRoom.mockResolvedValue(room as any);

    await authenticateAndConnect(socket);
    await socketHandlers['join-room']({ roomId: room.id }, callback);

    expect(socket.join).toHaveBeenCalledWith(room.id);
    expect(callback).toHaveBeenCalledWith({ success: true, room });
    expect(roomEmitter.emit).toHaveBeenCalledWith('room.joined', {
      roomId: room.id,
      player: {
        id: 'user-123',
        name: 'Student',
        isHost: false,
      },
      participantCount: 2,
    });
  });

  it('leaves a room and broadcasts room.left', async () => {
    const callback = jest.fn();
    const socket = createSocket(
      generateToken({
        id: 'user-123',
        email: 'student@example.com',
        role: 'student',
        name: 'Student',
      }),
    );

    mockedMillionService.leaveRoom.mockResolvedValue(undefined);

    await authenticateAndConnect(socket);
    await socketHandlers['leave-room']({ roomId: 'room-123' }, callback);

    expect(mockedMillionService.leaveRoom.mock.calls).toContainEqual(['user-123', 'room-123']);
    expect(socket.leave).toHaveBeenCalledWith('room-123');
    expect(callback).toHaveBeenCalledWith({ success: true });
    expect(roomEmitter.emit).toHaveBeenCalledWith('room.left', {
      roomId: 'room-123',
      playerId: 'user-123',
      participantCount: 2,
    });
  });

  it('broadcasts round lifecycle events when a host starts a round', async () => {
    jest.useFakeTimers();

    try {
      const roomId = 'room-123';
      const round = {
        id: 'round-123',
        room_id: roomId,
        round_number: 1,
        started_at: new Date('2026-04-13T10:00:00.000Z'),
      };
      const questions = [
        { id: 1, text_ar: 'سؤال 1', options: ['أ', 'ب', 'ج', 'د'] },
        { id: 2, text_ar: 'سؤال 2', options: ['أ', 'ب', 'ج', 'د'] },
      ];
      const leaderboard = [{ userId: 'user-123', totalPoints: 100, rank: 1 }];
      const callback = jest.fn();
      const socket = createSocket(
        generateToken({
          id: 'host-123',
          email: 'teacher@example.com',
          role: 'teacher',
          name: 'Teacher',
        }),
      );

      mockedMillionService.startRound.mockResolvedValue(round as any);
      mockedMillionService.getRoundQuestions.mockResolvedValue(questions as any);
      mockedMillionService.finishRound.mockResolvedValue(undefined);
      mockedMillionService.getLeaderboard.mockResolvedValue(leaderboard as any);

      await authenticateAndConnect(socket);
      await socketHandlers['start-round']({ roomId }, callback);

      expect(callback).toHaveBeenCalledWith({ success: true, round });
      expect(roomEmitter.emit).toHaveBeenCalledWith('round.started', {
        roomId,
        roundId: round.id,
        roundNumber: round.round_number,
        questionCount: questions.length,
        startedAt: round.started_at,
      });
      expect(roomEmitter.emit).toHaveBeenCalledWith('question.sent', {
        roomId,
        roundId: round.id,
        question: {
          id: questions[0].id,
          text_ar: questions[0].text_ar,
          options: questions[0].options,
        },
        timeLimit: 15,
        orderIndex: 0,
        totalQuestions: questions.length,
      });

      await jest.advanceTimersByTimeAsync(3000);
      await flushPromises();

      expect(roomEmitter.emit).toHaveBeenCalledWith('question.sent', {
        roomId,
        roundId: round.id,
        question: {
          id: questions[1].id,
          text_ar: questions[1].text_ar,
          options: questions[1].options,
        },
        timeLimit: 15,
        orderIndex: 1,
        totalQuestions: questions.length,
      });

      await jest.advanceTimersByTimeAsync(15000);
      await flushPromises();

      expect(mockedMillionService.finishRound.mock.calls).toContainEqual([round.id]);
      expect(roomEmitter.emit).toHaveBeenCalledWith('round.finished', {
        roomId,
        roundId: round.id,
        finalLeaderboard: leaderboard,
        winner: leaderboard[0],
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('submits an answer and broadcasts the result plus leaderboard update', async () => {
    const roomId = 'room-123';
    const callback = jest.fn();
    const socket = createSocket(
      generateToken({
        id: 'user-123',
        email: 'student@example.com',
        role: 'student',
        name: 'Student',
      }),
    );
    const submissionResult = {
      isCorrect: true,
      pointsAwarded: 120,
      correctIndex: 2,
    };
    const leaderboard = [{ userId: 'user-123', totalPoints: 120, rank: 1 }];

    mockedMillionService.submitAnswer.mockResolvedValue(submissionResult);
    mockedMillionService.getLeaderboard.mockResolvedValue(leaderboard as any);

    await authenticateAndConnect(socket);
    await socketHandlers['submit-answer'](
      { roomId, questionId: 9, chosenIndex: 2, timeTaken: 4 },
      callback,
    );

    expect(callback).toHaveBeenCalledWith({ success: true });
    expect(socket.emit).toHaveBeenCalledWith('answer.received', { acknowledged: true });
    expect(roomEmitter.emit).toHaveBeenCalledWith('question.result', {
      questionId: 9,
      correctIndex: 2,
      scores: [
        {
          userId: 'user-123',
          points: 120,
          isCorrect: true,
        },
      ],
    });
    expect(roomEmitter.emit).toHaveBeenCalledWith('leaderboard.updated', {
      roomId,
      leaderboard,
    });
  });
});

import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { validate, validateUUID } from '../../middleware/validation.middleware';
import {
  answerLimiter,
  roomCreationLimiter,
} from '../../middleware/ratelimit.middleware';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  startRound,
  submitAnswer,
  getRoom,
  getLeaderboard,
  getUserHistory,
  getRoundQuestions,
} from './million.controller';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createRoomSchema = z.object({
  title: z.string().min(3).max(255),
  type: z.enum(['public', 'private']),
  settings: z
    .object({
      maxPlayers: z.number().int().min(2).max(50).optional(),
      questionCount: z.number().int().min(1).max(50).optional(),
      timeLimit: z.number().int().min(5).max(120).optional(),
      difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).optional(),
    })
    .optional(),
});

const joinRoomSchema = z.object({
  roomId: z.string().uuid(),
});

const leaveRoomSchema = z.object({
  roomId: z.string().uuid(),
});

const startRoundSchema = z.object({
  roomId: z.string().uuid(),
});

const submitAnswerSchema = z.object({
  roomId: z.string().uuid(),
  questionId: z.number().int().positive(),
  chosenIndex: z.number().int().min(0).max(3),
  timeTaken: z.number().int().min(0),
});

/**
 * POST /api/million/create-room
 * Create a new game room
 */
router.post(
  '/create-room',
  authenticateToken,
  roomCreationLimiter,
  validate(createRoomSchema),
  createRoom,
);

/**
 * POST /api/million/join-room
 * Join an existing room
 */
router.post(
  '/join-room',
  authenticateToken,
  validate(joinRoomSchema),
  joinRoom,
);

/**
 * POST /api/million/leave-room
 * Leave a room
 */
router.post(
  '/leave-room',
  authenticateToken,
  validate(leaveRoomSchema),
  leaveRoom,
);

/**
 * POST /api/million/start-round
 * Start a new round (host only)
 */
router.post(
  '/start-round',
  authenticateToken,
  validate(startRoundSchema),
  startRound,
);

/**
 * POST /api/million/answer
 * Submit an answer to a question
 */
router.post(
  '/answer',
  authenticateToken,
  answerLimiter,
  validate(submitAnswerSchema),
  submitAnswer,
);

/**
 * GET /api/million/room/:roomId
 * Get room details
 */
router.get(
  '/room/:roomId',
  authenticateToken,
  validateUUID('roomId'),
  getRoom,
);

/**
 * GET /api/million/leaderboard/:roomId
 * Get leaderboard for a room
 */
router.get(
  '/leaderboard/:roomId',
  authenticateToken,
  validateUUID('roomId'),
  getLeaderboard,
);

/**
 * GET /api/million/history/:userId
 * Get user game history
 */
router.get(
  '/history/:userId',
  authenticateToken,
  validateUUID('userId'),
  getUserHistory,
);

/**
 * GET /api/million/questions/:roundId (Internal)
 * Get questions for a round
 */
router.get(
  '/questions/:roundId',
  authenticateToken,
  validateUUID('roundId'),
  getRoundQuestions,
);

export default router;

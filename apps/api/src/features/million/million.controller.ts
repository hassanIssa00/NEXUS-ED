import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import millionService from './million.service';

/**
 * Million Dialogue Controller
 * Handles HTTP requests for the Million Dialogue API
 */

/**
 * POST /api/million/create-room
 * Create a new game room
 */
export const createRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { title, type, settings } = req.body;
    const userId = req.user.id;

    const room = await millionService.createRoom(userId, title, type, settings);

    res.status(201).json({
      success: true,
      data: room,
    });
  } catch (error: any) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create room',
    });
  }
};

/**
 * POST /api/million/join-room
 * Join an existing room
 */
export const joinRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.body;
    const userId = req.user.id;

    const room = await millionService.joinRoom(userId, roomId);

    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error: any) {
    console.error('Join room error:', error);

    let statusCode = 500;
    if (error.message === 'Room not found') statusCode = 404;
    if (error.message === 'Room is full') statusCode = 400;
    if (error.message === 'Already in room') statusCode = 400;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to join room',
    });
  }
};

/**
 * POST /api/million/leave-room
 * Leave a room
 */
export const leaveRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.body;
    const userId = req.user.id;

    await millionService.leaveRoom(userId, roomId);

    res.status(200).json({
      success: true,
      message: 'Left room successfully',
    });
  } catch (error: any) {
    console.error('Leave room error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to leave room',
    });
  }
};

/**
 * POST /api/million/start-round
 * Start a new round (host only)
 */
export const startRound = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.body;
    const userId = req.user.id;

    const round = await millionService.startRound(roomId, userId);

    res.status(200).json({
      success: true,
      data: round,
    });
  } catch (error: any) {
    console.error('Start round error:', error);

    let statusCode = 500;
    if (error.message === 'Only the host can start a round') statusCode = 403;
    if (error.message === 'Room not found') statusCode = 404;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to start round',
    });
  }
};

/**
 * POST /api/million/answer
 * Submit an answer
 */
export const submitAnswer = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId, questionId, chosenIndex, timeTaken } = req.body;
    const userId = req.user.id;

    const result = await millionService.submitAnswer(
      userId,
      roomId,
      questionId,
      chosenIndex,
      timeTaken,
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Submit answer error:', error);

    let statusCode = 500;
    if (error.message === 'No active round') statusCode = 400;
    if (error.message === 'Answer already submitted') statusCode = 400;
    if (error.message === 'Question not found') statusCode = 404;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to submit answer',
    });
  }
};

/**
 * GET /api/million/room/:roomId
 * Get room details
 */
export const getRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;

    const room = await millionService.getRoom(roomId);

    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error: any) {
    console.error('Get room error:', error);

    let statusCode = 500;
    if (error.message === 'Room not found') statusCode = 404;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to get room',
    });
  }
};

/**
 * GET /api/million/leaderboard/:roomId
 * Get leaderboard for a room
 */
export const getLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    const { roomId } = req.params;

    const leaderboard = await millionService.getLeaderboard(roomId);

    res.status(200).json({
      success: true,
      data: leaderboard,
    });
  } catch (error: any) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get leaderboard',
    });
  }
};

/**
 * GET /api/million/history/:userId
 * Get user game history
 */
export const getUserHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    // Only allow users to view their own history (or admins)
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Can only view own history',
      });
    }

    const history = await millionService.getUserHistory(userId, limit);

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get history',
    });
  }
};

/**
 * GET /api/million/questions/:roundId
 * Get questions for a round (internal use)
 */
export const getRoundQuestions = async (req: AuthRequest, res: Response) => {
  try {
    const { roundId } = req.params;

    const questions = await millionService.getRoundQuestions(roundId);

    res.status(200).json({
      success: true,
      data: questions,
    });
  } catch (error: any) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get questions',
    });
  }
};

export default {
  createRoom,
  joinRoom,
  leaveRoom,
  startRound,
  submitAnswer,
  getRoom,
  getLeaderboard,
  getUserHistory,
  getRoundQuestions,
};

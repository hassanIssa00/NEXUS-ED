import { query } from '../../config/database';
import { calculatePoints } from '../../config/million.config';
import type {
  MillionRoom,
  MillionRound,
  MillionQuestion,
  MillionAnswer,
  MillionScore,
  RoomSettings,
  RoomType,
  LeaderboardEntry,
  MillionError,
  ErrorCodes,
} from '../../types/million.types';

/**
 * Million Dialogue Service
 * Business logic for the multiplayer quiz system
 */
export class MillionService {
  /**
   * Create a new game room
   */
  async createRoom(
    hostId: string,
    title: string,
    type: RoomType,
    settings?: RoomSettings,
  ): Promise<MillionRoom> {
    const defaultSettings: RoomSettings = {
      maxPlayers: 10,
      questionCount: 10,
      timeLimit: 15,
      difficulty: 'mixed',
    };

    const finalSettings = { ...defaultSettings, ...settings };

    const result = await query(
      `
      INSERT INTO million_rooms (title, host_id, type, settings)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
      [title, hostId, type, JSON.stringify(finalSettings)],
    );

    // Add host as participant
    await this.addParticipant(result.rows[0].id, hostId);

    return result.rows[0];
  }

  /**
   * Join an existing room
   */
  async joinRoom(userId: string, roomId: string): Promise<MillionRoom> {
    // Check if room exists
    const roomResult = await query(
      `
      SELECT * FROM million_rooms WHERE id = $1
    `,
      [roomId],
    );

    if (roomResult.rows.length === 0) {
      throw new Error('Room not found');
    }

    const room = roomResult.rows[0];

    // Check if room is full
    const participantCount = await query(
      `
      SELECT COUNT(*) as count 
      FROM million_room_participants 
      WHERE room_id = $1 AND is_active = true
    `,
      [roomId],
    );

    const maxPlayers = room.settings.maxPlayers || 10;
    if (parseInt(participantCount.rows[0].count) >= maxPlayers) {
      throw new Error('Room is full');
    }

    // Check if already joined
    const existingParticipant = await query(
      `
      SELECT * FROM million_room_participants 
      WHERE room_id = $1 AND user_id = $2
    `,
      [roomId, userId],
    );

    if (existingParticipant.rows.length > 0) {
      // Rejoin if previously left
      await query(
        `
        UPDATE million_room_participants 
        SET is_active = true, left_at = NULL 
        WHERE room_id = $1 AND user_id = $2
      `,
        [roomId, userId],
      );
    } else {
      // Add new participant
      await this.addParticipant(roomId, userId);
    }

    return room;
  }

  /**
   * Leave a room
   */
  async leaveRoom(userId: string, roomId: string): Promise<void> {
    await query(
      `
      UPDATE million_room_participants 
      SET is_active = false, left_at = NOW() 
      WHERE room_id = $1 AND user_id = $2
    `,
      [roomId, userId],
    );
  }

  /**
   * Start a new round
   */
  async startRound(roomId: string, hostId: string): Promise<MillionRound> {
    // Verify host
    const room = await query(
      `
      SELECT * FROM million_rooms WHERE id = $1 AND host_id = $2
    `,
      [roomId, hostId],
    );

    if (room.rows.length === 0) {
      throw new Error('Only the host can start a round');
    }

    // Update room status
    await query(
      `
      UPDATE million_rooms SET status = 'in_progress' WHERE id = $1
    `,
      [roomId],
    );

    // Get next round number
    const roundCountResult = await query(
      `
      SELECT COALESCE(MAX(round_number), 0) as max_round 
      FROM million_rounds 
      WHERE room_id = $1
    `,
      [roomId],
    );

    const nextRoundNumber = roundCountResult.rows[0].max_round + 1;

    // Create new round
    const roundResult = await query(
      `
      INSERT INTO million_rounds (room_id, round_number, started_at)
      VALUES ($1, $2, NOW())
      RETURNING *
    `,
      [roomId, nextRoundNumber],
    );

    const round = roundResult.rows[0];

    // Select questions for this round
    await this.selectQuestionsForRound(
      round.id,
      room.rows[0].settings.questionCount || 10,
      room.rows[0].settings.difficulty || 'mixed',
    );

    return round;
  }

  /**
   * Submit an answer
   */
  async submitAnswer(
    userId: string,
    roomId: string,
    questionId: number,
    chosenIndex: number,
    timeTaken: number,
  ): Promise<{
    isCorrect: boolean;
    pointsAwarded: number;
    correctIndex: number;
  }> {
    // Get current round
    const roundResult = await query(
      `
      SELECT * FROM million_rounds 
      WHERE room_id = $1 AND finished_at IS NULL 
      ORDER BY round_number DESC 
      LIMIT 1
    `,
      [roomId],
    );

    if (roundResult.rows.length === 0) {
      throw new Error('No active round');
    }

    const round = roundResult.rows[0];

    // Check for duplicate submission
    const existingAnswer = await query(
      `
      SELECT * FROM million_answers 
      WHERE round_id = $1 AND question_id = $2 AND user_id = $3
    `,
      [round.id, questionId, userId],
    );

    if (existingAnswer.rows.length > 0) {
      throw new Error('Answer already submitted');
    }

    // Get question details
    const questionResult = await query(
      `
      SELECT * FROM million_questions WHERE id = $1
    `,
      [questionId],
    );

    if (questionResult.rows.length === 0) {
      throw new Error('Question not found');
    }

    const question = questionResult.rows[0];
    const isCorrect = chosenIndex === question.correct_index;

    // Get room settings for time limit
    const roomResult = await query(
      `
      SELECT settings FROM million_rooms WHERE id = $1
    `,
      [roomId],
    );
    const timeLimit = roomResult.rows[0].settings.timeLimit || 15;

    // Check if this is the first correct answer
    const firstCorrectResult = await query(
      `
      SELECT COUNT(*) as count 
      FROM million_answers ma
      JOIN million_questions mq ON ma.question_id = mq.id
      WHERE ma.round_id = $1 
        AND ma.question_id = $2 
        AND ma.chosen_index = mq.correct_index
    `,
      [round.id, questionId],
    );

    const isFirstCorrect =
      isCorrect && firstCorrectResult.rows[0].count === '0';

    // Get current streak
    const currentStreak = await this.getUserStreak(userId, round.id);

    // Calculate points
    const pointsAwarded = isCorrect
      ? calculatePoints(
          question.difficulty,
          timeTaken,
          timeLimit,
          true,
          isFirstCorrect,
          currentStreak,
        )
      : 0;

    // Save answer
    await query(
      `
      INSERT INTO million_answers 
        (round_id, question_id, user_id, chosen_index, time_taken, points_awarded)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [round.id, questionId, userId, chosenIndex, timeTaken, pointsAwarded],
    );

    // Update scores
    await this.updateScore(roomId, userId, pointsAwarded);

    return {
      isCorrect,
      pointsAwarded,
      correctIndex: question.correct_index,
    };
  }

  /**
   * Get room details
   */
  async getRoom(roomId: string): Promise<any> {
    const result = await query(
      `
      SELECT 
        r.*,
        u.name as host_name,
        (
          SELECT COUNT(*) 
          FROM million_room_participants 
          WHERE room_id = r.id AND is_active = true
        ) as participant_count
      FROM million_rooms r
      JOIN users u ON r.host_id = u.id
      WHERE r.id = $1
    `,
      [roomId],
    );

    if (result.rows.length === 0) {
      throw new Error('Room not found');
    }

    return result.rows[0];
  }

  async listPublicRooms(limit = 50): Promise<any[]> {
    const result = await query(
      `
      SELECT
        r.id,
        r.title,
        r.status,
        r.type,
        r.settings,
        r.created_at as "createdAt",
        COUNT(p.user_id) FILTER (WHERE p.is_active = true)::int as "playerCount"
      FROM million_rooms r
      LEFT JOIN million_room_participants p ON p.room_id = r.id
      WHERE r.type = 'public' AND r.status = 'waiting'
      GROUP BY r.id
      ORDER BY r.created_at DESC
      LIMIT $1
      `,
      [Math.min(100, Math.max(1, Math.floor(limit)))],
    );

    return result.rows.map((room) => ({
      ...room,
      playerCount: Number(room.playerCount ?? 0),
      maxPlayers: Number(room.settings?.maxPlayers ?? 10),
      status: room.status === 'in_progress' ? 'playing' : room.status,
    }));
  }

  /**
   * Get leaderboard for a room
   */
  async getLeaderboard(roomId: string): Promise<LeaderboardEntry[]> {
    const result = await query(
      `
      SELECT 
        ms.user_id as "userId",
        u.name,
        u.avatar,
        ms.total_points as "totalPoints",
        ms.correct_answers as "correctAnswers",
        ms.questions_answered as "questionsAnswered",
        RANK() OVER (ORDER BY ms.total_points DESC) as rank
      FROM million_scores ms
      JOIN users u ON ms.user_id = u.id
      WHERE ms.room_id = $1
      ORDER BY ms.total_points DESC
      LIMIT 20
    `,
      [roomId],
    );

    return result.rows;
  }

  /**
   * Get user game history
   */
  async getUserHistory(userId: string, limit: number = 10): Promise<any[]> {
    const result = await query(
      `
      SELECT 
        r.id as room_id,
        r.title,
        r.status,
        r.created_at,
        ms.total_points,
        ms.correct_answers,
        ms.questions_answered,
        (
          SELECT RANK() 
          FROM (
            SELECT user_id, RANK() OVER (ORDER BY total_points DESC)
            FROM million_scores
            WHERE room_id = r.id
          ) ranks
          WHERE user_id = $1
        ) as final_rank
      FROM million_rooms r
      JOIN million_scores ms ON r.id = ms.room_id
      WHERE ms.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2
    `,
      [userId, limit],
    );

    return result.rows;
  }

  /**
   * Get questions for a round
   */
  async getRoundQuestions(roundId: string): Promise<MillionQuestion[]> {
    const result = await query(
      `
      SELECT mq.*
      FROM million_questions mq
      JOIN million_round_questions mrq ON mq.id = mrq.question_id
      WHERE mrq.round_id = $1
      ORDER BY mrq.order_index
    `,
      [roundId],
    );

    return result.rows;
  }

  /**
   * Finish a round
   */
  async finishRound(roundId: string): Promise<void> {
    await query(
      `
      UPDATE million_rounds 
      SET finished_at = NOW() 
      WHERE id = $1
    `,
      [roundId],
    );
  }

  // ========== Helper Methods ==========

  private async addParticipant(roomId: string, userId: string): Promise<void> {
    await query(
      `
      INSERT INTO million_room_participants (room_id, user_id, is_active)
      VALUES ($1, $2, true)
      ON CONFLICT (room_id, user_id) 
      DO UPDATE SET is_active = true, joined_at = NOW(), left_at = NULL
    `,
      [roomId, userId],
    );

    // Initialize score
    await query(
      `
      INSERT INTO million_scores (room_id, user_id, total_points)
      VALUES ($1, $2, 0)
      ON CONFLICT (room_id, user_id) DO NOTHING
    `,
      [roomId, userId],
    );
  }

  private async selectQuestionsForRound(
    roundId: string,
    count: number,
    difficulty: string,
  ): Promise<void> {
    let whereClause = '';

    if (difficulty !== 'mixed') {
      const difficultyMap: { [key: string]: number } = {
        easy: 1,
        medium: 2,
        hard: 4,
      };
      const difficultyValue = difficultyMap[difficulty] || 2;
      whereClause = `WHERE difficulty = ${difficultyValue}`;
    }

    const questions = await query(
      `
      SELECT id 
      FROM million_questions 
      ${whereClause}
      ORDER BY RANDOM() 
      LIMIT $1
    `,
      [count],
    );

    for (let i = 0; i < questions.rows.length; i++) {
      await query(
        `
        INSERT INTO million_round_questions (round_id, question_id, order_index)
        VALUES ($1, $2, $3)
      `,
        [roundId, questions.rows[i].id, i],
      );
    }
  }

  private async updateScore(
    roomId: string,
    userId: string,
    pointsToAdd: number,
  ): Promise<void> {
    await query(
      `
      UPDATE million_scores 
      SET 
        total_points = total_points + $3,
        questions_answered = questions_answered + 1,
        correct_answers = correct_answers + CASE WHEN $3 > 0 THEN 1 ELSE 0 END,
        updated_at = NOW()
      WHERE room_id = $1 AND user_id = $2
    `,
      [roomId, userId, pointsToAdd],
    );
  }

  private async getUserStreak(
    userId: string,
    roundId: string,
  ): Promise<number> {
    const result = await query(
      `
      WITH ranked_answers AS (
        SELECT 
          ma.is_correct,
          ROW_NUMBER() OVER (ORDER BY ma.created_at DESC) as rn
        FROM million_answers ma
        WHERE ma.user_id = $1 AND ma.round_id = $2
      )
      SELECT COUNT(*) as streak
      FROM ranked_answers
      WHERE is_correct = true
        AND rn <= (SELECT MIN(rn) FROM ranked_answers WHERE is_correct = false)
    `,
      [userId, roundId],
    );

    return parseInt(result.rows[0]?.streak || '0');
  }
}

export default new MillionService();

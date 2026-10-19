import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  private schoolScope(schoolId: string) {
    return {
      OR: [
        { subject: { is: { schoolId } } },
        { subject: { is: { class: { is: { schoolId } } } } },
      ],
    };
  }

  async findAll(schoolId: string) {
    return this.prisma.game.findMany({
      where: this.schoolScope(schoolId),
      include: {
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, schoolId: string) {
    const game = await this.prisma.game.findFirst({
      where: { id, ...this.schoolScope(schoolId) },
      include: {
        subject: { select: { id: true, name: true } },
      },
    });
    if (!game) throw new NotFoundException('Game not found');
    return game;
  }

  async startGameSession(gameId: string, userId: string, schoolId: string) {
    // Check if game exists
    await this.findOne(gameId, schoolId);

    // Create session
    return this.prisma.gameSession.create({
      data: {
        gameId,
        userId,
      },
    });
  }

  async finishGameSession(sessionId: string, userId: string, schoolId: string, score: number, durationSeconds?: number) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Session not found or belongs to someone else');
    }

    await this.findOne(session.gameId, schoolId);

    // Update session
    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
        duration: durationSeconds,
      },
    });

    // Save or update score (upsert because of unique gameId_userId constraint)
    const existingScore = await this.prisma.gameScore.findUnique({
      where: {
        gameId_userId: { gameId: session.gameId, userId },
      },
    });

    if (existingScore) {
      if (score > existingScore.score) {
        return this.prisma.gameScore.update({
          where: { id: existingScore.id },
          data: { score },
        });
      }
      return existingScore;
    } else {
      return this.prisma.gameScore.create({
        data: {
          gameId: session.gameId,
          userId,
          score,
        },
      });
    }
  }

  async getLeaderboard(gameId: string, schoolId: string) {
    await this.findOne(gameId, schoolId);
    return this.prisma.gameScore.findMany({
      where: { gameId, user: { is: { schoolId } } },
      orderBy: { score: 'desc' },
      take: 10,
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EventsGateway } from '../gateway/events.gateway';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  points: number;
  level: number;
  levelName: string;
}

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Awards XP to a user and updates their level if they crossed a threshold.
   * Emits a real-time WebSocket event for the UI to show an animation.
   */
  async awardXp(userId: string, amount: number, reason: string, sourceId?: string) {
    try {
      // 1. Create the transaction log
      const transaction = await this.prisma.xpTransaction.create({
        data: {
          userId,
          amount,
          reason,
          sourceId,
        },
      });

      // 2. Increment totalXP for the user
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          totalXP: { increment: amount },
        },
        select: { id: true, totalXP: true, level: true },
      });

      // 3. Check for level up
      const newLevel = this.calculateLevel(updatedUser.totalXP);
      let leveledUp = false;

      if (newLevel > updatedUser.level) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { level: newLevel },
        });
        leveledUp = true;
        this.logger.log(`User ${userId} leveled up to ${newLevel}!`);
      }

      // 4. Emit real-time event to trigger UI animations
      this.eventsGateway.server.to(`user:${userId}`).emit('gamification.xp_awarded', {
        amount,
        reason,
        totalXP: updatedUser.totalXP,
        newLevel: leveledUp ? newLevel : undefined,
        levelName: this.getLevelName(leveledUp ? newLevel : updatedUser.level),
      });

      return { success: true, transaction, totalXP: updatedUser.totalXP, leveledUp };
    } catch (error) {
      this.logger.error(`Failed to award XP to user ${userId}:`, error);
      return { success: false };
    }
  }

  /**
   * Get leaderboard (top N students by points)
   */
  async getLeaderboard(
    scope: 'national' | 'school' | 'classroom' = 'national',
    entityId?: string,
    limit: number = 10,
  ): Promise<LeaderboardEntry[]> {
    try {
      const whereClause: any = { role: 'STUDENT', isActive: true };

      if (scope === 'school' && entityId) {
        whereClause.schoolId = entityId;
      } else if (scope === 'classroom' && entityId) {
        whereClause.enrollments = {
          some: { classId: entityId }
        };
      }

      const students = await this.prisma.user.findMany({
        where: whereClause,
        orderBy: { totalXP: 'desc' },
        take: limit,
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          avatar: true,
          totalXP: true,
          level: true,
        },
      });

      return students.map((s, index) => ({
        rank: index + 1,
        userId: s.id,
        name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'طالب',
        avatar: s.avatar || undefined,
        points: s.totalXP,
        level: s.level,
        levelName: this.getLevelName(s.level),
      }));
    } catch (error) {
      this.logger.error('Failed to get leaderboard', error);
      throw error;
    }
  }

  /**
   * Get user's rank and points
   */
  async getUserRank(
    userId: string,
    schoolId?: string,
  ): Promise<{
    rank: number;
    points: number;
    level: number;
    levelName: string;
    streak: number;
    totalStudents: number;
    recentTransactions: any[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totalXP: true, level: true, schoolId: true, streakDays: true },
    });

    if (!user || (schoolId && user.schoolId !== schoolId)) {
      throw new NotFoundException('Student record not found');
    }

    const schoolStudents = {
      role: 'STUDENT' as const,
      isActive: true,
      ...(schoolId ? { schoolId } : {}),
    };
    const [studentsAhead, totalStudents, recentTransactions] = await Promise.all([
      this.prisma.user.count({
        where: { ...schoolStudents, totalXP: { gt: user.totalXP } },
      }),
      this.prisma.user.count({ where: schoolStudents }),
      this.prisma.xpTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      rank: studentsAhead + 1,
      points: user.totalXP,
      level: user.level,
      levelName: this.getLevelName(user.level),
      streak: user.streakDays,
      totalStudents,
      recentTransactions,
    };
  }

  // Helper Methods

  public calculateLevel(totalXP: number): number {
    if (totalXP <= 500) return 1;
    if (totalXP <= 1500) return 2;
    if (totalXP <= 3000) return 3;
    if (totalXP <= 5000) return 4;
    return 5;
  }

  public getLevelName(level: number): string {
    switch (level) {
      case 1: return 'Beginner (مبتدئ)';
      case 2: return 'Learner (متعلم)';
      case 3: return 'Excellent (متفوق)';
      case 4: return 'Star (نجم)';
      case 5: return 'Nexus Champion (بطل نكسس)';
      default: return 'Beginner (مبتدئ)';
    }
  }
}

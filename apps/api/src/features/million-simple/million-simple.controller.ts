import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/role.enum';
import { StudentAnalyticsService } from '../../analytics/student-analytics.service';
import { MillionSimpleService } from './million-simple.service';

@Controller('million')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class MillionSimpleController {
  constructor(
    private readonly millionService: MillionSimpleService,
    private readonly studentAnalytics: StudentAnalyticsService,
  ) {}

  /**
   * Get student score and rank
   * GET /api/million/score/:userId
   */
  @Get('score/:userId')
  @Roles(Role.STUDENT, Role.PARENT, Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR)
  async getScore(@Param('userId') userId: string, @Req() req: any) {
    await this.studentAnalytics.assertCanAccessStudent(req.user.userId || req.user.sub || req.user.id, req.user.role, userId);
    const profile = await this.millionService.getProfile(userId);
    const rank = await this.millionService.getRank(userId);
    const total = await this.millionService.getTotalStudents();
    const recentScores = await this.millionService.getRecentScores(userId, 7);

    return {
      success: true,
      data: {
        profile,
        rank,
        total,
        recentScores,
      },
    };
  }

  /**
   * Get leaderboard
   * GET /api/million/leaderboard?limit=10
   */
  @Get('leaderboard')
  @Roles(Role.STUDENT, Role.PARENT, Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR)
  async getLeaderboard(@Query('limit') limit = '10', @Req() req: any) {
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      throw new BadRequestException('limit must be an integer between 1 and 100');
    }
    if (!req.user.schoolId) {
      throw new BadRequestException('The account is not assigned to a school');
    }
    const leaderboard = await this.millionService.getLeaderboard(
      parsedLimit,
      req.user.schoolId,
    );

    return {
      success: true,
      data: leaderboard,
    };
  }

  /**
   * Add score for student
   * POST /api/million/score
   */
  @Post('score')
  @Roles(Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.SUPERVISOR)
  async addScore(
    @Body()
    dto: {
      userId: string;
      attendance?: number;
      assignments?: number;
      exams?: number;
      participation?: number;
    },
    @Req() req: any,
  ) {
    await this.studentAnalytics.assertCanAccessStudent(req.user.userId || req.user.sub || req.user.id, req.user.role, dto.userId);
    const score = await this.millionService.addScore(dto);

    return {
      success: true,
      message: 'Score added successfully',
      data: score,
    };
  }

  /**
   * Recalculate total points for a student
   * POST /api/million/recalculate/:userId
   */
  @Post('recalculate/:userId')
  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.SUPERVISOR)
  async recalculate(@Param('userId') userId: string, @Req() req: any) {
    await this.studentAnalytics.assertCanAccessStudent(req.user.userId || req.user.sub || req.user.id, req.user.role, userId);
    const profile = await this.millionService.recalculateTotalPoints(userId);

    return {
      success: true,
      message: 'Points recalculated',
      data: profile,
    };
  }
}

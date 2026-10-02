import { Controller, ForbiddenException, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GamificationService } from './gamification.service';

@Controller('gamification')
@UseGuards(AuthGuard('jwt'))
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('leaderboard')
  async getLeaderboard(
    @Request() req: any,
    @Query('limit') limit?: string,
  ) {
    const schoolId = req.user?.schoolId;
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    const requestedLimit = Number(limit);
    const parsedLimit = Number.isFinite(requestedLimit)
      ? Math.min(100, Math.max(1, Math.floor(requestedLimit)))
      : 10;
    return this.gamificationService.getLeaderboard('school', schoolId, parsedLimit);
  }

  @Get('rank')
  async getUserRank(@Request() req: any) {
    if (req.user?.role !== 'STUDENT') throw new ForbiddenException('Only students can view a personal rank');
    const schoolId = req.user?.schoolId;
    if (!schoolId) throw new ForbiddenException('The account is not assigned to a school');
    return this.gamificationService.getUserRank(req.user.userId || req.user.sub || req.user.id, schoolId);
  }
}

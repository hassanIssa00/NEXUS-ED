import { Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { MillionJourneyService } from './million-journey.service';
import { JwtAuthGuard } from '../../infrastructure/guards/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/role.enum';

@Controller('student/million-journey')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
export class MillionJourneyController {
  constructor(private readonly journeyService: MillionJourneyService) {}

  @Get('milestones')
  async getMilestones() {
    const data = await this.journeyService.getMilestones();
    return { success: true, data };
  }

  @Get('progress')
  async getMyProgress(@Req() req: any) {
    const userId = req.user.sub || req.user.id;
    const data = await this.journeyService.getUserProgress(userId);
    return { success: true, data };
  }

  @Get('badges')
  async getMyBadges(@Req() req: any) {
    const userId = req.user.sub || req.user.id;
    const data = await this.journeyService.getUserBadges(userId);
    return { success: true, data };
  }

  @Post('check-unlocks')
  async checkUnlocks(@Req() req: any) {
    const userId = req.user.sub || req.user.id;
    const data = await this.journeyService.checkAndUnlockMilestones(userId);
    return { success: true, message: 'Checked for new milestones', newlyUnlocked: data };
  }
}

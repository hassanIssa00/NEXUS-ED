import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { StudentAnalyticsService } from './student-analytics.service';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly studentAnalyticsService: StudentAnalyticsService,
  ) {}

  @Get('overview')
  @Roles(Role.ADMIN)
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('user-growth')
  @Roles(Role.ADMIN)
  getUserGrowth(@Query('days') days?: string) {
    const daysNumber = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getUserGrowth(daysNumber);
  }

  @Get('student')
  @Roles(Role.STUDENT)
  getStudentStats(@Query('studentId') studentId: string, @Request() req: any) {
    // If studentId is provided (e.g. by admin/parent), use it. Otherwise use current user's ID.
    // For now, we'll just use the current user's ID for security if they are a student.
    // If we want to allow parents to view, we'd need more logic.
    return this.analyticsService.getStudentStats(req.user.userId);
  }

  @Get('grade-trends')
  @Roles(Role.STUDENT, Role.PARENT, Role.TEACHER)
  async getGradeTrends(@Query('studentId') studentId: string, @Query('limit') limit: string, @Request() req: any) {
    const id = req.user.role === 'STUDENT' ? req.user.userId : studentId;
    if (!id) {
        throw new Error('Student ID is required');
    }
    await this.studentAnalyticsService.assertCanAccessStudent(req.user.userId, req.user.role, id);
    return this.analyticsService.getGradeTrends(id, limit ? parseInt(limit, 10) : 10);
  }
}

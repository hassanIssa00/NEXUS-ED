import { Controller, Get, Query, UseGuards, Res, Req, ForbiddenException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/roles.guard';
import type { Response } from 'express';
import {
  AdminDashboardService,
  AdminOverview,
  TeacherPerformance,
  ClassActivity,
} from './admin-dashboard.service';

@ApiTags('Admin Dashboard')
@Controller('admin/dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('overview')
  @Roles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Get admin dashboard overview' })
  @ApiResponse({ status: 200, description: 'Dashboard overview with stats' })
  async getOverview(@Req() req: any): Promise<AdminOverview> {
    return this.dashboardService.getOverview(this.schoolId(req));
  }

  @Get('teachers')
  @Roles(Role.ADMIN, Role.PRINCIPAL, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Get teacher performance metrics' })
  @ApiResponse({
    status: 200,
    description: 'List of teachers with performance stats',
  })
  async getTeacherPerformance(@Req() req: any): Promise<TeacherPerformance[]> {
    return this.dashboardService.getTeacherPerformance(this.schoolId(req));
  }

  @Get('classes')
  @Roles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Get class activity report' })
  @ApiResponse({
    status: 200,
    description: 'List of classes with activity metrics',
  })
  async getClassActivity(@Req() req: any): Promise<ClassActivity[]> {
    return this.dashboardService.getClassActivity(this.schoolId(req));
  }

  @Get('export/data')
  @Roles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Export school-scoped admin report data as JSON' })
  @ApiQuery({ name: 'type', enum: ['overview', 'teachers', 'classes', 'full'] })
  async exportData(
    @Query('type') type: 'overview' | 'teachers' | 'classes' | 'full',
    @Res() res: Response,
    @Req() req: any,
  ) {
    let data: any;

    switch (type) {
      case 'overview':
        data = await this.dashboardService.getOverview(this.schoolId(req));
        break;
      case 'teachers':
        data = await this.dashboardService.getTeacherPerformance(this.schoolId(req));
        break;
      case 'classes':
        data = await this.dashboardService.getClassActivity(this.schoolId(req));
        break;
      case 'full':
        data = {
          overview: await this.dashboardService.getOverview(this.schoolId(req)),
          teachers: await this.dashboardService.getTeacherPerformance(this.schoolId(req)),
          classes: await this.dashboardService.getClassActivity(this.schoolId(req)),
          generatedAt: new Date().toISOString(),
        };
        break;
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="nexus-admin-report-${type}-${Date.now()}.json"`,
    );
    res.json(data);
  }

  @Get('stats/financial')
  @Roles(Role.ADMIN, Role.PRINCIPAL, Role.ACCOUNTANT)
  async getFinancialStats(@Req() req: any) {
    return this.dashboardService.getFinancialStats(this.schoolId(req));
  }

  @Get('stats/enrollment')
  @Roles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL)
  async getEnrollmentStats(@Req() req: any) {
    return this.dashboardService.getEnrollmentStats(this.schoolId(req));
  }

  private schoolId(req: any): string {
    if (!req.user.schoolId) throw new ForbiddenException('The account is not assigned to a school');
    return req.user.schoolId;
  }
}

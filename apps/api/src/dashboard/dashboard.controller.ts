import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/roles.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('student')
  @Roles(Role.STUDENT)
  getStudentDashboard(@Request() req: any) {
    return this.dashboardService.getStudentDashboard(req.user.userId);
  }

  @Get('teacher')
  @Roles(Role.TEACHER)
  async getTeacherDashboard(@Request() req: any) {
    try {
      return await this.dashboardService.getTeacherDashboard(req.user.userId);
    } catch (error) {
      console.error('getTeacherDashboard Error:', error);
      throw error;
    }
  }

  @Get('admin')
  @Roles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL)
  getAdminDashboard(@Request() req: any) {
    return this.dashboardService.getAdminDashboard(req.user.userId);
  }

  @Get('parent')
  @Roles(Role.PARENT)
  getParentDashboard(@Request() req: any) {
    return this.dashboardService.getParentDashboard(req.user.userId);
  }
}

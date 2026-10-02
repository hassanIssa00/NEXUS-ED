import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { JwtAuthGuard } from '../../infrastructure/guards/auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/role.enum';
import { RolesGuard } from '../../auth/roles.guard';

@Controller('schedule')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('my')
  @Roles(Role.TEACHER, Role.STUDENT)
  async getMySchedule(@Req() req: any) {
    const user = req.user;
    const userId = user.userId || user.sub || user.id;
    let data;

    if (user.role === 'TEACHER') {
      data = await this.scheduleService.getTeacherSchedule(userId);
    } else {
      data = await this.scheduleService.getStudentSchedule(userId);
    }

    return { success: true, data };
  }

  @Get('parent/:studentId')
  @Roles(Role.PARENT)
  async getChildSchedule(@Param('studentId') studentId: string, @Req() req: any) {
    const parentId = req.user.userId || req.user.sub || req.user.id;
    const data = await this.scheduleService.getParentChildSchedule(parentId, studentId);
    return { success: true, data };
  }
}

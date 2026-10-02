import { Body, Controller, Get, Post, Query, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/roles.guard';
import { AttendanceService } from './attendance.service';
import { MarkClassAttendanceDto } from './dto/mark-class-attendance.dto';

@Controller('attendance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @Roles(Role.STUDENT, Role.PARENT)
  async getAttendance(@Request() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.attendanceService.getMyAttendance(userId);
  }

  @Get('classes/:classId')
  @Roles(Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR)
  getClassAttendance(
    @Param('classId') classId: string,
    @Query('date') date: string,
    @Request() req: any,
  ) {
    return this.attendanceService.getClassAttendance(
      classId,
      date,
      req.user.userId || req.user.sub || req.user.id,
      req.user.role,
      req.user.schoolId,
    );
  }

  @Post('classes/:classId')
  @Roles(Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL)
  markClassAttendance(
    @Param('classId') classId: string,
    @Body() body: MarkClassAttendanceDto,
    @Request() req: any,
  ) {
    return this.attendanceService.markClassAttendance(
      classId,
      body,
      req.user.userId || req.user.sub || req.user.id,
      req.user.role,
      req.user.schoolId,
    );
  }
}

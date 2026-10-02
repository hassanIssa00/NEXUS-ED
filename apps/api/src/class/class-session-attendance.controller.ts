import { Body, Controller, Post, Param, UseGuards, Request } from '@nestjs/common';
import { ClassSessionService } from './class-session.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/roles.guard';
import { MarkClassSessionAttendanceDto } from './dto/start-class-session.dto';

@ApiTags('Class Sessions')
@Controller('classes/:classId/sessions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class ClassSessionAttendanceController {
  constructor(private readonly sessionService: ClassSessionService) {}

  @Post(':sessionId/attendance')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Mark student attendance for session' })
  async markAttendance(
    @Param('classId') classId: string,
    @Param('sessionId') sessionId: string,
    @Body() body: MarkClassSessionAttendanceDto,
    @Request() req: any,
  ) {
    return this.sessionService.markAttendance(
      classId,
      sessionId,
      body.studentId,
      req.user.userId || req.user.sub || req.user.id,
      req.user.schoolId,
    );
  }
}

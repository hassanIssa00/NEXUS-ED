import { Controller, Post, Param, UseGuards, Request } from '@nestjs/common';
import { ClassSessionService } from './class-session.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Class Sessions')
@Controller('classes/:classId/sessions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class ClassSessionAttendanceController {
  constructor(private readonly sessionService: ClassSessionService) {}

  @Post(':sessionId/check-in')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Record attendance after the student has connected to the live room' })
  async checkIn(
    @Param('classId') classId: string,
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.sessionService.recordStudentJoin(
      classId, sessionId, req.user.userId || req.user.sub || req.user.id, req.user.schoolId,
    );
  }
}

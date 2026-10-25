import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ClassSessionService } from './class-session.service';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/roles.guard';
import { StartClassSessionDto } from './dto/start-class-session.dto';

@ApiTags('Class Sessions')
@Controller('classes/:classId/sessions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class ClassSessionController {
  constructor(private readonly sessionService: ClassSessionService) {}

  @Post('start')
  @Roles(Role.TEACHER)
  @Throttle({ long: { limit: 5, ttl: 10 * 60 * 1000 } })
  @ApiOperation({ summary: 'Start a live session' })
  async startSession(
    @Param('classId') classId: string,
    @Request() req: any,
    @Body() body: StartClassSessionDto,
  ) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    return this.sessionService.startSession(
      classId,
      userId,
      req.user.schoolId,
      body.title,
      body.duration,
    );
  }

  @Post(':sessionId/token')
  @Roles(Role.TEACHER, Role.STUDENT)
  @Throttle({ long: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a short-lived token for an internal class broadcast' })
  async joinSession(
    @Param('classId') classId: string,
    @Param('sessionId') sessionId: string,
    @Request() req: any,
  ) {
    return this.sessionService.joinSession(
      classId,
      sessionId,
      req.user.userId || req.user.sub || req.user.id,
      req.user.role,
      req.user.schoolId,
    );
  }

  @Post(':sessionId/end')
  @Roles(Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'End a live session' })
  async endSession(@Param('sessionId') sessionId: string, @Request() req: any) {
    return this.sessionService.endSession(sessionId, req.user.userId || req.user.sub || req.user.id, req.user.role, req.user.schoolId);
  }

  @Post(':sessionId/recording/retry')
  @Roles(Role.TEACHER)
  @Throttle({ long: { limit: 2, ttl: 15 * 60 * 1000 } })
  @ApiOperation({ summary: 'Retry recording a live class session' })
  async retryRecording(@Param('classId') classId: string, @Param('sessionId') sessionId: string, @Request() req: any) {
    return this.sessionService.retryRecording(
      classId, sessionId, req.user.userId || req.user.sub || req.user.id, req.user.schoolId,
    );
  }

  @Get(':sessionId/recording')
  @Roles(Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR)
  @Throttle({ long: { limit: 8, ttl: 60_000 } })
  @ApiOperation({ summary: 'Get a temporary private download link for a completed class recording' })
  async downloadRecording(@Param('classId') classId: string, @Param('sessionId') sessionId: string, @Request() req: any) {
    return this.sessionService.getRecordingDownload(
      classId, sessionId, req.user.userId || req.user.sub || req.user.id, req.user.role, req.user.schoolId,
    );
  }

  @Get('active')
  @Roles(Role.TEACHER, Role.STUDENT, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Get active session for class' })
  async getActiveSession(@Param('classId') classId: string, @Request() req: any) {
    return this.sessionService.getActiveSession(classId, req.user.userId || req.user.sub || req.user.id, req.user.role, req.user.schoolId);
  }

  @Get('history')
  @Roles(Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Get session history' })
  async getHistory(@Param('classId') classId: string, @Request() req: any) {
    return this.sessionService.getSessionHistory(classId, req.user.userId || req.user.sub || req.user.id, req.user.role, req.user.schoolId);
  }
}

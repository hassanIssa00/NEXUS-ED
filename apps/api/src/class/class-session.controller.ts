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
      body.meetingUrl,
      body.duration,
    );
  }

  @Post(':sessionId/end')
  @Roles(Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'End a live session' })
  async endSession(@Param('sessionId') sessionId: string, @Request() req: any) {
    return this.sessionService.endSession(sessionId, req.user.userId || req.user.sub || req.user.id, req.user.role, req.user.schoolId);
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

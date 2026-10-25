import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../../auth/role.enum';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MEETING_ACCOUNT_ROLES, MEETING_SCHOOL_MANAGER_ROLES, MeetingActor, MeetingsService } from './meetings.service';

@ApiTags('Nexus Meetings')
@ApiBearerAuth()
@Controller('meetings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(...MEETING_ACCOUNT_ROLES)
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  @Get('staff')
  @Roles(...MEETING_SCHOOL_MANAGER_ROLES)
  findStaff(@Req() req: any, @Query('q') query?: string) {
    return this.meetings.findStaff(this.actor(req), query);
  }

  @Get()
  list(@Req() req: any) {
    return this.meetings.list(this.actor(req));
  }

  @Post()
  @Throttle({ long: { limit: 8, ttl: 60 * 60 * 1000 } })
  create(@Req() req: any, @Body() body: CreateMeetingDto) {
    return this.meetings.create(this.actor(req), body);
  }

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.meetings.get(this.actor(req), id);
  }

  @Post(':id/join')
  @Throttle({ long: { limit: 30, ttl: 60_000 } })
  join(@Req() req: any, @Param('id') id: string) {
    return this.meetings.join(this.actor(req), id);
  }

  @Post(':id/leave')
  leave(@Req() req: any, @Param('id') id: string) {
    return this.meetings.leave(this.actor(req), id);
  }

  @Post(':id/end')
  end(@Req() req: any, @Param('id') id: string) {
    return this.meetings.end(this.actor(req), id);
  }

  @Post(':id/cancel')
  cancel(@Req() req: any, @Param('id') id: string) {
    return this.meetings.cancel(this.actor(req), id);
  }

  @Post(':id/participants/:participantId/remove')
  removeParticipant(@Req() req: any, @Param('id') id: string, @Param('participantId') participantId: string) {
    return this.meetings.removeParticipant(this.actor(req), id, participantId);
  }

  private actor(req: any): MeetingActor {
    return {
      userId: req.user.userId || req.user.sub || req.user.id,
      schoolId: req.user.schoolId,
      role: req.user.role as Role,
    };
  }
}

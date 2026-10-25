import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { ClassSessionService } from './class-session.service';

@Controller('internal/class-sessions')
export class ClassSessionCronController {
  constructor(private readonly sessions: ClassSessionService) {}

  @Get('reconcile-expired')
  async reconcileExpired(@Headers('authorization') authorization?: string) {
    const secret = process.env.CRON_SECRET;
    if (!secret || !authorization?.startsWith('Bearer ')) throw new UnauthorizedException();
    const supplied = Buffer.from(authorization.slice(7));
    const expected = Buffer.from(secret);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      throw new UnauthorizedException();
    }
    return this.sessions.reconcileExpiredSessions();
  }
}

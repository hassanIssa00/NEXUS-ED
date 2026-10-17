import { Controller, Get, Headers, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { TeacherAutomationService } from './teacher-automation.service';

@Controller('internal/automation')
export class AutomationCronController {
  constructor(private readonly automationService: TeacherAutomationService) {}

  @Get('run')
  async run(@Headers('authorization') authorization?: string) {
    const secret = process.env.CRON_SECRET;
    if (!secret || secret.length < 16) throw new ServiceUnavailableException('Automation schedule is not configured');
    const expected = Buffer.from(`Bearer ${secret}`);
    const provided = Buffer.from(authorization || '');
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) throw new UnauthorizedException();
    return { success: true, data: await this.automationService.runAllActiveRules() };
  }
}

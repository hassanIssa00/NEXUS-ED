import { Module } from '@nestjs/common';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';

import { ClassSessionController } from './class-session.controller';
import { ClassSessionAttendanceController } from './class-session-attendance.controller';
import { ClassSessionService } from './class-session.service';
import { ClassSessionCronController } from './class-session-cron.controller';

import { GamificationModule } from '../gamification/gamification.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [GamificationModule, UploadModule],
  controllers: [
    ClassController,
    ClassSessionController,
    ClassSessionAttendanceController,
    ClassSessionCronController,
  ],
  providers: [ClassService, ClassSessionService],
})
export class ClassModule {}

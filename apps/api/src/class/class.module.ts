import { Module } from '@nestjs/common';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';

import { ClassSessionController } from './class-session.controller';
import { ClassSessionAttendanceController } from './class-session-attendance.controller';
import { ClassSessionService } from './class-session.service';

import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [GamificationModule],
  controllers: [
    ClassController,
    ClassSessionController,
    ClassSessionAttendanceController,
  ],
  providers: [ClassService, ClassSessionService],
})
export class ClassModule {}

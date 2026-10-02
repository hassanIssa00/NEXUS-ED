import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AssignmentController } from './assignment.controller';
import { AssignmentService } from './assignment.service';
import { AutoGradingService } from './auto-grading.service';
import { PrismaService } from '../prisma.service';

import { AssignmentTemplateService } from './assignment-template.service';
import { AssignmentTemplateController } from './assignment-template.controller';
import { EventsModule } from '../gateway/events.module';
import { GamificationModule } from '../gamification/gamification.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [ConfigModule, EventsModule, GamificationModule, UploadModule],
  controllers: [AssignmentController, AssignmentTemplateController],
  providers: [
    AssignmentService,
    AutoGradingService,
    AssignmentTemplateService,
    PrismaService,
  ],
  exports: [AssignmentService, AutoGradingService, AssignmentTemplateService],
})
export class AssignmentModule {}


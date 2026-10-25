import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { StudentAnalyticsController } from './student-analytics.controller';
import { StudentAnalyticsService } from './student-analytics.service';

import { ExcelExportService } from './excel-export.service';
import { ExcelExportController } from './excel-export.controller';
import { EarlyInterventionService } from './early-intervention.service';
import { EventsModule } from '../gateway/events.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [EventsModule, UploadModule],
  controllers: [
    AnalyticsController,
    StudentAnalyticsController,
    ExcelExportController,
  ],
  providers: [
    AnalyticsService,
    StudentAnalyticsService,
    ExcelExportService,
    EarlyInterventionService,
  ],
  exports: [AnalyticsService, StudentAnalyticsService, ExcelExportService, EarlyInterventionService],
})
export class AnalyticsModule {}

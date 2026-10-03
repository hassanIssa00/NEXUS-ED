import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ScheduledReportService } from './scheduled-report.service';
import { NotificationModule } from '../notifications/notification.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NotificationModule,
    QueueModule, // Removed dependency for now
  ],
  controllers: [ReportController],
  providers: [ReportService, ScheduledReportService],
  exports: [ReportService, ScheduledReportService],
})
export class ReportModule {}

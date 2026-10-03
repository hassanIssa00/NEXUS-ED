import { Module } from '@nestjs/common';
import { MillionSimpleController } from './million-simple.controller';
import { MillionSimpleService } from './million-simple.service';
import { AnalyticsModule } from '../../analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  controllers: [MillionSimpleController],
  providers: [MillionSimpleService],
  exports: [MillionSimpleService],
})
export class MillionSimpleModule {}

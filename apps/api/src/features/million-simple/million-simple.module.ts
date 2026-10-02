import { Module } from '@nestjs/common';
import { MillionSimpleController } from './million-simple.controller';
import { MillionSimpleService } from './million-simple.service';
import { PrismaService } from '../../prisma.service';
import { AnalyticsModule } from '../../analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  controllers: [MillionSimpleController],
  providers: [MillionSimpleService, PrismaService],
  exports: [MillionSimpleService],
})
export class MillionSimpleModule {}

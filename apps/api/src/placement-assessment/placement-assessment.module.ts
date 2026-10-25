import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PlacementAssessmentController } from './placement-assessment.controller';
import { PlacementAssessmentService } from './placement-assessment.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [AnalyticsModule, UploadModule],
  controllers: [PlacementAssessmentController],
  providers: [PlacementAssessmentService],
})
export class PlacementAssessmentModule {}

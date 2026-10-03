import { Module } from '@nestjs/common';
import { MillionJourneyController } from './million-journey.controller';
import { MillionJourneyService } from './million-journey.service';

/**
 * Million Journey Module
 * Handles the gamified roadmap, milestones, and XP progression
 */
@Module({
  controllers: [MillionJourneyController],
  providers: [MillionJourneyService],
  exports: [MillionJourneyService],
})
export class MillionJourneyModule {}

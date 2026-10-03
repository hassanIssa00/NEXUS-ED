import { Module } from '@nestjs/common';
import { AiContentGeneratorController } from './ai-content-generator.controller';
import { AiContentGeneratorService } from './ai-content-generator.service';

/**
 * AI Content Generator Module
 * Handles generated templates and question banks
 */
@Module({
  controllers: [AiContentGeneratorController],
  providers: [AiContentGeneratorService],
  exports: [AiContentGeneratorService],
})
export class AiContentGeneratorModule {}

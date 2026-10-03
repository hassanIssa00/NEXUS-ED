import { Module } from '@nestjs/common';
import { GradeService } from './grade.service';
import { GradesController } from './grade.controller';

@Module({
  controllers: [GradesController],
  providers: [GradeService],
  exports: [GradeService],
})
export class GradeModule {}

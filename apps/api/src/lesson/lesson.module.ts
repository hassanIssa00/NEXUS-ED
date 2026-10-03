import { Module } from '@nestjs/common';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  controllers: [LessonController],
  imports: [UploadModule],
  providers: [LessonService],
  exports: [LessonService],
})
export class LessonModule {}

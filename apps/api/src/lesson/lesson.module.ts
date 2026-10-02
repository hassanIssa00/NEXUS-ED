import { Module } from '@nestjs/common';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';
import { PrismaService } from '../prisma.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  controllers: [LessonController],
  imports: [UploadModule],
  providers: [LessonService, PrismaService],
  exports: [LessonService],
})
export class LessonModule {}

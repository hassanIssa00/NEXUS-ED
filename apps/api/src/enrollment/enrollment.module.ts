import { Module } from '@nestjs/common';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  controllers: [EnrollmentController],
  imports: [UploadModule],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}

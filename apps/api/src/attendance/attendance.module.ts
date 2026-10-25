import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  controllers: [AttendanceController],
  imports: [UploadModule],
  providers: [AttendanceService],
})
export class AttendanceModule {}

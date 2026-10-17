import { Module } from '@nestjs/common';
import { UploadModule } from '../../upload/upload.module';
import { TeacherWorkspaceController } from './teacher-workspace.controller';
import { TeacherWorkspaceService } from './teacher-workspace.service';

@Module({
  imports: [UploadModule],
  controllers: [TeacherWorkspaceController],
  providers: [TeacherWorkspaceService],
  exports: [TeacherWorkspaceService],
})
export class TeacherWorkspaceModule {}

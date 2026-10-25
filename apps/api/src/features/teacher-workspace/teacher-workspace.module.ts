import { Module } from '@nestjs/common';
import { UploadModule } from '../../upload/upload.module';
import { TeacherWorkspaceController } from './teacher-workspace.controller';
import { CertificateVerificationController } from './certificate-verification.controller';
import { TeacherWorkspaceService } from './teacher-workspace.service';

@Module({
  imports: [UploadModule],
  controllers: [TeacherWorkspaceController, CertificateVerificationController],
  providers: [TeacherWorkspaceService],
  exports: [TeacherWorkspaceService],
})
export class TeacherWorkspaceModule {}

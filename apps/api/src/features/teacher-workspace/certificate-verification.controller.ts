import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../infrastructure/decorators/public.decorator';
import { TeacherWorkspaceService } from './teacher-workspace.service';

@Controller('workspace/certificates')
export class CertificateVerificationController {
  constructor(private readonly workspace: TeacherWorkspaceService) {}

  @Public()
  @Get('verify/:serial')
  verify(@Param('serial') serial: string) {
    return this.workspace.verifyCertificate(serial);
  }
}

import { Controller, Get, Param, ParseIntPipe, Post, Body, Query, Req, StreamableFile, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../auth/role.enum';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SubmitPlacementAssessmentDto } from './dto/submit-placement-assessment.dto';
import { ManualPlacementAssessmentDto } from './dto/manual-placement-assessment.dto';
import { PlacementAssessmentService } from './placement-assessment.service';
import { renderPlacementAssessmentPdf } from './placement-assessment-pdf-renderer';
import { UploadService } from '../upload/upload.service';
import { avatarDataUrlToBuffer } from '../upload/avatar-validation';

const REPORT_ROLES = [Role.STUDENT, Role.PARENT, Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR];
const STUDENT_RECORD_REPORT_ROLES = [...REPORT_ROLES, Role.ACCOUNTANT, Role.HR];
const MANUAL_ASSESSMENT_ROLES = [Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR];

@ApiTags('Placement assessments')
@ApiBearerAuth()
@Controller('assessments/placement')
@Throttle({ long: { limit: 60, ttl: 60_000 } })
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PlacementAssessmentController {
  constructor(private readonly service: PlacementAssessmentService, private readonly uploads: UploadService) {}

  @Get('current')
  @Roles(Role.STUDENT)
  getCurrent(@Req() request: any) {
    return this.service.getCurrentAssessment(this.userId(request));
  }

  @Post('submit')
  @Roles(Role.STUDENT)
  submit(@Req() request: any, @Body() body: SubmitPlacementAssessmentDto) {
    return this.service.submit(this.userId(request), body.answers);
  }

  @Get('catalog')
  @Roles(...MANUAL_ASSESSMENT_ROLES)
  getManualCatalog(@Req() request: any) {
    return this.service.getManualAssessmentCatalog(this.userId(request), request.user.role);
  }

  @Get('catalog/:gradeLevel')
  @Roles(...MANUAL_ASSESSMENT_ROLES)
  getManualAssessment(@Req() request: any, @Param('gradeLevel', ParseIntPipe) gradeLevel: number) {
    return this.service.getManualAssessment(this.userId(request), request.user.role, gradeLevel);
  }

  @Post('manual')
  @Roles(...MANUAL_ASSESSMENT_ROLES)
  submitManualAssessment(@Req() request: any, @Body() body: ManualPlacementAssessmentDto) {
    return this.service.submitManualAssessment(
      this.userId(request),
      request.user.role,
      body.candidateName,
      body.gradeLevel,
      body.answers,
    );
  }

  @Get('manual-reports')
  @Roles(...MANUAL_ASSESSMENT_ROLES)
  getManualReports(@Req() request: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.listManualPlacementReports(
      this.userId(request),
      request.user.role,
      Number(page) || 1,
      Number(limit) || 25,
    );
  }

  @Get('manual-reports/:reportId/pdf')
  @Roles(...MANUAL_ASSESSMENT_ROLES)
  @Throttle({ long: { limit: 8, ttl: 60_000 } })
  async downloadManualReportPdf(@Req() request: any, @Param('reportId') reportId: string) {
    const report = await this.service.getManualPlacementReport(this.userId(request), request.user.role, reportId);
    const pdf = await renderPlacementAssessmentPdf({ ...report, personLabel: 'المتقدم', reportTitle: 'تقرير اختبار تحديد المستوى للمتقدم' });
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="Nexus-placement-candidate-${report.id.slice(-8)}.pdf"`,
    });
  }

  @Get('manual-reports/:reportId')
  @Roles(...MANUAL_ASSESSMENT_ROLES)
  getManualReport(@Req() request: any, @Param('reportId') reportId: string) {
    return this.service.getManualPlacementReport(this.userId(request), request.user.role, reportId);
  }

  @Get('reports')
  @Roles(...REPORT_ROLES)
  getReports(@Req() request: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.listReports(
      this.userId(request),
      request.user.role,
      Number(page) || 1,
      Number(limit) || 25,
    );
  }

  @Get('reports/:attemptId')
  @Roles(...STUDENT_RECORD_REPORT_ROLES)
  async getReport(@Req() request: any, @Param('attemptId') attemptId: string) {
    const report = await this.service.getReport(this.userId(request), request.user.role, attemptId);
    report.studentAvatar = await this.resolveReportAvatar(report.studentAvatar);
    return report;
  }

  @Get('reports/:attemptId/pdf')
  @Roles(...STUDENT_RECORD_REPORT_ROLES)
  @Throttle({ long: { limit: 8, ttl: 60_000 } })
  async downloadReportPdf(@Req() request: any, @Param('attemptId') attemptId: string, @Query('locale') locale?: string) {
    const report = await this.service.getReport(this.userId(request), request.user.role, attemptId);
    report.studentAvatar = await this.resolveReportAvatar(report.studentAvatar);
    const pdf = await renderPlacementAssessmentPdf({ ...report, locale: locale === 'en' ? 'en' : 'ar' });
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="Nexus-assessment-${report.id.slice(-8)}.pdf"`,
    });
  }

  private userId(request: any): string {
    return request.user.userId || request.user.sub || request.user.id;
  }

  private async resolveReportAvatar(reference?: string | null): Promise<string | null> {
    if (!reference) return null;
    if (reference.startsWith('data:')) return avatarDataUrlToBuffer(reference) ? reference : null;
    return this.uploads.getSignedUrlForReference(reference).catch(() => null);
  }
}

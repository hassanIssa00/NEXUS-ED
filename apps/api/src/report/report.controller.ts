import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../infrastructure/decorators/roles.decorator';
import { Role } from '../shared/enums/roles.enum';
import { ReportService } from './report.service';

import { ScheduledReportService } from './scheduled-report.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class ReportController {
  constructor(
    private readonly reportService: ReportService,
    private readonly scheduledReportService: ScheduledReportService,
  ) {}

  @Post('student/:studentId/certificate')
  @ApiOperation({
    summary: 'Generate student certificate',
    description: 'إنشاء شهادة للطالب',
  })
  @ApiResponse({
    status: 201,
    description: 'Certificate generation job created',
  })
  async generateCertificate(
    @Param('studentId') studentId: string,
    @Body()
    data: {
      studentName: string;
      className: string;
      grade: string;
      year: string;
    },
  ) {
    return this.reportService.generateStudentCertificate(studentId, data);
  }

  @Post('class/:classId/attendance')
  @ApiOperation({
    summary: 'Generate attendance report',
    description: 'إنشاء تقرير الحضور',
  })
  @ApiResponse({ status: 201, description: 'Attendance report job created' })
  async generateAttendanceReport(
    @Param('classId') classId: string,
    @Body()
    data: {
      className: string;
      startDate: string;
      endDate: string;
      rows: Array<{
        studentName: string;
        date: string;
        status: string;
      }>;
    },
  ) {
    return this.reportService.generateAttendanceReport(classId, data);
  }

  @Post('class/:classId/grades')
  @ApiOperation({
    summary: 'Generate grades report',
    description: 'إنشاء تقرير الدرجات',
  })
  @ApiResponse({ status: 201, description: 'Grades report job created' })
  async generateGradesReport(
    @Param('classId') classId: string,
    @Body()
    data: {
      className: string;
      subject: string;
      rows: Array<{
        studentName: string;
        grade: number;
        percentage: string;
      }>;
    },
  ) {
    return this.reportService.generateGradesReport(classId, data);
  }

  @Get('job/:jobId/status')
  @ApiOperation({
    summary: 'Check report job status',
    description: 'فحص حالة التقرير',
  })
  @ApiResponse({ status: 200, description: 'Job status returned' })
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.reportService.getJobStatus(jobId);
  }

  @Post('trigger-weekly')
  @ApiOperation({
    summary: 'Trigger weekly reports manually',
    description: 'إرسال التقارير الأسبوعية يدوياً',
  })
  async triggerWeeklyReports() {
    await this.scheduledReportService.handleWeeklyReports();
    return { success: true, message: 'Weekly reports generation started' };
  }
}

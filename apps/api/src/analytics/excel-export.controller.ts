import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { ExcelExportService } from './excel-export.service';
import { StudentAnalyticsService } from './student-analytics.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Excel Export')
@Controller('export')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ExcelExportController {
  constructor(
    private readonly excelService: ExcelExportService,
    private readonly studentAnalyticsService: StudentAnalyticsService,
  ) {}

  @Get('student/:studentId/grades')
  @Roles(Role.STUDENT, Role.PARENT, Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR, Role.HR)
  @ApiOperation({ summary: 'Export student grades as Excel' })
  @ApiResponse({ status: 200, description: 'Excel file generated' })
  async exportStudentGrades(
    @Param('studentId') studentId: string,
    @Res() res: Response,
    @Req() request: any,
  ): Promise<void> {
    const actor = request.user;
    await this.studentAnalyticsService.assertCanAccessStudent(actor.userId || actor.sub || actor.id, actor.role, studentId);
    const buffer = await this.excelService.exportStudentGrades(studentId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=student_grades_${studentId}.xlsx`,
    );

    res.send(buffer);
  }

  @Get('student/:studentId/report')
  @Roles(Role.STUDENT, Role.PARENT, Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR, Role.HR)
  @ApiOperation({ summary: 'Export comprehensive student report' })
  async exportStudentReport(
    @Param('studentId') studentId: string,
    @Res() res: Response,
    @Req() request: any,
  ): Promise<void> {
    const actor = request.user;
    await this.studentAnalyticsService.assertCanAccessStudent(actor.userId || actor.sub || actor.id, actor.role, studentId);
    const buffer = await this.excelService.exportStudentReport(studentId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=student_report_${studentId}.xlsx`,
    );

    res.send(buffer);
  }

  @Get('student/:studentId/analytics')
  @Roles(Role.STUDENT, Role.PARENT, Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR, Role.HR)
  @ApiOperation({ summary: 'Export student analytics' })
  async exportAnalytics(
    @Param('studentId') studentId: string,
    @Res() res: Response,
    @Req() request: any,
  ): Promise<void> {
    const actor = request.user;
    await this.studentAnalyticsService.assertCanAccessStudent(actor.userId || actor.sub || actor.id, actor.role, studentId);
    const buffer = await this.excelService.exportAnalytics(studentId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=student_analytics_${studentId}.xlsx`,
    );

    res.send(buffer);
  }

  @Get('subject/:subjectId/grades')
  @Roles(Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.SUPERVISOR, Role.HR)
  @ApiOperation({ summary: 'Export all grades for a subject' })
  async exportSubjectGrades(
    @Param('subjectId') subjectId: string,
    @Res() res: Response,
    @Req() request: any,
  ): Promise<void> {
    const actor = request.user;
    await this.studentAnalyticsService.assertCanAccessSubject(actor.userId || actor.sub || actor.id, actor.role, subjectId);
    const buffer = await this.excelService.exportSubjectGrades(subjectId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=subject_grades_${subjectId}.xlsx`,
    );

    res.send(buffer);
  }

  @Get('class/:classId/attendance')
  @Roles(Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.SUPERVISOR, Role.HR)
  @ApiOperation({ summary: 'Export class attendance report' })
  async exportClassAttendance(
    @Param('classId') classId: string,
    @Res() res: Response,
    @Req() request: any,
  ): Promise<void> {
    const actor = request.user;
    await this.studentAnalyticsService.assertCanAccessClass(actor.userId || actor.sub || actor.id, actor.role, classId);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1); // Last month
    const endDate = new Date();

    const buffer = await this.excelService.exportClassAttendance(
      classId,
      startDate,
      endDate,
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=class_attendance_${classId}.xlsx`,
    );

    res.send(buffer);
  }
}

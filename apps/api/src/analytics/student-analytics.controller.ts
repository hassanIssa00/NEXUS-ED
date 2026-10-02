import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/roles.guard';
import {
  StudentAnalyticsService,
  StudentProgressPoint,
  ClassComparison,
  EarlyWarning,
  ParentReport,
} from './student-analytics.service';

@ApiTags('Student Analytics')
@Controller('analytics/student')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class StudentAnalyticsController {
  constructor(
    private readonly studentAnalyticsService: StudentAnalyticsService,
  ) {}

  @Get(':studentId/progress')
  @Roles(Role.STUDENT, Role.PARENT, Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR, Role.HR)
  @ApiOperation({ summary: 'Get student progress over time' })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to analyze (default: 30)',
  })
  @ApiResponse({ status: 200, description: 'Student progress data for charts' })
  async getStudentProgress(
    @Param('studentId') studentId: string,
    @Query('days') days?: number,
    @Req() request?: any,
  ): Promise<StudentProgressPoint[]> {
    const actor = request.user;
    await this.studentAnalyticsService.assertCanAccessStudent(actor.userId || actor.sub || actor.id, actor.role, studentId);
    return this.studentAnalyticsService.getStudentProgress(
      studentId,
      days || 30,
    );
  }

  @Get(':studentId/comparison')
  @Roles(Role.STUDENT, Role.PARENT, Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR, Role.HR)
  @ApiOperation({ summary: 'Compare student with their class' })
  @ApiResponse({
    status: 200,
    description: 'Class comparison data including rank and percentile',
  })
  async getClassComparison(
    @Param('studentId') studentId: string,
    @Req() request?: any,
  ): Promise<ClassComparison> {
    const actor = request.user;
    await this.studentAnalyticsService.assertCanAccessStudent(actor.userId || actor.sub || actor.id, actor.role, studentId);
    return this.studentAnalyticsService.getClassComparison(studentId);
  }

  @Get(':studentId/parent-report')
  @Roles(Role.STUDENT, Role.PARENT, Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR, Role.HR)
  @ApiOperation({ summary: 'Generate parent report for student' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['week', 'month'],
    description: 'Report period (default: month)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Comprehensive parent report with grades, attendance, and recommendations',
  })
  async getParentReport(
    @Param('studentId') studentId: string,
    @Query('period') period?: 'week' | 'month',
    @Req() request?: any,
  ): Promise<ParentReport> {
    const actor = request.user;
    await this.studentAnalyticsService.assertCanAccessStudent(actor.userId || actor.sub || actor.id, actor.role, studentId);
    return this.studentAnalyticsService.getParentReport(
      studentId,
      period || 'month',
    );
  }

  @Get('early-warnings')
  @Roles(Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR, Role.HR)
  @ApiOperation({ summary: 'Get early warning alerts for at-risk students' })
  @ApiQuery({
    name: 'classId',
    required: false,
    type: String,
    description: 'Filter by class ID',
  })
  @ApiResponse({
    status: 200,
    description: 'List of students with warning alerts sorted by risk level',
  })
  async getEarlyWarnings(
    @Query('classId') classId?: string,
    @Req() request?: any,
  ): Promise<EarlyWarning[]> {
    const actor = request.user;
    await this.studentAnalyticsService.assertCanAccessClass(actor.userId || actor.sub || actor.id, actor.role, classId);
    return this.studentAnalyticsService.getEarlyWarnings(classId);
  }
}

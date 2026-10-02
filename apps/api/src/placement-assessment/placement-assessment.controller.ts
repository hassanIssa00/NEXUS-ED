import { Controller, Get, Param, Post, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../auth/role.enum';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SubmitPlacementAssessmentDto } from './dto/submit-placement-assessment.dto';
import { PlacementAssessmentService } from './placement-assessment.service';

const REPORT_ROLES = [Role.PARENT, Role.TEACHER, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR];

@ApiTags('Placement assessments')
@ApiBearerAuth()
@Controller('assessments/placement')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PlacementAssessmentController {
  constructor(private readonly service: PlacementAssessmentService) {}

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
  @Roles(...REPORT_ROLES)
  getReport(@Req() request: any, @Param('attemptId') attemptId: string) {
    return this.service.getReport(this.userId(request), request.user.role, attemptId);
  }

  private userId(request: any): string {
    return request.user.userId || request.user.sub || request.user.id;
  }
}

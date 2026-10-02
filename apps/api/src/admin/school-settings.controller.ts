import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/roles.guard';
import {
  SchoolSettingsService,
  SchoolSettings,
} from './school-settings.service';

@ApiTags('School Settings')
@Controller('admin/settings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SchoolSettingsController {
  constructor(private readonly settingsService: SchoolSettingsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.PRINCIPAL)
  @ApiOperation({ summary: 'Get all school settings' })
  @ApiResponse({ status: 200, description: 'School settings retrieved' })
  async getSettings(@Req() req: any): Promise<SchoolSettings> {
    return this.settingsService.getSettings(req.user.schoolId);
  }

  @Put()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update school settings' })
  async updateSettings(
    @Body() updates: Partial<SchoolSettings>,
    @Req() req: any,
  ): Promise<SchoolSettings> {
    return this.settingsService.updateSettings(updates, req.user.schoolId, req.user.userId);
  }

  @Put('grading')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update grading system settings' })
  async updateGradingSystem(
    @Body() config: Partial<SchoolSettings['gradingSystem']>,
    @Req() req: any,
  ): Promise<SchoolSettings> {
    return this.settingsService.updateGradingSystem(config, req.user.schoolId, req.user.userId);
  }

  @Put('periods')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update periods configuration' })
  async updatePeriodsConfig(
    @Body() config: Partial<SchoolSettings['periodsConfig']>,
    @Req() req: any,
  ): Promise<SchoolSettings> {
    return this.settingsService.updatePeriodsConfig(config, req.user.schoolId, req.user.userId);
  }

  @Put('attendance')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update attendance policy' })
  async updateAttendancePolicy(
    @Body() config: Partial<SchoolSettings['attendancePolicy']>,
    @Req() req: any,
  ): Promise<SchoolSettings> {
    return this.settingsService.updateAttendancePolicy(config, req.user.schoolId, req.user.userId);
  }

  @Put('reports')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update report settings' })
  async updateReportSettings(
    @Body() config: Partial<SchoolSettings['reportSettings']>,
    @Req() req: any,
  ): Promise<SchoolSettings> {
    return this.settingsService.updateReportSettings(config, req.user.schoolId, req.user.userId);
  }
}

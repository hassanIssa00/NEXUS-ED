import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { TeacherAutomationService } from './teacher-automation.service';
import { JwtAuthGuard } from '../../infrastructure/guards/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/role.enum';

@Controller('teacher/automation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class TeacherAutomationController {
  constructor(private readonly automationService: TeacherAutomationService) {}

  @Get('rules')
  async getRules(@Req() req: any) {
    const teacherId = req.user.sub || req.user.id;
    const data = await this.automationService.getMyRules(teacherId);
    return { success: true, data };
  }

  @Post('rules')
  async createRule(@Req() req: any, @Body() body: any) {
    const teacherId = req.user.sub || req.user.id;
    const data = await this.automationService.createRule(teacherId, body);
    return { success: true, message: 'Rule created successfully', data };
  }

  @Put('rules/:id/toggle')
  async toggleRule(@Req() req: any, @Param('id') id: string) {
    const teacherId = req.user.sub || req.user.id;
    const data = await this.automationService.toggleRule(teacherId, id);
    return { success: true, message: 'Rule toggled', data };
  }

  @Delete('rules/:id')
  async deleteRule(@Req() req: any, @Param('id') id: string) {
    const teacherId = req.user.sub || req.user.id;
    await this.automationService.deleteRule(teacherId, id);
    return { success: true, message: 'Rule deleted' };
  }

  @Get('rules/:id/logs')
  async getLogs(@Req() req: any, @Param('id') id: string) {
    const teacherId = req.user.sub || req.user.id;
    const data = await this.automationService.getRuleLogs(teacherId, id);
    return { success: true, data };
  }
}

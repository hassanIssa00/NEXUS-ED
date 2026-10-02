import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AiContentGeneratorService } from './ai-content-generator.service';
import { JwtAuthGuard } from '../../infrastructure/guards/auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { Role } from '../../auth/role.enum';

@Controller('teacher/ai-generator')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
export class AiContentGeneratorController {
  constructor(private readonly generatorService: AiContentGeneratorService) {}

  @Get('templates')
  async getTemplates(@Req() req: any) {
    const teacherId = req.user.sub || req.user.id;
    const data = await this.generatorService.getMyTemplates(teacherId);
    return { success: true, data };
  }

  @Post('templates')
  async saveTemplate(@Req() req: any, @Body() body: any) {
    const teacherId = req.user.sub || req.user.id;
    const data = await this.generatorService.saveTemplate(teacherId, body);
    return { success: true, message: 'Template saved successfully', data };
  }

  @Delete('templates/:id')
  async deleteTemplate(@Req() req: any, @Param('id') id: string) {
    const teacherId = req.user.sub || req.user.id;
    await this.generatorService.deleteTemplate(teacherId, id);
    return { success: true, message: 'Template deleted' };
  }

  @Get('question-banks')
  async getQuestionBanks(@Req() req: any, @Query('subjectId') subjectId?: string) {
    const teacherId = req.user.sub || req.user.id;
    const data = await this.generatorService.getQuestionBanks(teacherId, subjectId);
    return { success: true, data };
  }

  @Post('question-banks')
  async saveQuestionBank(@Req() req: any, @Body() body: { subjectId: string; topic: string; questions: any[] }) {
    const teacherId = req.user.sub || req.user.id;
    const data = await this.generatorService.saveQuestionBank(teacherId, body.subjectId, body.topic, body.questions);
    return { success: true, message: 'Question bank saved', data };
  }
}

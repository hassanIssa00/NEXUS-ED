import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import {
  AssignmentTemplateService,
  AssignmentTemplate,
} from './assignment-template.service';

@ApiTags('Assignment Templates')
@Controller('templates/assignments')
@ApiBearerAuth()
export class AssignmentTemplateController {
  constructor(private readonly templateService: AssignmentTemplateService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get all assignment templates' })
  @ApiResponse({ status: 200, description: 'Templates retrieved' })
  async getAllTemplates(
    @Query('category') category?: string,
  ): Promise<AssignmentTemplate[]> {
    return this.templateService.getAllTemplates(category);
  }

  @Get('search')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Search templates' })
  async searchTemplates(
    @Query('q') query: string,
  ): Promise<AssignmentTemplate[]> {
    return this.templateService.searchTemplates(query);
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get template statistics' })
  async getStats() {
    return this.templateService.getTemplateStats();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get template by ID' })
  async getTemplateById(
    @Param('id') id: string,
  ): Promise<AssignmentTemplate | null> {
    return this.templateService.getTemplateById(id);
  }

  @Post(':id/use')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create assignment from template' })
  async useTemplate(
    @Param('id') templateId: string,
    @Body()
    data: {
      teacherId: string;
      classId: string;
      title?: string;
      dueDate?: Date;
      points?: number;
    },
  ) {
    return this.templateService.createFromTemplate(
      templateId,
      data.teacherId,
      data.classId,
      {
        title: data.title,
        dueDate: data.dueDate,
        points: data.points,
      },
    );
  }
}

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
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
  getAllTemplates(
    @Query('category') category?: string,
  ): AssignmentTemplate[] {
    return this.templateService.getAllTemplates(category);
  }

  @Get('search')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Search templates' })
  searchTemplates(
    @Query('q') query: string,
  ): AssignmentTemplate[] {
    return this.templateService.searchTemplates(query);
  }

  @Get('stats')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get template statistics' })
  getStats() {
    return this.templateService.getTemplateStats();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get template by ID' })
  getTemplateById(
    @Param('id') id: string,
  ): AssignmentTemplate {
    return this.templateService.getTemplateById(id);
  }

  @Post(':id/use')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create assignment from template' })
  async useTemplate(
    @Param('id') templateId: string,
    @Req() request: Request & { user?: { id?: string; userId?: string } },
    @Body()
    data: {
      classId: string;
      title?: string;
      dueDate?: string;
      points?: number;
    },
  ) {
    const actorId = request.user?.userId || request.user?.id;
    if (!actorId) throw new UnauthorizedException();
    return this.templateService.createFromTemplate(
      templateId,
      actorId,
      data.classId,
      {
        title: data.title,
        dueDate: data.dueDate,
        points: data.points,
      },
    );
  }
}

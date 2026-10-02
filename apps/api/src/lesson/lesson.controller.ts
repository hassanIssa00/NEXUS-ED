import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { LessonService } from './lesson.service';
import {
  CreateLessonDto,
  UpdateLessonDto,
  LessonFilterDto,
} from './dto/lesson.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';

interface RequestWithUser extends ExpressRequest {
  user: {
    userId: string;
    email: string;
    role: Role;
  };
}

@Controller('lessons')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  create(
    @Body() createLessonDto: CreateLessonDto,
    @Request() req: RequestWithUser,
  ) {
    return this.lessonService.create(createLessonDto, req.user.userId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  findAll(@Query() filters: LessonFilterDto, @Request() req: RequestWithUser) {
    return this.lessonService.findAll(filters, req.user.userId);
  }

  @Get('my')
  @Roles(Role.TEACHER)
  findMyLessons(@Request() req: RequestWithUser) {
    return this.lessonService.findByTeacher(req.user.userId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  findOne(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.lessonService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  update(
    @Param('id') id: string,
    @Body() updateLessonDto: UpdateLessonDto,
    @Request() req: RequestWithUser,
  ) {
    return this.lessonService.update(id, updateLessonDto, req.user.userId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.lessonService.delete(id, req.user.userId);
  }
}

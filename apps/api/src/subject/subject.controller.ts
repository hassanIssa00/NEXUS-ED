import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SubjectService } from './subject.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/create-subject.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';

@Controller('subjects')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createSubjectDto: CreateSubjectDto, @Request() req: any) {
    return this.subjectService.create(createSubjectDto, req.user.schoolId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR)
  findAll(@Request() req: any) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    if (req.user.role === Role.STUDENT) return this.subjectService.findByStudent(userId, req.user.schoolId);
    if (req.user.role === Role.TEACHER) return this.subjectService.findByTeacher(userId, req.user.schoolId);
    return this.subjectService.findAll(req.user.schoolId);
  }

  /** Student: returns subjects from their active enrollment */
  @Get('my')
  @Roles(Role.STUDENT)
  findMySubjects(@Request() req: any) {
    const studentId = req.user?.userId || req.user?.sub || req.user?.id;
    return this.subjectService.findByStudent(studentId, req.user.schoolId);
  }

  /** Teacher: returns subjects they teach */
  @Get('teacher/my')
  @Roles(Role.TEACHER)
  findMyTeacherSubjects(@Request() req: any) {
    const teacherId = req.user?.userId || req.user?.sub || req.user?.id;
    return this.subjectService.findByTeacher(teacherId, req.user.schoolId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR)
  findOne(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    return this.subjectService.findOne(id, userId, req.user.role, req.user.schoolId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateSubjectDto: UpdateSubjectDto, @Request() req: any) {
    return this.subjectService.update(id, updateSubjectDto, req.user.schoolId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.subjectService.remove(id, req.user.schoolId);
  }
}

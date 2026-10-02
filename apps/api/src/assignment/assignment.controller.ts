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
import { AssignmentService } from './assignment.service';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
  SubmitAssignmentDto,
  GradeSubmissionDto,
  AssignmentFilterDto,
} from './dto/assignment.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';

@Controller('assignments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  create(
    @Body() createAssignmentDto: CreateAssignmentDto,
    @Request() req: any,
  ) {
    return this.assignmentService.create(createAssignmentDto, req.user.userId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  findAll(@Query() filters: AssignmentFilterDto, @Request() req: any) {
    return this.assignmentService.findAll(filters, req.user.userId);
  }

  @Get('my')
  @Roles(Role.TEACHER)
  findMyAssignments(@Request() req: any) {
    return this.assignmentService.findByTeacher(req.user.userId);
  }

  @Get('student')
  @Roles(Role.STUDENT)
  findStudentAssignments(@Request() req: any) {
    return this.assignmentService.findByStudent(req.user.userId);
  }

  @Get('submissions/my')
  @Roles(Role.TEACHER)
  findMySubmissions(@Request() req: any) {
    return this.assignmentService.getTeacherSubmissions(req.user.userId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.assignmentService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  update(
    @Param('id') id: string,
    @Body() updateAssignmentDto: UpdateAssignmentDto,
    @Request() req: any,
  ) {
    return this.assignmentService.update(
      id,
      updateAssignmentDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.assignmentService.delete(id, req.user.userId);
  }

  @Post(':id/submit')
  @Roles(Role.STUDENT)
  submit(
    @Param('id') id: string,
    @Body() submitDto: SubmitAssignmentDto,
    @Request() req: any,
  ) {
    return this.assignmentService.submit(id, submitDto, req.user.userId);
  }

  @Get(':id/submissions')
  @Roles(Role.TEACHER, Role.ADMIN)
  getSubmissions(@Param('id') id: string, @Request() req: any) {
    return this.assignmentService.getSubmissions(id, req.user.userId);
  }

  @Patch('submissions/:id/grade')
  @Roles(Role.TEACHER, Role.ADMIN)
  gradeSubmission(
    @Param('id') id: string,
    @Body() gradeDto: GradeSubmissionDto,
    @Request() req: any,
  ) {
    return this.assignmentService.gradeSubmission(
      id,
      gradeDto,
      req.user.userId,
    );
  }
}

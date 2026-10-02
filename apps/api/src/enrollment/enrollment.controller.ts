import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { BulkEnrollmentDto, CreateEnrollmentDto } from './dto/enrollment.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';

@Controller('enrollments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  create(@Body() createEnrollmentDto: CreateEnrollmentDto, @Request() req: any) {
    return this.enrollmentService.create(createEnrollmentDto, req.user.userId || req.user.sub || req.user.id, req.user.role, req.user.schoolId);
  }

  @Post('bulk')
  @Roles(Role.ADMIN)
  bulkEnroll(@Body() data: BulkEnrollmentDto, @Request() req: any) {
    return this.enrollmentService.bulkEnroll(data.studentIds, data.classId, req.user.schoolId);
  }

  @Get('class/:classId/candidates')
  @Roles(Role.ADMIN)
  findCandidates(
    @Param('classId') classId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Request() req: any,
  ) {
    return this.enrollmentService.findCandidates(classId, req.user.schoolId, page, limit, search);
  }

  @Get('class/:classId')
  @Roles(Role.ADMIN, Role.TEACHER)
  findByClass(@Param('classId') classId: string, @Request() req: any) {
    return this.enrollmentService.findByClass(classId, req.user.userId || req.user.sub || req.user.id, req.user.role, req.user.schoolId);
  }

  @Get('student/:studentId')
  @Roles(Role.ADMIN, Role.TEACHER, Role.PARENT)
  findByStudent(@Param('studentId') studentId: string, @Request() req: any) {
    return this.enrollmentService.findByStudent(studentId, req.user.userId || req.user.sub || req.user.id, req.user.role, req.user.schoolId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.enrollmentService.delete(id, req.user.schoolId);
  }
}

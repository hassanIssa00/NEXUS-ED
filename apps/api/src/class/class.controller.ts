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
import { ClassService } from './class.service';
import { CreateClassDto, UpdateClassDto } from './dto/create-class.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';

@Controller('classes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createClassDto: CreateClassDto, @Request() req: any) {
    return this.classService.create(createClassDto, req.user.schoolId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR)
  findAll(@Request() req: any) {
    return this.classService.findAll(req.user.userId || req.user.sub || req.user.id, req.user.role, req.user.schoolId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.SUPERVISOR)
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.classService.findOne(id, req.user.userId || req.user.sub || req.user.id, req.user.role, req.user.schoolId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto, @Request() req: any) {
    return this.classService.update(id, updateClassDto, req.user.schoolId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.classService.remove(id, req.user.schoolId);
  }

  @Get('student/list')
  @Roles(Role.STUDENT)
  findStudentClasses(@Request() req: any) {
    return this.classService.findStudentClasses(req.user.sub || req.user.id);
  }
}

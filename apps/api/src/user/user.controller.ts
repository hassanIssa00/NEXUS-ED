import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, UserFilterDto } from './dto/user.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Throttle } from '@nestjs/throttler';
import { RedeemStudentLinkCodeDto, SaveStudentProfileDto, SubmitParentSurveyDto } from './dto/student-onboarding.dto';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /** Get currently logged-in user's own profile */
  @Get('me')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR, Role.ACCOUNTANT, Role.HR)
  getMe(@Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return this.userService.findById(userId, req.user.schoolId);
  }

  /** Update currently logged-in user's profile (name, phone, avatar) */
  @Patch('me')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR, Role.ACCOUNTANT, Role.HR)
  updateMe(@Request() req: any, @Body() updateDto: UpdateUserDto) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    // Strip admin-only fields
    const { role, schoolId, ...safeData } = updateDto as any;
    return this.userService.update(userId, safeData, req.user.schoolId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR, Role.HR)
  findAll(@Query() filters: UserFilterDto, @Request() req: any) {
    return this.userService.findAll(filters, this.schoolId(req));
  }

  @Get('stats')
  @Roles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR, Role.HR)
  getStats(@Request() req: any) {
    return this.userService.getStats(this.schoolId(req));
  }

  @Get('staff')
  @Roles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.HR)
  findStaff(@Query() filters: UserFilterDto, @Request() req: any) {
    return this.userService.findStaff(filters, this.schoolId(req));
  }

  @Get('me/student-profile')
  @Roles(Role.STUDENT)
  getStudentProfile(@Request() req: any) {
    return this.userService.getStudentProfile(this.userId(req));
  }

  @Put('me/student-profile')
  @Roles(Role.STUDENT)
  saveStudentProfile(@Request() req: any, @Body() body: SaveStudentProfileDto) {
    return this.userService.saveStudentProfile(this.userId(req), body.gradeLevel, body.dateOfBirth);
  }

  @Post('student-link-code')
  @Roles(Role.STUDENT)
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  createStudentLinkCode(@Request() req: any) {
    return this.userService.createStudentLinkCode(this.userId(req));
  }

  @Post('link-student')
  @Roles(Role.PARENT)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  linkStudent(@Request() req: any, @Body() body: RedeemStudentLinkCodeDto) {
    return this.userService.redeemStudentLinkCode(this.userId(req), body.code);
  }

  @Post('parent-survey')
  @Roles(Role.PARENT)
  submitParentSurvey(@Request() req: any, @Body() body: SubmitParentSurveyDto) {
    return this.userService.submitParentSurvey(this.userId(req), body.studentId, body.answers, body.consent);
  }

  @Get('parent-surveys')
  @Roles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR)
  listParentSurveys(@Query('page') pageValue: string, @Query('limit') limitValue: string, @Request() req: any) {
    return this.userService.listParentSurveys(this.schoolId(req), this.userId(req), Number(pageValue) || 1, Number(limitValue) || 25);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR, Role.HR)
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.userService.findById(id, this.schoolId(req));
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    return this.userService.create(createUserDto, this.schoolId(req));
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req: any) {
    return this.userService.update(id, updateUserDto, this.schoolId(req));
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.userService.delete(id, this.schoolId(req));
  }

  private schoolId(req: any): string {
    if (!req.user.schoolId) throw new ForbiddenException('The account is not assigned to a school');
    return req.user.schoolId;
  }

  private userId(req: any): string {
    return req.user?.userId || req.user?.sub || req.user?.id;
  }
}

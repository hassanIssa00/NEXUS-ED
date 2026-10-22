import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { Role } from '../../auth/role.enum';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { TeacherWorkspaceService, WorkspaceActor } from './teacher-workspace.service';
import { renderCertificatePdf } from './certificate-pdf';

@Controller('workspace')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TeacherWorkspaceController {
  constructor(private readonly workspace: TeacherWorkspaceService) {}

  @Get('teacher/classes')
  @Roles(Role.TEACHER)
  getTeacherClasses(@Req() req: any) {
    return this.workspace.getTeacherClasses(this.actor(req));
  }

  @Get('teacher/classes/:id/students')
  @Roles(Role.TEACHER)
  getTeacherClassStudents(@Req() req: any, @Param('id') id: string) {
    return this.workspace.getTeacherClassStudents(this.actor(req), id);
  }

  @Get('teacher/quizzes')
  @Roles(Role.TEACHER)
  getTeacherQuizzes(@Req() req: any) {
    return this.workspace.listTeacherQuizzes(this.actor(req));
  }

  @Post('teacher/quizzes')
  @Roles(Role.TEACHER)
  createQuiz(@Req() req: any, @Body() body: any) {
    return this.workspace.createQuiz(this.actor(req), body);
  }

  @Patch('teacher/quizzes/:id/publish')
  @Roles(Role.TEACHER)
  setQuizPublished(@Req() req: any, @Param('id') id: string, @Body('published') published: boolean) {
    return this.workspace.setQuizPublished(this.actor(req), id, published === true);
  }

  @Delete('teacher/quizzes/:id')
  @Roles(Role.TEACHER)
  deleteQuiz(@Req() req: any, @Param('id') id: string) {
    return this.workspace.deleteQuiz(this.actor(req), id);
  }

  @Get('teacher/quizzes/:id/attempts')
  @Roles(Role.TEACHER)
  getQuizAttempts(@Req() req: any, @Param('id') id: string) {
    return this.workspace.listQuizAttempts(this.actor(req), id);
  }

  @Patch('teacher/quizzes/:id/attempts/:attemptId/grade')
  @Roles(Role.TEACHER)
  gradeQuizAttempt(@Req() req: any, @Param('id') id: string, @Param('attemptId') attemptId: string, @Body() body: any) {
    return this.workspace.gradeQuizAttempt(this.actor(req), id, attemptId, body);
  }

  @Get('student/quizzes')
  @Roles(Role.STUDENT)
  getStudentQuizzes(@Req() req: any) {
    return this.workspace.listStudentQuizzes(this.actor(req));
  }

  @Get('student/quizzes/:id')
  @Roles(Role.STUDENT)
  getStudentQuiz(@Req() req: any, @Param('id') id: string) {
    return this.workspace.getStudentQuiz(this.actor(req), id);
  }

  @Post('student/quizzes/:id/attempts')
  @Roles(Role.STUDENT)
  submitQuiz(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.workspace.submitQuiz(this.actor(req), id, body);
  }

  @Get('parent/quizzes')
  @Roles(Role.PARENT)
  getParentQuizzes(@Req() req: any, @Query('studentId') studentId: string) {
    return this.workspace.listStudentQuizzes(this.actor(req), studentId, true);
  }

  @Get('teacher/events')
  @Roles(Role.TEACHER)
  getTeacherEvents(@Req() req: any) {
    return this.workspace.listEvents(this.actor(req));
  }

  @Post('teacher/events')
  @Roles(Role.TEACHER)
  createEvent(@Req() req: any, @Body() body: any) {
    return this.workspace.createEvent(this.actor(req), body);
  }

  @Delete('teacher/events/:id')
  @Roles(Role.TEACHER)
  deleteEvent(@Req() req: any, @Param('id') id: string) {
    return this.workspace.deleteEvent(this.actor(req), id);
  }

  @Get('student/events')
  @Roles(Role.STUDENT)
  getStudentEvents(@Req() req: any) {
    return this.workspace.listEvents(this.actor(req), this.actor(req).userId);
  }

  @Get('parent/events')
  @Roles(Role.PARENT)
  getParentEvents(@Req() req: any, @Query('studentId') studentId: string) {
    return this.workspace.listEvents(this.actor(req), studentId, true);
  }

  @Get('teacher/meetings')
  @Roles(Role.TEACHER)
  getTeacherMeetings(@Req() req: any) {
    return this.workspace.listTeacherMeetings(this.actor(req));
  }

  @Post('teacher/meetings')
  @Roles(Role.TEACHER)
  createMeeting(@Req() req: any, @Body() body: any) {
    return this.workspace.createMeeting(this.actor(req), body);
  }

  @Patch('teacher/meetings/:id/open')
  @Roles(Role.TEACHER)
  setMeetingOpen(@Req() req: any, @Param('id') id: string, @Body('isOpen') isOpen: boolean) {
    return this.workspace.setMeetingOpen(this.actor(req), id, isOpen === true);
  }

  @Get('parent/meetings')
  @Roles(Role.PARENT)
  getParentMeetings(@Req() req: any, @Query('studentId') studentId: string) {
    return this.workspace.listParentMeetings(this.actor(req), studentId);
  }

  @Post('parent/meetings/:id/book')
  @Roles(Role.PARENT)
  bookMeeting(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.workspace.bookMeeting(this.actor(req), id, body);
  }

  @Delete('parent/meetings/:id/bookings/:bookingId')
  @Roles(Role.PARENT)
  cancelMeetingBooking(@Req() req: any, @Param('id') id: string, @Param('bookingId') bookingId: string, @Query('studentId') studentId: string) {
    return this.workspace.cancelMeetingBooking(this.actor(req), id, bookingId, studentId);
  }

  @Get('teacher/community')
  @Roles(Role.TEACHER)
  getTeacherCommunity(@Req() req: any) {
    return this.workspace.listCommunity(this.actor(req));
  }

  @Post('teacher/community')
  @Roles(Role.TEACHER)
  createCommunityPost(@Req() req: any, @Body() body: any) {
    return this.workspace.createCommunityPost(this.actor(req), body);
  }

  @Delete('teacher/community/:id')
  @Roles(Role.TEACHER)
  deleteCommunityPost(@Req() req: any, @Param('id') id: string) {
    return this.workspace.deleteCommunityPost(this.actor(req), id);
  }

  @Get('student/community')
  @Roles(Role.STUDENT)
  getStudentCommunity(@Req() req: any) {
    return this.workspace.listCommunity(this.actor(req), this.actor(req).userId);
  }

  @Get('parent/community')
  @Roles(Role.PARENT)
  getParentCommunity(@Req() req: any, @Query('studentId') studentId: string) {
    return this.workspace.listCommunity(this.actor(req), studentId, true);
  }

  @Post('student/community/:id/comments')
  @Roles(Role.STUDENT)
  studentComment(@Req() req: any, @Param('id') id: string, @Body('body') body: string) {
    return this.workspace.commentOnCommunity(this.actor(req), id, body, this.actor(req).userId);
  }

  @Post('parent/community/:id/comments')
  @Roles(Role.PARENT)
  parentComment(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.workspace.commentOnCommunity(this.actor(req), id, body.body, body.studentId, true);
  }

  @Post('teacher/community/:id/comments')
  @Roles(Role.TEACHER)
  teacherComment(@Req() req: any, @Param('id') id: string, @Body('body') body: string) {
    return this.workspace.commentOnCommunity(this.actor(req), id, body);
  }

  @Get('teacher/certificates')
  @Roles(Role.TEACHER)
  getTeacherCertificates(@Req() req: any) {
    return this.workspace.listCertificates(this.actor(req));
  }

  @Post('teacher/certificates')
  @Roles(Role.TEACHER)
  issueCertificate(@Req() req: any, @Body() body: any) {
    return this.workspace.issueCertificate(this.actor(req), body);
  }

  @Get('student/certificates')
  @Roles(Role.STUDENT)
  getStudentCertificates(@Req() req: any) {
    return this.workspace.listCertificates(this.actor(req));
  }

  @Get('parent/certificates')
  @Roles(Role.PARENT)
  getParentCertificates(@Req() req: any, @Query('studentId') studentId: string) {
    return this.workspace.listCertificates(this.actor(req), studentId, true);
  }

  @Get('certificates/:id/pdf')
  @Roles(Role.TEACHER, Role.STUDENT, Role.PARENT, Role.ADMIN, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.SUPERVISOR)
  async downloadCertificate(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const certificate = await this.workspace.getCertificate(this.actor(req), id);
    const safeSerial = certificate.serial.replace(/[^a-zA-Z0-9-]/g, '');
    const pdf = await renderCertificatePdf(certificate);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeSerial}.pdf"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(pdf);
  }

  private actor(req: any): WorkspaceActor {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    if (!userId || !req.user?.schoolId) throw new ForbiddenException('الحساب غير مرتبط بمدرسة');
    return { userId, schoolId: req.user.schoolId, role: req.user.role };
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { QrAttendanceService } from './qr-attendance.service';
import { JwtAuthGuard } from '../../infrastructure/guards/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/role.enum';
import { CreateQrSessionDto, ScanQrCodeDto } from './dto/qr-attendance.dto';

type AuthenticatedRequest = { user: { id: string; userId: string } };

@Controller('attendance/qr')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QrAttendanceController {
  constructor(private readonly qrService: QrAttendanceService) {}

  @Get('sessions')
  @Roles(Role.TEACHER)
  async getMySessions(@Req() req: AuthenticatedRequest) {
    const teacherId = req.user.userId || req.user.id;
    const data = await this.qrService.getTeacherSessions(teacherId);
    return { success: true, data };
  }

  @Post('sessions')
  @Roles(Role.TEACHER)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  async createSession(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateQrSessionDto,
  ) {
    const teacherId = req.user.userId || req.user.id;
    const data = await this.qrService.createSession(
      teacherId,
      body.classId,
      body.durationMinutes,
    );
    return { success: true, message: 'QR Session created', data };
  }

  @Get('sessions/:id')
  @Roles(Role.TEACHER)
  async getSessionDetails(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const teacherId = req.user.userId || req.user.id;
    const data = await this.qrService.getSessionDetails(id, teacherId);
    return { success: true, data };
  }

  @Put('sessions/:id/deactivate')
  @Roles(Role.TEACHER)
  async deactivateSession(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const teacherId = req.user.userId || req.user.id;
    const data = await this.qrService.deactivateSession(id, teacherId);
    return { success: true, message: 'Session deactivated', data };
  }

  @Post('scan')
  @Roles(Role.STUDENT)
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  async scanQrCode(
    @Req() req: AuthenticatedRequest,
    @Body() body: ScanQrCodeDto,
  ) {
    const studentId = req.user.userId || req.user.id;
    const data = await this.qrService.scanQrCode(studentId, body.qrCode);
    return { success: true, ...data };
  }
}

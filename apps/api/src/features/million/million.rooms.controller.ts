import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { Role } from '../../auth/role.enum';
import millionService from './million.service';

@Controller('million/rooms')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.STUDENT)
export class MillionRoomsController {
  @Get()
  async listPublicRooms() {
    const rooms = await millionService.listPublicRooms();
    return { success: true, data: rooms };
  }
}

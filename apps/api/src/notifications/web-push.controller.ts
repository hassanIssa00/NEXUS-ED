import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import {
  WebPushService,
  PushSubscription,
  PushNotificationPayload,
} from './web-push.service';

@ApiTags('Web Push')
@Controller('push')
@ApiBearerAuth()
export class WebPushController {
  constructor(private readonly webPushService: WebPushService) {}

  @Get('public-key')
  @ApiOperation({ summary: 'Get VAPID public key' })
  getPublicKey(): { publicKey: string } {
    return {
      publicKey: this.webPushService.getPublicKey(),
    };
  }

  @Post('subscribe')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOperation({ summary: 'Subscribe to push notifications' })
  async subscribe(
    @Body() data: { subscription: PushSubscription },
    @Req() req: any,
  ) {
    await this.webPushService.saveSubscription(req.user.userId || req.user.sub || req.user.id, data.subscription);
    return { success: true, message: 'Subscribed successfully' };
  }

  @Post('unsubscribe')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @ApiOperation({ summary: 'Unsubscribe from push notifications' })
  async unsubscribe(@Body() data: { endpoint: string }, @Req() req: any) {
    await this.webPushService.unsubscribe(req.user.userId || req.user.sub || req.user.id, data.endpoint);
    return { success: true, message: 'Unsubscribed successfully' };
  }

  @Post('send')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Send push notification (admin/test)' })
  async sendPush(
    @Body() data: { userId: string; payload: PushNotificationPayload },
  ) {
    const sent = await this.webPushService.sendPushToUser(
      data.userId,
      data.payload,
    );
    return { success: sent };
  }
}

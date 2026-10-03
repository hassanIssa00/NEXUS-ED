import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { SmartNotificationService } from './smart-notification.service';
import { EmailService } from './email.service';

import { WebPushService } from './web-push.service';
import { WebPushController } from './web-push.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';

@Module({
  controllers: [NotificationController, WebPushController, WhatsAppController],
  providers: [
    SmartNotificationService,
    EmailService,
    WebPushService,
    WhatsAppService,
  ],
  exports: [
    SmartNotificationService,
    EmailService,
    WebPushService,
    WhatsAppService,
  ],
})
export class NotificationModule {}

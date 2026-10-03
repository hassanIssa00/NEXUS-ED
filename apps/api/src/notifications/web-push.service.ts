import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as webpush from 'web-push';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);

  constructor() {
    this.initializeWebPush();
  }

  private initializeWebPush() {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@nexus.masarplatform.org';

    if (!vapidPublicKey || !vapidPrivateKey) {
      this.logger.warn('VAPID keys not configured. Web Push disabled.');
      this.logger.warn('Generate keys with: npx web-push generate-vapid-keys');
      return;
    }

    webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
    this.logger.log('Web Push service initialized ✅');
  }

  /**
   * Save push subscription for a user
   */
  saveSubscription(
    userId: string,
    subscription: PushSubscription,
  ): Promise<void> {
    void userId;
    void subscription;
    return Promise.reject(new ServiceUnavailableException('Push subscription storage is not configured'));
  }

  /**
   * Send push notification to a user
   */
  sendPushToUser(
    userId: string,
    payload: PushNotificationPayload,
  ): Promise<boolean> {
    void userId;
    void payload;
    return Promise.resolve(false);
  }

  /**
   * Send to multiple users
   */
  async sendPushToMultipleUsers(
    userIds: string[],
    payload: PushNotificationPayload,
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      const success = await this.sendPushToUser(userId, payload);
      if (success) sent++;
      else failed++;
    }

    return { sent, failed };
  }

  /**
   * Unsubscribe a device
   */
  unsubscribe(userId: string, endpoint: string): Promise<void> {
    void userId;
    void endpoint;
    return Promise.reject(new ServiceUnavailableException('Push subscription storage is not configured'));
  }

  /**
   * Get VAPID public key (for client-side subscription)
   */
  getPublicKey(): string {
    const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
    if (!publicKey) throw new ServiceUnavailableException('Web Push is not configured');
    return publicKey;
  }
}

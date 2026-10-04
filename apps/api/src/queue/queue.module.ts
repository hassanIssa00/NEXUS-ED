import { DynamicModule, Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Queue names as constants for type safety
export const QUEUE_NAMES = {
  EMAIL: 'email',
  REPORTS: 'reports',
  NOTIFICATIONS: 'notifications',
  ANALYTICS: 'analytics',
} as const;

/**
 * QueueModule - Conditionally loads BullMQ only when Redis is available.
 * If REDIS_URL or REDIS_HOST is not set, the module boots as a no-op
 * so the server starts successfully without Redis in production.
 */
@Module({})
export class QueueModule {
  static async forRoot(): Promise<DynamicModule> {
    const logger = new Logger('QueueModule');
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;

    if (!redisUrl && (!redisHost || redisHost === 'localhost')) {
      logger.warn('⚠️  Redis not configured — Queue features disabled. Set REDIS_URL to enable.');
      return {
        module: QueueModule,
        imports: [],
        providers: [],
        exports: [],
      };
    }

    logger.log(`✅ Redis detected — initialising BullMQ queues...`);

    // Lazy-load BullMQ only when Redis is available
    const { BullModule } = await import('@nestjs/bullmq');
    const { EmailProcessor } = await import('./processors/email.processor');
    const { ReportProcessor } = await import('./processors/report.processor');
    const { NotificationModule } = await import('../notifications/notification.module');

    return {
      module: QueueModule,
      imports: [
        NotificationModule,
        BullModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => {
            const connection = redisUrl
              ? { url: redisUrl }
              : {
                  host: configService.get('REDIS_HOST', 'localhost'),
                  port: configService.get<number>('REDIS_PORT', 6379),
                  password: configService.get('REDIS_PASSWORD') || undefined,
                  maxRetriesPerRequest: 3,
                };
            return {
              connection,
              defaultJobOptions: {
                attempts: 5,
                backoff: { type: 'exponential', delay: 1000 },
                removeOnComplete: { age: 3600, count: 100 },
                removeOnFail: { age: 86400, count: 50 },
              },
            };
          },
          inject: [ConfigService],
        }),
        BullModule.registerQueue({ name: QUEUE_NAMES.EMAIL }),
        BullModule.registerQueue({ name: QUEUE_NAMES.REPORTS }),
        BullModule.registerQueue({ name: QUEUE_NAMES.NOTIFICATIONS }),
        BullModule.registerQueue({ name: QUEUE_NAMES.ANALYTICS }),
      ],
      providers: [EmailProcessor, ReportProcessor],
      exports: [BullModule],
    };
  }
}


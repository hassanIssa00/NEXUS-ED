import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { createHash } from 'node:crypto';
import { verify } from 'jsonwebtoken';
import { getJwtSecret } from '../config/jwt';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private readonly customLogger = new Logger(CustomThrottlerGuard.name);

  protected getTracker(req: Record<string, unknown>): Promise<string> {
    // APP_GUARD runs before route-level Passport guards, so req.user is usually
    // empty here. Verify the bearer token ourselves instead of trusting decoded
    // or client-supplied claims so authenticated requests share an account quota.
    const user = req['user'] as { id?: string; userId?: string; sub?: string } | undefined;
    const authenticatedId = user?.id || user?.userId || user?.sub;
    if (authenticatedId) return Promise.resolve(`user:${authenticatedId}`);

    const headers = req['headers'] as Record<string, string | string[] | undefined> | undefined;
    const authorization = headers?.authorization;
    const token = typeof authorization === 'string'
      ? authorization.match(/^Bearer\s+([^\s]+)$/i)?.[1]
      : undefined;
    if (token) {
      try {
        const payload = verify(token, getJwtSecret(), { algorithms: ['HS256'] });
        if (typeof payload !== 'string' && typeof payload.sub === 'string' && payload.sub) {
          return Promise.resolve(`user:${payload.sub}`);
        }
      } catch {
        // Invalid/expired tokens receive the unauthenticated IP quota.
      }
    }

    const socket = req['socket'] as { remoteAddress?: string } | undefined;
    const ip = (req['ip'] as string | undefined) || socket?.remoteAddress || 'unknown';
    return Promise.resolve(`ip:${ip}`);
  }

  protected shouldSkip(context: ExecutionContext): Promise<boolean> {
    // Skip throttling for health checks
    const request = context.switchToHttp().getRequest();
    const path = request.url || request.path;

    if (path?.includes('/health') || path?.includes('/metrics')) {
      return Promise.resolve(true);
    }

    return Promise.resolve(false);
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest();
    const tracker = await this.getTracker(request);
    const fingerprint = createHash('sha256').update(tracker).digest('hex').slice(0, 12);

    this.customLogger.warn(`Rate limit exceeded (tracker ${fingerprint})`);

    throw new ThrottlerException(
      'لقد تجاوزت الحد المسموح من الطلبات. الرجاء الانتظار قليلاً ثم المحاولة مرة أخرى.',
    );
  }
}

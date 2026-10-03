import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

// Role-based rate limit multipliers
const ROLE_MULTIPLIERS: Record<string, number> = {
  ADMIN: 5, // 5x the limit
  TEACHER: 3, // 3x the limit
  PARENT: 2, // 2x the limit
  STUDENT: 1, // Base limit
};

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private readonly customLogger = new Logger(CustomThrottlerGuard.name);

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    // Use user ID if authenticated, otherwise use IP
    const user = req['user'] as { id?: string };
    if (user?.id) {
      return `user:${user.id}`;
    }
    return Promise.resolve(`ip:${(req['ip'] as string) || 'unknown'}`);
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

    this.customLogger.warn(`Rate limit exceeded for ${tracker}`);

    throw new ThrottlerException(
      'لقد تجاوزت الحد المسموح من الطلبات. الرجاء الانتظار قليلاً ثم المحاولة مرة أخرى.',
    );
  }

  /**
   * Get adjusted limit based on user role
   */
  protected getAdjustedLimit(baseLimit: number, userRole?: string): number {
    if (!userRole) return baseLimit;
    const multiplier = ROLE_MULTIPLIERS[userRole] || 1;
    return Math.floor(baseLimit * multiplier);
  }
}

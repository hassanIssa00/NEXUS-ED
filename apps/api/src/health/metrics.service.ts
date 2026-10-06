import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../notifications/email.service';

interface Metrics {
  timestamp: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  database: {
    status: 'healthy' | 'unhealthy';
    latency?: number;
    activeConnections?: number;
  };
  performance: {
    requestsPerMinute?: number;
    averageResponseTime?: number;
  };
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private requestCount = 0;
  private responseTimes: number[] = [];
  private lastResetTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Record a request for metrics tracking
   */
  recordRequest(responseTimeMs: number): void {
    this.requestCount++;
    this.responseTimes.push(responseTimeMs);

    // Keep only last 1000 response times to avoid memory issues
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  /**
   * Get all metrics
   */
  async getMetrics(): Promise<Metrics> {
    const [dbHealth, dbStats] = await Promise.all([
      this.prisma.healthCheck(),
      this.prisma.getStats(),
    ]);

    const now = Date.now();
    const minutesPassed = (now - this.lastResetTime) / 60000;
    const requestsPerMinute =
      minutesPassed > 0 ? Math.round(this.requestCount / minutesPassed) : 0;

    const averageResponseTime =
      this.responseTimes.length > 0
        ? Math.round(
            this.responseTimes.reduce((a, b) => a + b, 0) /
              this.responseTimes.length,
          )
        : 0;

    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        status: dbHealth.status,
        latency: dbHealth.latency,
        activeConnections: dbStats.activeConnections,
      },
      performance: {
        requestsPerMinute,
        averageResponseTime,
      },
    };
  }

  /**
   * Reset metrics counters
   */
  resetMetrics(): void {
    this.requestCount = 0;
    this.responseTimes = [];
    this.lastResetTime = Date.now();
    this.logger.log('Metrics reset');
  }

  /**
   * Get quick health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
  }> {
    const [dbHealth, emailHealth] = await Promise.all([
      this.prisma.healthCheck(),
      this.emailService.isConfigured()
        ? this.emailService.isHealthy()
        : Promise.resolve(process.env.NODE_ENV !== 'production'),
    ]);

    const checks = {
      database: dbHealth.status === 'healthy',
      email: emailHealth,
      memory: process.memoryUsage().heapUsed < 500 * 1024 * 1024, // Less than 500MB
    };

    const coreHealthy = checks.database && checks.memory;
    const status = !coreHealthy
      ? 'unhealthy'
      : checks.email
        ? 'healthy'
        : 'degraded';

    return { status, checks };
  }
}

import { EmailService } from '../notifications/email.service';
import { PrismaService } from '../prisma.service';
import { MetricsService } from './metrics.service';

describe('MetricsService readiness', () => {
  const prisma = { healthCheck: jest.fn(), getStats: jest.fn() } as unknown as PrismaService;
  const isEmailConfigured = jest.fn();
  const isEmailHealthy = jest.fn();
  const emailService = {
    isConfigured: isEmailConfigured,
    isHealthy: isEmailHealthy,
  } as unknown as EmailService;
  let service: MetricsService;
  const previousNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    isEmailConfigured.mockReset();
    isEmailHealthy.mockReset();
    jest.spyOn(process, 'uptime').mockReturnValue(30);
    jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 10,
      heapTotal: 10,
      heapUsed: 10,
      external: 0,
      arrayBuffers: 0,
    });
    service = new MetricsService(prisma, emailService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  });

  it('reports SMTP as degraded without marking database readiness unhealthy', async () => {
    process.env.NODE_ENV = 'production';
    prisma.healthCheck = jest.fn().mockResolvedValue({ status: 'healthy', latency: 3 });
    isEmailConfigured.mockReturnValue(true);
    isEmailHealthy.mockResolvedValue(false);

    await expect(service.getHealthStatus()).resolves.toMatchObject({
      status: 'degraded',
      checks: { database: true, email: false, memory: true },
    });
  });

  it('allows local readiness when the optional SMTP integration is not configured', async () => {
    process.env.NODE_ENV = 'development';
    prisma.healthCheck = jest.fn().mockResolvedValue({ status: 'healthy', latency: 3 });
    isEmailConfigured.mockReturnValue(false);

    await expect(service.getHealthStatus()).resolves.toMatchObject({
      status: 'healthy',
      checks: { database: true, email: true, memory: true },
    });
    expect(isEmailHealthy).not.toHaveBeenCalled();
  });
});

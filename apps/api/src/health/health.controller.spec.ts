import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const metrics = {
    getHealthStatus: jest.fn(),
    getMetrics: jest.fn(),
  };
  let controller: HealthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new HealthController(metrics as never);
  });

  it('returns ready when core services are healthy even if optional email is degraded', async () => {
    metrics.getHealthStatus.mockResolvedValue({
      status: 'healthy',
      checks: { database: true, memory: true, email: false },
    });

    await expect(controller.ready()).resolves.toMatchObject({
      status: 'ready',
    });
  });

  it('does not become ready when the database is healthy but memory is over the limit', async () => {
    metrics.getHealthStatus.mockResolvedValue({
      status: 'unhealthy',
      checks: { database: true, memory: false, email: false },
    });

    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('uses HTTP 503 semantics when readiness checks fail', async () => {
    metrics.getHealthStatus.mockResolvedValue({
      status: 'unhealthy',
      checks: { database: false, email: true },
    });

    try {
      await controller.ready();
      throw new Error('Expected readiness to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as ServiceUnavailableException).getResponse()).toHaveProperty('checks.database', false);
    }
  });

  it('does not report the general health endpoint as healthy when the database is unavailable', async () => {
    metrics.getHealthStatus.mockResolvedValue({
      status: 'unhealthy',
      checks: { database: false, email: true },
    });

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});

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

  it('returns ready only when all readiness checks are healthy', async () => {
    metrics.getHealthStatus.mockResolvedValue({
      status: 'healthy',
      checks: { database: true },
    });

    await expect(controller.ready()).resolves.toMatchObject({
      status: 'ready',
      checks: { database: true },
    });
  });

  it('uses HTTP 503 semantics when readiness checks fail', async () => {
    metrics.getHealthStatus.mockResolvedValue({
      status: 'unhealthy',
      checks: { database: false },
    });

    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('does not report the general health endpoint as healthy when the database is unavailable', async () => {
    metrics.getHealthStatus.mockResolvedValue({
      status: 'unhealthy',
      checks: { database: false },
    });

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});

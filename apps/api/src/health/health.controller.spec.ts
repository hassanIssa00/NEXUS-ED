import { GUARDS_METADATA } from '@nestjs/common/constants';
import { HealthController } from './health.controller';
import { Role } from '../auth/role.enum';
import { RolesGuard } from '../auth/roles.guard';

describe('HealthController access', () => {
  it.each(['metrics', 'detailed'] as const)(
    '%s requires an authenticated administrator',
    (route) => {
      const handler = HealthController.prototype[route];
      const guards = Reflect.getMetadata(GUARDS_METADATA, handler);

      expect(guards).toHaveLength(2);
      expect(typeof guards[0].prototype.canActivate).toBe('function');
      expect(guards[1]).toBe(RolesGuard);
      expect(Reflect.getMetadata('roles', handler)).toEqual([Role.ADMIN]);
    },
  );

  it.each(['live', 'ready'] as const)(
    '%s remains available to infrastructure probes',
    (route) => {
      const handler = HealthController.prototype[route];

      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toBeUndefined();
    },
  );
});

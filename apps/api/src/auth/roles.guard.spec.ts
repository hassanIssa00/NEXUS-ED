import 'reflect-metadata';
import { RolesGuard } from './roles.guard';
import { Role } from './role.enum';
import { UploadController } from '../upload/upload.controller';

describe('profile avatar role authorization', () => {
  const handler = UploadController.prototype.setMyAvatar;
  const allowedRoles = Reflect.getMetadata('roles', handler) as Role[];

  const canActivateForRole = (role: string) => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(allowedRoles) };
    const guard = new RolesGuard(reflector as any);
    const context = {
      getHandler: () => handler,
      getClass: () => UploadController,
      switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    } as any;

    return guard.canActivate(context);
  };

  it('allows an authenticated teacher to change their own profile image', () => {
    expect(allowedRoles).toContain(Role.TEACHER);
    expect(canActivateForRole(Role.TEACHER)).toBe(true);
  });

  it('keeps the route unavailable to roles outside the platform role set', () => {
    expect(canActivateForRole('GUEST')).toBe(false);
  });
});

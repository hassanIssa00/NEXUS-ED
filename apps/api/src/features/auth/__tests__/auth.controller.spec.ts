import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { Role } from '../../../shared/enums/roles.enum';
import { AccountLockGuard } from '../guards/account-lock.guard';

describe('AuthController', () => {
    let controller: AuthController;
    let service: AuthService;

    const mockAuthService = {
        register: jest.fn(),
        loginWithGoogle: jest.fn(),
        requestPasswordReset: jest.fn(),
        confirmPasswordReset: jest.fn(),
        login: jest.fn(),
        refreshAccessToken: jest.fn(),
        revokeRefreshToken: jest.fn(),
    };

    const mockCacheManager = {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
    };

    const mockResponse = () => {
        const res: any = {};
        res.cookie = jest.fn().mockReturnValue(res);
        res.clearCookie = jest.fn().mockReturnValue(res);
        return res;
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
                {
                    provide: CACHE_MANAGER,
                    useValue: mockCacheManager,
                },
                {
                    provide: AccountLockGuard,
                    useValue: { canActivate: jest.fn().mockResolvedValue(true) },
                },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        service = module.get<AuthService>(AuthService);
        jest.clearAllMocks();
    });

    describe('register', () => {
        it('should call authService.register and return the result', async () => {
            const registerDto: RegisterDto = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test Name',
                role: Role.STUDENT,
            };

            const expectedResult = {
                id: '1',
                email: 'test@example.com',
                name: 'Test Name',
                role: Role.STUDENT,
            };
            mockAuthService.register.mockResolvedValue(expectedResult);

            const result = await controller.register(registerDto);

            expect(service.register).toHaveBeenCalledWith(registerDto);
            expect(result).toEqual(expectedResult);
        });
    });

    describe('login', () => {
        it('should call authService.login, set cookie, and return access token without refresh_token', async () => {
            const loginDto: LoginDto = {
                email: 'test@example.com',
                password: 'password123',
            };

            const expectedResult = {
                access_token: 'access123',
                refresh_token: 'refresh123',
                user: {
                    id: '1',
                    email: 'test@example.com',
                    role: Role.STUDENT,
                },
            };
            mockAuthService.login.mockResolvedValue(expectedResult);

            const res = mockResponse();
            const result = await controller.login(loginDto, res);

            expect(service.login).toHaveBeenCalledWith(loginDto);
            expect(mockCacheManager.del).toHaveBeenCalledWith('lockout:test@example.com');
            expect(res.cookie).toHaveBeenCalledWith(
                'refresh_token',
                'refresh123',
                expect.objectContaining({
                    httpOnly: true,
                    sameSite: 'lax',
                    path: '/',
                    secure: false,
                }),
            );
            expect(result).toEqual({
                access_token: 'access123',
                user: {
                    id: '1',
                    email: 'test@example.com',
                    role: Role.STUDENT,
                },
            });
        });
    });

    describe('Google sign-in and password reset', () => {
        it('sets the refresh cookie after Google identity exchange', async () => {
            mockAuthService.loginWithGoogle.mockResolvedValue({
                access_token: 'google-access',
                refresh_token: 'google-refresh',
                is_new_user: true,
                user: { id: '1', email: 'student@example.com', role: Role.STUDENT },
            });
            const res = mockResponse();

            const result = await controller.googleLogin(
                { idToken: 'google-id-token', role: Role.STUDENT } as any,
                res,
            );

            expect(service.loginWithGoogle).toHaveBeenCalledWith({
                idToken: 'google-id-token', role: Role.STUDENT,
            });
            expect(res.cookie).toHaveBeenCalledWith(
                'refresh_token',
                'google-refresh',
                expect.objectContaining({ httpOnly: true, path: '/' }),
            );
            expect(result).not.toHaveProperty('refresh_token');
            expect(result).toHaveProperty('is_new_user', true);
        });

        it('routes password reset requests to the auth service', async () => {
            const dto = { email: 'student@example.com' };
            mockAuthService.requestPasswordReset.mockResolvedValue({ message: 'generic response' });

            await expect(controller.requestPasswordReset(dto as any)).resolves.toEqual({ message: 'generic response' });
            expect(service.requestPasswordReset).toHaveBeenCalledWith(dto);
        });

        it('routes reset code confirmation to the auth service', async () => {
            const dto = { email: 'student@example.com', code: '123456', newPassword: 'new-password-123' };
            mockAuthService.confirmPasswordReset.mockResolvedValue({ message: 'updated' });

            await expect(controller.confirmPasswordReset(dto as any)).resolves.toEqual({ message: 'updated' });
            expect(service.confirmPasswordReset).toHaveBeenCalledWith(dto);
        });
    });

    describe('refresh', () => {
        it('should rotate refresh token and return only the access token', async () => {
            const req = { cookies: { refresh_token: 'my-refresh-token' } } as any;
            const res = mockResponse();
            const expectedResult = {
                access_token: 'new-access-token',
                refresh_token: 'next-refresh-token',
            };

            mockAuthService.refreshAccessToken.mockResolvedValue(expectedResult);

            const result = await controller.refresh(req, res);

            expect(service.refreshAccessToken).toHaveBeenCalledWith('my-refresh-token');
            expect(res.cookie).toHaveBeenCalledWith(
                'refresh_token',
                'next-refresh-token',
                expect.objectContaining({
                    httpOnly: true,
                    sameSite: 'lax',
                    path: '/',
                    secure: false,
                }),
            );
            expect(result).toEqual({ access_token: 'new-access-token' });
        });

        it('should throw UnauthorizedException if refresh token is missing in cookies', async () => {
            const req = { cookies: {} } as any;
            const res = mockResponse();

            await expect(controller.refresh(req, res)).rejects.toThrow('Refresh token not found');
        });
    });

    describe('logout', () => {
        it('should revoke the current refresh token, clear the cookie, and return success message', async () => {
            const req = { cookies: { refresh_token: 'refresh123' } } as any;
            const res = mockResponse();
            const result = await controller.logout(req, res);

            expect(service.revokeRefreshToken).toHaveBeenCalledWith('refresh123');
            expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', {
                path: '/',
                secure: false,
                sameSite: 'lax',
            });
            expect(result).toEqual({ message: 'Logged out successfully' });
        });
    });

    describe('getProfile', () => {
        it('should return the user object from request', () => {
            const req = {
                user: {
                    id: '1',
                    email: 'test@example.com',
                    role: Role.STUDENT,
                },
            };

            const result = controller.getProfile(req as any);

            expect(result).toEqual(req.user);
        });
    });
});

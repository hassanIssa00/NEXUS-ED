import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { AuthService } from '../services/auth.service';
import { PrismaService } from '../../../core/database/prisma.service';

jest.mock('bcrypt');

describe('AuthService', () => {
    let service: AuthService;

    const mockPrismaService = {
        school: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        refreshToken: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
    };

    const mockJwtService = {
        signAsync: jest.fn(),
        verifyAsync: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn(),
        getOrThrow: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: JwtService,
                    useValue: mockJwtService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);

        jest.clearAllMocks();
        mockConfigService.get.mockReturnValue(undefined);
        mockConfigService.getOrThrow.mockImplementation((key: string) => {
            if (key === 'JWT_SECRET') {
                return 'jwt-secret';
            }
            throw new Error(`Missing config: ${key}`);
        });
    });

    describe('register', () => {
        const registerDto: any = {
            email: 'test@test.com',
            password: 'password123',
            name: 'Test User',
            role: 'STUDENT',
        };

        it('should create a new user successfully', async () => {
            mockPrismaService.school.findMany.mockResolvedValue([{ id: 'school-1' }]);
            mockPrismaService.user.findUnique.mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
            mockPrismaService.user.create.mockResolvedValue({
                id: '1',
                email: registerDto.email,
                name: registerDto.name,
                role: registerDto.role,
                password: 'hashedPassword',
                schoolId: 'school-1',
            });

            const result = await service.register(registerDto);

            expect(result).toHaveProperty('id', '1');
            expect(result).not.toHaveProperty('password');
            expect(mockPrismaService.user.create).toHaveBeenCalled();
        });

        it('should throw ConflictException if user exists', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({ id: '1' });

            await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
        });
    });

    describe('login', () => {
        const loginDto = { email: 'test@test.com', password: 'password123' };
        const user = {
            id: '1',
            email: 'test@test.com',
            password: 'hashedPassword',
            role: 'STUDENT',
            name: 'Test User',
            schoolId: 'school-1',
            isActive: true,
        };

        it('should return tokens on successful login and persist the refresh token', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            mockJwtService.signAsync
                .mockResolvedValueOnce('access-token')
                .mockResolvedValueOnce('refresh-token');
            mockPrismaService.refreshToken.create.mockResolvedValue({});

            const result = await service.login(loginDto);

            expect(result.access_token).toEqual('access-token');
            expect(result.refresh_token).toEqual('refresh-token');
            expect(result.user.id).toEqual(user.id);
            expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        userId: user.id,
                    }),
                }),
            );
        });

        it('should throw UnauthorizedException on invalid email', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException on invalid password', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('refreshAccessToken', () => {
        it('should rotate the refresh token and return new tokens', async () => {
            mockJwtService.verifyAsync.mockResolvedValue({ sub: '1', type: 'refresh' });
            mockPrismaService.refreshToken.findUnique.mockResolvedValue({
                tokenHash: createHash('sha256').update('valid-token').digest('hex'),
                userId: '1',
                revokedAt: null,
                expiresAt: new Date(Date.now() + 60_000),
            });
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: '1',
                email: 'test@test.com',
                role: 'STUDENT',
                name: 'Test User',
                schoolId: 'school-1',
                isActive: true,
            });
            mockPrismaService.refreshToken.update.mockResolvedValue({});
            mockPrismaService.refreshToken.create.mockResolvedValue({});
            mockJwtService.signAsync
                .mockResolvedValueOnce('new-access-token')
                .mockResolvedValueOnce('new-refresh-token');

            const result = await service.refreshAccessToken('valid-token');

            expect(result).toEqual({
                access_token: 'new-access-token',
                refresh_token: 'new-refresh-token',
            });
            expect(mockPrismaService.refreshToken.update).toHaveBeenCalled();
            expect(mockPrismaService.refreshToken.create).toHaveBeenCalled();
        });

        it('should throw UnauthorizedException if token is invalid or expired', async () => {
            mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

            await expect(service.refreshAccessToken('invalid-token')).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('revokeRefreshToken', () => {
        it('should revoke a stored refresh token when present', async () => {
            mockPrismaService.refreshToken.findUnique.mockResolvedValue({
                tokenHash: 'stored-hash',
                revokedAt: null,
            });
            mockPrismaService.refreshToken.update.mockResolvedValue({});

            await service.revokeRefreshToken('refresh-token');

            expect(mockPrismaService.refreshToken.update).toHaveBeenCalled();
        });
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash, createHmac } from 'crypto';
import { AuthService } from '../services/auth.service';
import { FirebaseIdentityService } from '../services/firebase-identity.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { EmailService } from '../../../notifications/email.service';
import { UploadService } from '../../../upload/upload.service';

jest.mock('bcrypt');

describe('AuthService', () => {
    let service: AuthService;

    const mockPrismaService = {
        school: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
        class: {
            findFirst: jest.fn(),
        },
        registrationArchive: {
            upsert: jest.fn(),
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
        authIdentity: {
            findUnique: jest.fn(),
        },
        passwordResetCode: {
            count: jest.fn(),
            updateMany: jest.fn(),
            deleteMany: jest.fn(),
            create: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
        },
        $transaction: jest.fn(),
    };

    const mockTransaction = {
        authIdentity: { create: jest.fn() },
        user: { create: jest.fn(), update: jest.fn() },
        passwordResetCode: { updateMany: jest.fn() },
        refreshToken: { updateMany: jest.fn() },
    };

    const mockJwtService = {
        signAsync: jest.fn(),
        verifyAsync: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn(),
        getOrThrow: jest.fn(),
    };

    const mockEmailService = { isConfigured: jest.fn(), sendEmail: jest.fn() };
    const mockFirebaseIdentityService = { verifyAndReadProfile: jest.fn() };
    const mockUploadService = {
        uploadTeacherRegistrationAvatar: jest.fn(),
        deleteFromSupabase: jest.fn(),
        getSignedUrlsForReferences: jest.fn(),
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
                { provide: EmailService, useValue: mockEmailService },
                { provide: FirebaseIdentityService, useValue: mockFirebaseIdentityService },
                { provide: UploadService, useValue: mockUploadService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);

        jest.clearAllMocks();
        mockConfigService.get.mockReturnValue(undefined);
        mockEmailService.isConfigured.mockReturnValue(true);
        mockPrismaService.$transaction.mockImplementation((operation: any) =>
            typeof operation === 'function' ? operation(mockTransaction) : Promise.all(operation),
        );
        mockConfigService.getOrThrow.mockImplementation((key: string) => {
            if (key === 'JWT_SECRET') {
                return 'jwt-secret';
            }
            throw new Error(`Missing config: ${key}`);
        });
    });

    describe('getSessionProfile', () => {
        const baseUser = {
            id: 'user-1',
            email: 'student@example.com',
            role: 'STUDENT',
            name: 'Student',
            phone: null,
            avatar: null,
            schoolId: 'school-1',
            emailVerified: true,
            authIdentities: [{ providerSubject: 'firebase-student-1' }],
            studentProfile: null,
            placementAssessmentAttempts: [],
            children: [],
        };

        it('requires a student profile before placement assessment', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(baseUser);

            const profile = await service.getSessionProfile('user-1');

            expect(profile).toMatchObject({
                id: 'firebase-student-1',
                onboardingComplete: false,
                onboardingStep: 'student-profile',
            });
            expect(profile).not.toHaveProperty('gradeLevel');
        });

        it('requires the current grade assessment before student dashboard access', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                ...baseUser,
                avatar: 'https://cdn.example.test/student.webp',
                studentProfile: { gradeLevel: 8, nationalId: '1234567890' },
            });

            const profile = await service.getSessionProfile('user-1');

            expect(profile).toMatchObject({
                gradeLevel: 8,
                onboardingComplete: false,
                onboardingStep: 'placement-assessment',
            });
        });

        it('keeps students in profile setup until identity number and photo are saved', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                ...baseUser,
                studentProfile: { gradeLevel: 8, nationalId: null },
            });

            const profile = await service.getSessionProfile('user-1');

            expect(profile).toMatchObject({
                gradeLevel: 8,
                onboardingComplete: false,
                onboardingStep: 'student-profile',
            });
        });

        it('sends a parent with a linked child to that child survey', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                ...baseUser,
                role: 'PARENT',
                children: [{ student: { id: 'student-uuid', childSurveys: [] } }],
            });

            const profile = await service.getSessionProfile('parent-1');

            expect(profile).toMatchObject({
                onboardingComplete: false,
                onboardingStep: 'parent-survey',
                onboardingStudentId: 'student-uuid',
            });
        });

        it('completes onboarding after a survey is stored for each linked child', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                ...baseUser,
                role: 'PARENT',
                children: [{ student: { id: 'student-uuid', childSurveys: [{ id: 'survey-1' }] } }],
            });

            const profile = await service.getSessionProfile('parent-1');

            expect(profile).toMatchObject({ onboardingComplete: true, onboardingStep: 'complete' });
        });
    });

    describe('register', () => {
        const registerDto: any = {
            email: 'test@test.com',
            password: 'password123',
            name: 'Test User',
            role: 'STUDENT',
        };

        it('requires verified Firebase confirmation before creating public accounts', async () => {
            await expect(service.register(registerDto)).rejects.toThrow(ForbiddenException);
            expect(mockPrismaService.user.create).not.toHaveBeenCalled();
        });

        it('never allows the public registration endpoint to assign staff roles', async () => {
            await expect(service.register({ ...registerDto, role: 'ADMIN' })).rejects.toThrow(ForbiddenException);
            expect(mockPrismaService.user.create).not.toHaveBeenCalled();
        });
    });

    describe('teacher registration archive', () => {
        const originalPublicSchoolId = process.env.PUBLIC_SCHOOL_ID;

        beforeEach(() => {
            process.env.PUBLIC_SCHOOL_ID = 'school-1';
            mockConfigService.get.mockImplementation((key: string) => {
                if (key === 'TEACHER_REGISTRATION_CODE') return 'test-teacher-code';
                if (key === 'FIREBASE_STORAGE_BUCKET') return 'nexus-test.appspot.com';
                return undefined;
            });
            mockPrismaService.school.findUnique.mockResolvedValue({ id: 'school-1', isActive: true });
            mockPrismaService.class.findFirst.mockResolvedValue({ id: 'class-1' });
            mockPrismaService.registrationArchive.upsert.mockResolvedValue({ id: 'archive-1' });
        });

        afterAll(() => {
            if (originalPublicSchoolId === undefined) delete process.env.PUBLIC_SCHOOL_ID;
            else process.env.PUBLIC_SCHOOL_ID = originalPublicSchoolId;
        });

        it('checks the configured code without returning it', () => {
            expect(service.verifyTeacherRegistrationCode('test-teacher-code')).toEqual({ valid: true });
            expect(service.verifyTeacherRegistrationCode('wrong-code')).toEqual({ valid: false });
        });

        it('fails closed if the teacher registration code is not configured', () => {
            mockConfigService.get.mockReturnValue(undefined);
            expect(() => service.verifyTeacherRegistrationCode('anything')).toThrow(ServiceUnavailableException);
        });

        it('rejects an invalid teacher code before creating an archive record', async () => {
            mockFirebaseIdentityService.verifyAndReadProfile.mockResolvedValue({
                uid: 'firebase-teacher',
                email: 'teacher@example.com',
                emailVerified: false,
                fullName: 'Teacher Example',
                role: 'TEACHER',
                status: 'pending',
            });

            await expect(service.recordRegistrationAttempt({
                idToken: 'firebase-id-token',
                teacherCode: 'wrong-code',
                teacherProfile: { nationalId: '1234567890', specialization: 'ARABIC', yearsExperience: 0 },
            } as any)).rejects.toThrow(ForbiddenException);
            expect(mockPrismaService.registrationArchive.upsert).not.toHaveBeenCalled();
        });

        it('archives teacher onboarding details, but never the registration code', async () => {
            mockFirebaseIdentityService.verifyAndReadProfile.mockResolvedValue({
                uid: 'firebase-teacher',
                email: 'teacher@example.com',
                emailVerified: false,
                fullName: 'Teacher Example',
                role: 'TEACHER',
                status: 'pending',
            });

            await service.recordRegistrationAttempt({
                idToken: 'firebase-id-token',
                teacherCode: 'test-teacher-code',
                teacherProfile: {
                    nationalId: '1234567890',
                    specialization: 'ARABIC',
                    yearsExperience: 4,
                    homeroomClass: 'class-1',
                },
            } as any);

            expect(mockPrismaService.class.findFirst).toHaveBeenCalledWith({
                where: { id: 'class-1', schoolId: 'school-1' },
                select: { id: true },
            });
            expect(mockPrismaService.registrationArchive.upsert).toHaveBeenCalledWith(expect.objectContaining({
                where: { firebaseUid: 'firebase-teacher' },
                create: expect.objectContaining({
                    firebaseUid: 'firebase-teacher',
                    nationalId: '1234567890',
                    specialization: 'ARABIC',
                    yearsExperience: 4,
                    homeroomClassId: 'class-1',
                }),
                update: expect.objectContaining({
                    nationalId: '1234567890',
                    specialization: 'ARABIC',
                    yearsExperience: 4,
                    homeroomClassId: 'class-1',
                }),
            }));
            const serialized = JSON.stringify(mockPrismaService.registrationArchive.upsert.mock.calls[0][0]);
            expect(serialized).not.toContain('test-teacher-code');
            expect(mockPrismaService.registrationArchive.upsert.mock.calls[0][0].create).not.toHaveProperty('avatarUrl');
        });

        it('does not trust a client supplied teacher avatar URL in registration metadata', async () => {
            mockFirebaseIdentityService.verifyAndReadProfile.mockResolvedValue({
                uid: 'firebase-teacher',
                email: 'teacher@example.com',
                emailVerified: false,
                fullName: 'Teacher Example',
                role: 'TEACHER',
                status: 'pending',
            });

            await service.recordRegistrationAttempt({
                idToken: 'firebase-id-token',
                teacherCode: 'test-teacher-code',
                teacherProfile: {
                    nationalId: '1234567890',
                    specialization: 'ARABIC',
                    avatarUrl: 'https://attacker.example/teacher.jpg',
                },
            } as any);
            expect(mockPrismaService.registrationArchive.upsert).toHaveBeenCalled();
            expect(mockPrismaService.registrationArchive.upsert.mock.calls[0][0].create).not.toHaveProperty('avatarUrl');
        });

        it('allows teacher registration without optional experience', async () => {
            mockFirebaseIdentityService.verifyAndReadProfile.mockResolvedValue({
                uid: 'firebase-teacher',
                email: 'teacher@example.com',
                emailVerified: false,
                fullName: 'Teacher Example',
                role: 'TEACHER',
                status: 'pending',
            });

            await service.recordRegistrationAttempt({
                idToken: 'firebase-id-token',
                teacherCode: 'test-teacher-code',
                teacherProfile: { nationalId: '2234567890', specialization: 'MATHEMATICS' },
            } as any);

            expect(mockPrismaService.registrationArchive.upsert).toHaveBeenCalledWith(expect.objectContaining({
                create: expect.objectContaining({
                    nationalId: '2234567890',
                    specialization: 'MATHEMATICS',
                }),
            }));
            const create = mockPrismaService.registrationArchive.upsert.mock.calls[0][0].create;
            expect(create).not.toHaveProperty('yearsExperience');
            expect(create).not.toHaveProperty('avatarUrl');
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
            emailVerified: true,
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
            expect(mockJwtService.signAsync.mock.calls[1][0]).toEqual(
                expect.objectContaining({
                    sub: user.id,
                    type: 'refresh',
                    jti: expect.stringMatching(/^[a-f0-9]{32}$/),
                }),
            );
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

        it('requires verification before allowing password login for public accounts', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({ ...user, emailVerified: false });

            await expect(service.login(loginDto)).rejects.toThrow('Verify your email before signing in');
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException on invalid password', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(user);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('loginWithFirebase', () => {
        it('does not provision or create a session for an unverified student', async () => {
            mockFirebaseIdentityService.verifyAndReadProfile.mockResolvedValue({
                uid: 'firebase-student',
                email: 'student@example.com',
                emailVerified: false,
                fullName: 'Student Example',
                role: 'STUDENT',
                status: 'active',
            });
            await expect(service.loginWithFirebase('firebase-id-token', true))
                .rejects.toThrow('A verified Firebase account is required');

            expect(mockFirebaseIdentityService.verifyAndReadProfile).toHaveBeenCalledWith(
                'firebase-id-token',
                { allowUnverified: true },
            );
            expect(mockTransaction.user.create).not.toHaveBeenCalled();
            expect(mockPrismaService.refreshToken.create).not.toHaveBeenCalled();
        });

        it('does not provision a staff account from public self-registration', async () => {
            mockFirebaseIdentityService.verifyAndReadProfile.mockResolvedValue({
                uid: 'firebase-teacher',
                email: 'teacher@example.com',
                fullName: 'Teacher Example',
                role: 'TEACHER',
                status: 'active',
            });
            mockPrismaService.authIdentity.findUnique.mockResolvedValue(null);
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            await expect(service.loginWithFirebase('firebase-id-token')).rejects.toThrow(UnauthorizedException);
            expect(mockPrismaService.user.create).not.toHaveBeenCalled();
            expect(mockTransaction.user.create).not.toHaveBeenCalled();
        });

        it('does not link an unverified identity to a pre-existing account by email', async () => {
            mockFirebaseIdentityService.verifyAndReadProfile.mockResolvedValue({
                uid: 'firebase-student',
                email: 'student@example.com',
                emailVerified: false,
                fullName: 'Student Example',
                role: 'STUDENT',
                status: 'active',
            });
            mockPrismaService.authIdentity.findUnique.mockResolvedValue(null);
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: 'existing-student',
                email: 'student@example.com',
                role: 'STUDENT',
                isActive: true,
                schoolId: 'school-1',
            });

            await expect(service.loginWithFirebase('firebase-id-token', true)).rejects.toThrow(
                'A verified Firebase account is required',
            );
            expect(mockTransaction.authIdentity.create).not.toHaveBeenCalled();
        });
    });

    describe('requestPasswordReset', () => {
        const student = {
            id: 'student-1', email: 'student@example.com', role: 'STUDENT', isActive: true,
        };

        it('returns the same response without sending mail for an unknown account', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            const result = await service.requestPasswordReset({ email: 'missing@example.com' });

            expect(result.message).toContain('إذا كان البريد مرتبطًا بحساب');
            expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
        });

        it('allows a provisioned teacher to receive the same single-use reset code', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: 'teacher-1', email: 'teacher@example.com', role: 'TEACHER', isActive: true,
                schoolId: 'school-1',
            });
            mockPrismaService.passwordResetCode.count.mockResolvedValue(0);
            mockPrismaService.passwordResetCode.create.mockResolvedValue({ id: 'teacher-reset-1' });
            mockPrismaService.passwordResetCode.updateMany.mockResolvedValue({ count: 1 });
            mockPrismaService.passwordResetCode.deleteMany.mockResolvedValue({ count: 0 });
            mockEmailService.sendEmail.mockResolvedValue(true);

            const result = await service.requestPasswordReset({ email: 'teacher@example.com' });

            expect(result.message).toContain('إذا كان البريد مرتبطًا بحساب');
            expect(mockEmailService.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'teacher@example.com' }));
        });

        it('fails closed before checking account existence when SMTP is not configured', async () => {
            mockEmailService.isConfigured.mockReturnValue(false);

            await expect(service.requestPasswordReset({ email: 'student@example.com' }))
                .rejects.toThrow(ServiceUnavailableException);
            expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
        });

        it('sends a hashed, single-use six-digit code for an eligible account', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(student);
            mockPrismaService.passwordResetCode.count.mockResolvedValue(0);
            mockPrismaService.passwordResetCode.create.mockResolvedValue({ id: 'reset-1' });
            mockPrismaService.passwordResetCode.updateMany.mockResolvedValue({ count: 1 });
            mockPrismaService.passwordResetCode.deleteMany.mockResolvedValue({ count: 0 });
            mockEmailService.sendEmail.mockResolvedValue(true);

            await service.requestPasswordReset({ email: student.email });

            const message = mockEmailService.sendEmail.mock.calls[0][0];
            const code = message.text.match(/\b\d{6}\b/)?.[0];
            expect(code).toMatch(/^\d{6}$/);
            expect(message.to).toBe(student.email);
            expect(mockPrismaService.passwordResetCode.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    userId: student.id,
                    codeHash: createHmac('sha256', 'jwt-secret').update(`${student.id}:${code}`).digest('hex'),
                }),
            });
        });

          it('invalidates a reset code and reports delivery failure when SMTP rejects the email', async () => {
              mockPrismaService.user.findUnique.mockResolvedValue(student);
              mockPrismaService.passwordResetCode.count.mockResolvedValue(0);
              mockPrismaService.passwordResetCode.create.mockResolvedValue({ id: 'reset-1' });
              mockPrismaService.passwordResetCode.updateMany.mockResolvedValue({ count: 1 });
              mockPrismaService.passwordResetCode.deleteMany.mockResolvedValue({ count: 0 });
              mockPrismaService.passwordResetCode.update.mockResolvedValue({});
              mockEmailService.sendEmail.mockResolvedValue(false);

              await expect(service.requestPasswordReset({ email: student.email }))
                  .rejects.toThrow(ServiceUnavailableException);
              expect(mockPrismaService.passwordResetCode.update).toHaveBeenCalledWith({
                  where: { id: 'reset-1' },
                  data: { consumedAt: expect.any(Date) },
              });
          });
    });

    describe('confirmPasswordReset', () => {
        it('rejects an incorrect code and increments the attempt counter', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: 'student-1', email: 'student@example.com', role: 'STUDENT', isActive: true,
            });
            mockPrismaService.passwordResetCode.findFirst.mockResolvedValue({
                id: 'reset-1',
                codeHash: createHmac('sha256', 'jwt-secret').update('student-1:123456').digest('hex'),
            });

            await expect(service.confirmPasswordReset({
                email: 'student@example.com', code: '654321', newPassword: 'a-strong-password',
            })).rejects.toThrow(BadRequestException);
            expect(mockPrismaService.passwordResetCode.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ id: 'reset-1' }),
                data: { attempts: { increment: 1 } },
            }));
        });

        it('consumes the code, updates the password and revokes existing sessions atomically', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue({
                id: 'student-1', email: 'student@example.com', role: 'STUDENT', isActive: true, schoolId: 'school-1',
            });
            mockPrismaService.passwordResetCode.findFirst.mockResolvedValue({
                id: 'reset-1',
                codeHash: createHmac('sha256', 'jwt-secret').update('student-1:123456').digest('hex'),
            });
            (bcrypt.hash as jest.Mock).mockResolvedValue('new-password-hash');
            mockTransaction.passwordResetCode.updateMany.mockResolvedValue({ count: 1 });
            mockTransaction.user.update.mockResolvedValue({});
            mockTransaction.refreshToken.updateMany.mockResolvedValue({ count: 2 });

            await service.confirmPasswordReset({
                email: 'student@example.com', code: '123456', newPassword: 'a-strong-password',
            });

            expect(mockPrismaService.$transaction).toHaveBeenCalled();
            expect(mockTransaction.user.update).toHaveBeenCalledWith({
                where: { id: 'student-1' },
                data: { password: 'new-password-hash', emailVerified: true },
            });
            expect(mockTransaction.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { userId: 'student-1', revokedAt: null },
            }));
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
                emailVerified: true,
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

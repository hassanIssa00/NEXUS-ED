import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
    ForbiddenException,
    InternalServerErrorException,
    ServiceUnavailableException,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { EmailService } from '../../../notifications/email.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { GoogleLoginDto } from '../dto/google-login.dto';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { ConfirmPasswordResetDto } from '../dto/confirm-password-reset.dto';
import { Role } from '../../../shared/enums/roles.enum';
import { GoogleIdentityService } from './google-identity.service';
import { FirebaseIdentityService } from './firebase-identity.service';
import { getJwtRefreshSecret } from '../../../config/jwt';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_RESET_MAX_REQUESTS = 3;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_RESPONSE = 'لو البريد مرتبط بحساب طالب أو ولي أمر، هيوصلك رمز إعادة التعيين.';
const INVALID_RESET_CODE = 'رمز التحقق غير صالح أو انتهت صلاحيته.';

function isPublicAccountRole(role: string): boolean {
    return role === 'STUDENT' || role === 'PARENT';
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private emailService: EmailService,
        private googleIdentityService: GoogleIdentityService,
        private firebaseIdentityService: FirebaseIdentityService,
    ) { }

    private async createAuditLog(data: {
        schoolId?: string;
        userId?: string;
        action: string;
        entityType: string;
        entityId?: string;
        metadata?: Prisma.InputJsonValue;
    }) {
        if (!('auditLog' in this.prisma) || !this.prisma.auditLog) {
            return;
        }

        await this.prisma.auditLog.create({
            data: {
                schoolId: data.schoolId ?? undefined,
                userId: data.userId,
                action: data.action,
                entityType: data.entityType,
                entityId: data.entityId,
                metadata: data.metadata,
            },
        });
    }

    private async resolvePublicSchoolId(): Promise<string> {
        const configuredId = process.env.PUBLIC_SCHOOL_ID?.trim();
        const configuredSlug = process.env.PUBLIC_SCHOOL_SLUG?.trim();

        if (configuredId) {
            const school = await this.prisma.school.findUnique({
                where: { id: configuredId },
                select: { id: true, isActive: true },
            });
            if (!school?.isActive) throw new ServiceUnavailableException('Public registration is not configured for an active school');
            return school.id;
        }

        if (configuredSlug) {
            const school = await this.prisma.school.findUnique({
                where: { slug: configuredSlug },
                select: { id: true, isActive: true },
            });
            if (!school?.isActive) throw new ServiceUnavailableException('Public registration is not configured for an active school');
            return school.id;
        }

        const activeSchools = await this.prisma.school.findMany({
            where: { isActive: true },
            select: { id: true },
            take: 2,
        });
        if (activeSchools.length !== 1) {
            throw new ServiceUnavailableException('Configure PUBLIC_SCHOOL_ID or PUBLIC_SCHOOL_SLUG before enabling public registration');
        }
        return activeSchools[0].id;
    }

    private buildAuthPayload(user: {
        id: string;
        email: string;
        role: string;
        name: string;
        schoolId: string;
    }) {
        return {
            sub: user.id,
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name ?? user.email,
            schoolId: user.schoolId,
        };
    }

    private buildSafeUser(user: {
        id: string;
        email: string;
        role: string;
        name: string;
        schoolId: string;
        phone?: string;
    }) {
        return {
            id: user.id,
            userId: user.id,
            email: user.email,
            role: user.role,
            name: user.name ?? user.email,
            schoolId: user.schoolId,
            phone: user.phone ?? null,
        };
    }

    async register(registerDto: RegisterDto) {
        if (registerDto.role !== Role.STUDENT && registerDto.role !== Role.PARENT) {
            throw new ForbiddenException('Staff accounts must be created by school administration');
        }

        const email = registerDto.email.trim().toLowerCase();
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new ConflictException('User already exists');
        }

        const hashedPassword = await bcrypt.hash(registerDto.password, 10);
        const schoolId = await this.resolvePublicSchoolId();

        const user = await this.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: registerDto.role,
                name: registerDto.name?.trim() || email.split('@')[0],
                phone: registerDto.phone,
                schoolId,
            },
        });

        await this.createAuditLog({
            schoolId,
            userId: user.id,
            action: 'auth.register',
            entityType: 'user',
            entityId: user.id,
            metadata: {
                email: user.email,
                role: user.role,
            },
        });

        const { password, ...result } = user;
        return result;
    }

    async loginWithGoogle(dto: GoogleLoginDto) {
        if (!isPublicAccountRole(String(dto.role))) {
            throw new ForbiddenException('Google sign-in is only available to students and parents');
        }

        const identity = await this.googleIdentityService.verifyIdToken(dto.idToken);
        const provider = 'google';
        let user = await this.prisma.authIdentity.findUnique({
            where: { provider_providerSubject: { provider, providerSubject: identity.subject } },
            include: { user: true },
        }).then((record) => record?.user ?? null);
        let isNewUser = false;

        if (user) {
            if (!user.isActive || String(user.role) !== String(dto.role)) {
                throw new UnauthorizedException('Google account does not match this portal');
            }
        } else {
            const existingUser = await this.prisma.user.findUnique({ where: { email: identity.email } });
            if (existingUser) {
                if (
                    !existingUser.isActive
                    || String(existingUser.role) !== String(dto.role)
                    || !isPublicAccountRole(String(existingUser.role))
                ) {
                    throw new UnauthorizedException('Google account does not match this portal');
                }

                user = await this.prisma.$transaction(async (transaction) => {
                    await transaction.authIdentity.create({
                        data: { provider, providerSubject: identity.subject, userId: existingUser.id },
                    });
                    return transaction.user.update({
                        where: { id: existingUser.id },
                        data: {
                            emailVerified: true,
                            ...(identity.picture && !existingUser.avatar ? { avatar: identity.picture } : {}),
                        },
                    });
                });
            } else {
                const schoolId = await this.resolvePublicSchoolId();
                const password = await bcrypt.hash(randomBytes(48).toString('hex'), 12);
                user = await this.prisma.$transaction(async (transaction) => {
                    const createdUser = await transaction.user.create({
                        data: {
                            email: identity.email,
                            password,
                            role: dto.role,
                            name: identity.name,
                            avatar: identity.picture,
                            emailVerified: true,
                            schoolId,
                        },
                    });
                    await transaction.authIdentity.create({
                        data: { provider, providerSubject: identity.subject, userId: createdUser.id },
                    });
                    return createdUser;
                });
                isNewUser = true;
            }
        }

        const payload = this.buildAuthPayload({
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            schoolId: user.schoolId,
        });
        const accessToken = await this.jwtService.signAsync(payload);
        const refreshToken = await this.issueRefreshToken(user.id);

        await this.createAuditLog({
            schoolId: user.schoolId,
            userId: user.id,
            action: isNewUser ? 'auth.google_register' : 'auth.google_login',
            entityType: 'session',
            entityId: user.id,
            metadata: { role: user.role },
        });

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            is_new_user: isNewUser,
            user: this.buildSafeUser({
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name,
                schoolId: user.schoolId,
                phone: user.phone,
            }),
        };
    }

    async loginWithFirebase(idToken: string) {
        const identity = await this.firebaseIdentityService.verifyAndReadProfile(idToken);
        const provider = 'firebase';
        const linkedIdentity = await this.prisma.authIdentity.findUnique({
            where: { provider_providerSubject: { provider, providerSubject: identity.uid } },
            include: { user: true },
        });

        let user = linkedIdentity?.user ?? null;
        if (user && (
            !user.isActive
            || String(user.role) !== String(identity.role)
            || user.email !== identity.email
            || (!isPublicAccountRole(String(user.role)) && !user.schoolId)
        )) {
            throw new UnauthorizedException('Firebase account does not match its Nexus account');
        }

        if (!user) {
            const existingUser = await this.prisma.user.findUnique({ where: { email: identity.email } });
            if (existingUser) {
                if (
                    !existingUser.isActive
                    || String(existingUser.role) !== String(identity.role)
                    || (!isPublicAccountRole(String(existingUser.role)) && !existingUser.schoolId)
                ) {
                    throw new UnauthorizedException('Firebase account does not match its Nexus account');
                }

                const schoolId = existingUser.schoolId ?? await this.resolvePublicSchoolId();
                user = await this.prisma.$transaction(async (transaction) => {
                    await transaction.authIdentity.create({
                        data: { provider, providerSubject: identity.uid, userId: existingUser.id },
                    });
                    return transaction.user.update({
                        where: { id: existingUser.id },
                        data: {
                            emailVerified: true,
                            schoolId,
                            name: existingUser.name || identity.fullName,
                            phone: existingUser.phone || identity.phone,
                            avatar: existingUser.avatar || identity.avatarUrl,
                        },
                    });
                });
            } else {
                if (!isPublicAccountRole(String(identity.role))) {
                    throw new UnauthorizedException('Staff accounts must be provisioned by school administration');
                }
                const schoolId = await this.resolvePublicSchoolId();
                const password = await bcrypt.hash(randomBytes(48).toString('hex'), 12);
                user = await this.prisma.$transaction(async (transaction) => {
                    const createdUser = await transaction.user.create({
                        data: {
                            email: identity.email,
                            password,
                            role: identity.role,
                            name: identity.fullName,
                            phone: identity.phone,
                            avatar: identity.avatarUrl,
                            emailVerified: true,
                            schoolId,
                        },
                    });
                    await transaction.authIdentity.create({
                        data: { provider, providerSubject: identity.uid, userId: createdUser.id },
                    });
                    return createdUser;
                });
            }
        } else if (!user.schoolId) {
            const schoolId = await this.resolvePublicSchoolId();
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: { schoolId },
            });
        }

        if (identity.role === Role.STUDENT && identity.gradeLevel !== undefined) {
            await this.prisma.studentProfile.upsert({
                where: { userId: user.id },
                update: { gradeLevel: identity.gradeLevel },
                create: { userId: user.id, gradeLevel: identity.gradeLevel },
            });
        }

        const payload = this.buildAuthPayload({
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name || identity.fullName,
            schoolId: user.schoolId,
        });
        const accessToken = await this.jwtService.signAsync(payload);
        const refreshToken = await this.issueRefreshToken(user.id);

        await this.createAuditLog({
            schoolId: user.schoolId,
            userId: user.id,
            action: linkedIdentity ? 'auth.firebase_login' : 'auth.firebase_link',
            entityType: 'session',
            entityId: user.id,
            metadata: { role: user.role },
        });

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: {
                ...this.buildSafeUser({
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    name: user.name || identity.fullName,
                    schoolId: user.schoolId,
                    phone: user.phone,
                }),
                firebaseUid: identity.uid,
            },
        };
    }

    async requestPasswordReset(dto: RequestPasswordResetDto) {
        if (!this.emailService.isConfigured()) {
            throw new ServiceUnavailableException('Email delivery is not configured');
        }

        const email = dto.email.trim().toLowerCase();
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive || !isPublicAccountRole(String(user.role))) {
            return { message: PASSWORD_RESET_RESPONSE };
        }

        const now = new Date();
        const recentCount = await this.prisma.passwordResetCode.count({
            where: {
                userId: user.id,
                createdAt: { gt: new Date(now.getTime() - PASSWORD_RESET_REQUEST_WINDOW_MS) },
            },
        });
        if (recentCount >= PASSWORD_RESET_MAX_REQUESTS) {
            return { message: PASSWORD_RESET_RESPONSE };
        }

        await this.prisma.passwordResetCode.updateMany({
            where: { userId: user.id, consumedAt: null },
            data: { consumedAt: now },
        });
        await this.prisma.passwordResetCode.deleteMany({
            where: { userId: user.id, createdAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        });

        const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
        const codeHash = this.hashPasswordResetCode(user.id, code);
        const resetCode = await this.prisma.passwordResetCode.create({
            data: {
                userId: user.id,
                codeHash,
                expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
            },
        });

        const sent = await this.emailService.sendEmail({
            to: user.email,
            fromName: 'Nexus EDU',
            subject: 'رمز إعادة تعيين كلمة المرور - نكسس',
            text: `رمز إعادة تعيين كلمة المرور هو ${code}. صالح لمدة 10 دقائق. إذا لم تطلبه فتجاهل هذه الرسالة.`,
            html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8;color:#172033"><h2>إعادة تعيين كلمة المرور</h2><p>استخدم الرمز التالي لإعادة تعيين كلمة مرور حسابك في نكسس:</p><p style="font-size:30px;font-weight:700;letter-spacing:8px" dir="ltr">${code}</p><p>الرمز صالح لمدة 10 دقائق، ويُستخدم مرة واحدة.</p><p>إذا لم تطلب إعادة التعيين، تجاهل هذه الرسالة.</p></div>`,
        });

        if (!sent) {
            await this.prisma.passwordResetCode.update({
                where: { id: resetCode.id },
                data: { consumedAt: now },
            });
            throw new ServiceUnavailableException('Email delivery is temporarily unavailable');
        }

        return { message: PASSWORD_RESET_RESPONSE };
    }

    async confirmPasswordReset(dto: ConfirmPasswordResetDto) {
        const email = dto.email.trim().toLowerCase();
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive || !isPublicAccountRole(String(user.role))) {
            throw new BadRequestException(INVALID_RESET_CODE);
        }

        const now = new Date();
        const resetCode = await this.prisma.passwordResetCode.findFirst({
            where: {
                userId: user.id,
                consumedAt: null,
                expiresAt: { gt: now },
                attempts: { lt: PASSWORD_RESET_MAX_ATTEMPTS },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!resetCode) throw new BadRequestException(INVALID_RESET_CODE);

        const expectedHash = Buffer.from(resetCode.codeHash, 'hex');
        const actualHash = Buffer.from(this.hashPasswordResetCode(user.id, dto.code), 'hex');
        if (expectedHash.length !== actualHash.length || !timingSafeEqual(expectedHash, actualHash)) {
            await this.prisma.passwordResetCode.updateMany({
                where: { id: resetCode.id, attempts: { lt: PASSWORD_RESET_MAX_ATTEMPTS }, consumedAt: null },
                data: { attempts: { increment: 1 } },
            });
            throw new BadRequestException(INVALID_RESET_CODE);
        }

        const password = await bcrypt.hash(dto.newPassword, 12);
        await this.prisma.$transaction(async (transaction) => {
            const consumed = await transaction.passwordResetCode.updateMany({
                where: {
                    id: resetCode.id,
                    consumedAt: null,
                    expiresAt: { gt: now },
                    attempts: { lt: PASSWORD_RESET_MAX_ATTEMPTS },
                },
                data: { consumedAt: now },
            });
            if (consumed.count !== 1) throw new BadRequestException(INVALID_RESET_CODE);
            await transaction.user.update({
                where: { id: user.id },
                data: { password, emailVerified: true },
            });
            await transaction.refreshToken.updateMany({
                where: { userId: user.id, revokedAt: null },
                data: { revokedAt: now },
            });
        });

        await this.createAuditLog({
            schoolId: user.schoolId,
            userId: user.id,
            action: 'auth.password_reset_completed',
            entityType: 'user',
            entityId: user.id,
        });

        return { message: 'تم تغيير كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.' };
    }

    private hashPasswordResetCode(userId: string, code: string): string {
        const secret = this.configService.getOrThrow<string>('JWT_SECRET');
        return createHmac('sha256', secret).update(`${userId}:${code}`).digest('hex');
    }

    async login(loginDto: LoginDto) {
        const email = loginDto.email.trim().toLowerCase();
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.isActive) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(
            loginDto.password,
            user.password,
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const schoolId = user.schoolId;
        const payload = this.buildAuthPayload({
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            schoolId,
        });
        const accessToken = await this.jwtService.signAsync(payload);
        const refreshToken = await this.issueRefreshToken(user.id);

        await this.createAuditLog({
            schoolId,
            userId: user.id,
            action: 'auth.login',
            entityType: 'session',
            entityId: user.id,
            metadata: {
                email: user.email,
                role: user.role,
            },
        });

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user: this.buildSafeUser({
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name,
                schoolId,
                phone: user.phone,
            }),
        };
    }

    async changePassword(userId: string, dto: ChangePasswordDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, password: true, schoolId: true },
        });

        if (!user || !(await bcrypt.compare(dto.currentPassword, user.password))) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        if (await bcrypt.compare(dto.newPassword, user.password)) {
            throw new BadRequestException('Choose a password different from the current one');
        }

        const password = await bcrypt.hash(dto.newPassword, 10);
        const revokedAt = new Date();
        await this.prisma.$transaction([
            this.prisma.user.update({ where: { id: user.id }, data: { password } }),
            this.prisma.refreshToken.updateMany({
                where: { userId: user.id, revokedAt: null },
                data: { revokedAt },
            }),
        ]);

        await this.createAuditLog({
            schoolId: user.schoolId,
            userId: user.id,
            action: 'auth.password_changed',
            entityType: 'user',
            entityId: user.id,
        });

        return { message: 'Password changed. Sign in again on your other devices.' };
    }

    private getRefreshSecret(): string {
        return getJwtRefreshSecret();
    }

    private hashRefreshToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    private async issueRefreshToken(userId: string): Promise<string> {
        const payload = {
            sub: userId,
            type: 'refresh',
            jti: randomBytes(16).toString('hex'),
        };
        const refreshToken = await this.jwtService.signAsync(payload, {
            secret: this.getRefreshSecret(),
            expiresIn: REFRESH_TOKEN_TTL,
        });

        await this.prisma.refreshToken.create({
            data: {
                tokenHash: this.hashRefreshToken(refreshToken),
                userId,
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
            },
        });

        return refreshToken;
    }

    async revokeRefreshToken(refreshToken: string): Promise<void> {
        const tokenHash = this.hashRefreshToken(refreshToken);
        const existingToken = await this.prisma.refreshToken.findUnique({
            where: { tokenHash },
        });

        if (!existingToken || existingToken.revokedAt) {
            return;
        }

        await this.prisma.refreshToken.update({
            where: { tokenHash },
            data: { revokedAt: new Date() },
        });
    }

    async refreshAccessToken(refreshToken: string) {
        let stage = 'verify';
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.getRefreshSecret(),
            });

            stage = 'validate claims';
            if (payload.type !== 'refresh') {
                throw new UnauthorizedException('Invalid token type');
            }

            stage = 'find stored session';
            const tokenHash = this.hashRefreshToken(refreshToken);
            const storedToken = await this.prisma.refreshToken.findUnique({
                where: { tokenHash },
            });

            if (!storedToken || storedToken.revokedAt || storedToken.expiresAt <= new Date()) {
                throw new UnauthorizedException('Refresh token has been revoked');
            }

            stage = 'find active user';
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
                select: { id: true, email: true, role: true, name: true, schoolId: true, isActive: true },
            });

            if (!user?.isActive) {
                throw new UnauthorizedException('User not found');
            }

            stage = 'rotate stored session';
            await this.prisma.refreshToken.update({
                where: { tokenHash },
                data: { revokedAt: new Date() },
            });

            const newPayload = this.buildAuthPayload({
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name,
                schoolId: user.schoolId,
            });
            const accessToken = await this.jwtService.signAsync(newPayload);
            const nextRefreshToken = await this.issueRefreshToken(user.id);

            stage = 'write audit event';
            await this.createAuditLog({
                schoolId: user.schoolId,
                userId: user.id,
                action: 'auth.refresh',
                entityType: 'session',
                entityId: user.id,
                metadata: {
                    rotated: true,
                },
            });

            return {
                access_token: accessToken,
                refresh_token: nextRefreshToken,
            };
        } catch (error) {
            this.logger.warn(
                `Refresh token rejected during ${stage} (${error instanceof UnauthorizedException ? 'unauthorized' : error instanceof Error ? error.name : 'unknown error'})`,
            );
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async validateUser(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                name: true,
                schoolId: true,
                phone: true,
                avatar: true,
                isActive: true,
                authIdentities: {
                    where: { provider: 'firebase' },
                    select: { providerSubject: true },
                    take: 1,
                },
            },
        });

        if (!user?.isActive) {
            return null;
        }

        const { isActive, authIdentities, ...safeUser } = user;
        return {
            ...safeUser,
            userId: safeUser.id,
            firebaseUid: authIdentities[0]?.providerSubject ?? null,
        };
    }

    async getSessionProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                role: true,
                name: true,
                phone: true,
                avatar: true,
                schoolId: true,
                emailVerified: true,
                authIdentities: {
                    where: { provider: 'firebase' },
                    select: { providerSubject: true },
                    take: 1,
                },
                studentProfile: { select: { gradeLevel: true } },
                placementAssessmentAttempts: { select: { assessmentKey: true } },
                children: {
                    select: {
                        student: {
                            select: {
                                id: true,
                                childSurveys: {
                                    where: { parentId: userId },
                                    select: { id: true },
                                    take: 1,
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!user) throw new UnauthorizedException();

        let onboardingStep = 'complete';
        let onboardingStudentId = '';
        let gradeLevel = -1;
        if (String(user.role) === 'STUDENT') {
            gradeLevel = user.studentProfile?.gradeLevel ?? -1;
            if (gradeLevel < 0) {
                onboardingStep = 'student-profile';
            } else {
                const assessmentKey = this.placementAssessmentKey(gradeLevel);
                onboardingStep = assessmentKey && user.placementAssessmentAttempts.some(
                    (attempt) => attempt.assessmentKey === assessmentKey,
                ) ? 'complete' : 'placement-assessment';
            }
        } else if (String(user.role) === 'PARENT') {
            const linkedStudent = user.children.find((link) => link.student.childSurveys.length === 0);
            if (user.children.length === 0) {
                onboardingStep = 'link-student';
            } else if (linkedStudent) {
                onboardingStep = 'parent-survey';
                onboardingStudentId = linkedStudent.student.id;
            }
        }

        return {
            id: user.authIdentities[0]?.providerSubject ?? user.id,
            userId: user.id,
            firebaseUid: user.authIdentities[0]?.providerSubject ?? null,
            email: user.email,
            role: user.role,
            name: user.name ?? user.email,
            phone: user.phone,
            avatar: user.avatar,
            schoolId: user.schoolId,
            emailVerified: user.emailVerified,
            ...(gradeLevel >= 0 ? { gradeLevel } : {}),
            onboardingComplete: onboardingStep === 'complete',
            onboardingStep,
            ...(onboardingStudentId ? { onboardingStudentId } : {}),
        };
    }

    private placementAssessmentKey(gradeLevel: number): string | false {
        if (gradeLevel === 0) return 'kg';
        if (gradeLevel === 1) return 'general';
        if (gradeLevel >= 2 && gradeLevel <= 6) return `g${gradeLevel}`;
        if (gradeLevel >= 7 && gradeLevel <= 9) return 'm1';
        if (gradeLevel >= 10 && gradeLevel <= 12) return 's1';
        return false;
    }

    assertAuthConfiguration(): void {
        const jwtSecret = this.configService.get<string>('JWT_SECRET');
        if (!jwtSecret) {
            throw new InternalServerErrorException('JWT_SECRET is not configured');
        }
    }
}

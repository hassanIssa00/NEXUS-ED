import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
    InternalServerErrorException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    private async createAuditLog(data: {
        schoolId?: string | null;
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
        name: string | null;
        schoolId: string | null;
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
        name: string | null;
        schoolId: string | null;
        phone?: string | null;
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
        return (
            this.configService.get<string>('JWT_REFRESH_SECRET') ||
            this.configService.getOrThrow<string>('JWT_SECRET')
        );
    }

    private hashRefreshToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    private async issueRefreshToken(userId: string): Promise<string> {
        const payload = { sub: userId, type: 'refresh' };
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
        try {
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: this.getRefreshSecret(),
            });

            if (payload.type !== 'refresh') {
                throw new UnauthorizedException('Invalid token type');
            }

            const tokenHash = this.hashRefreshToken(refreshToken);
            const storedToken = await this.prisma.refreshToken.findUnique({
                where: { tokenHash },
            });

            if (!storedToken || storedToken.revokedAt || storedToken.expiresAt <= new Date()) {
                throw new UnauthorizedException('Refresh token has been revoked');
            }

            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
                select: { id: true, email: true, role: true, name: true, schoolId: true, isActive: true },
            });

            if (!user?.isActive) {
                throw new UnauthorizedException('User not found');
            }

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
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async validateUser(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true, name: true, schoolId: true, phone: true, isActive: true },
        });

        if (!user?.isActive) {
            return null;
        }

        const { isActive, ...safeUser } = user;
        return {
            ...safeUser,
            userId: safeUser.id,
        };
    }

    async assertAuthConfiguration(): Promise<void> {
        const jwtSecret = this.configService.get<string>('JWT_SECRET');
        if (!jwtSecret) {
            throw new InternalServerErrorException('JWT_SECRET is not configured');
        }
    }
}

import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { getJwtSecret } from '../../../config/jwt';

const ONBOARDING_ROUTES = new Set([
    'GET /auth/profile',
    'GET /users/me/student-profile',
    'PUT /users/me/student-profile',
    'POST /users/student-link-code',
    'POST /users/link-student',
    'POST /users/parent-survey',
    'GET /assessments/placement/current',
    'POST /assessments/placement/submit',
]);

export function isOnboardingRouteAllowed(method: string, requestPath: string): boolean {
    const pathname = requestPath.split('?')[0].replace(/^\/api(?=\/)/, '');
    return ONBOARDING_ROUTES.has(`${method.toUpperCase()} ${pathname}`);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private authService: AuthService,
        private configService: ConfigService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || getJwtSecret(),
            passReqToCallback: true,
        });
    }

    async validate(request: { method: string; path?: string; originalUrl?: string }, payload: any) {
        if (payload.onboardingOnly === true && !isOnboardingRouteAllowed(request.method, request.path || request.originalUrl || '')) {
            throw new ForbiddenException('Complete account setup and verify your email before accessing this feature');
        }
        const user = await this.authService.validateUser(payload.sub);
        if (!user) {
            throw new UnauthorizedException();
        }
        return payload.onboardingOnly === true ? { ...user, onboardingOnly: true } : user;
    }
}

import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { getJwtSecret } from '../../../config/jwt';

const ONBOARDING_ROUTES = new Set([
    'GET /auth/profile',
    'GET /users/me',
    'PATCH /users/me',
    'GET /users/me/student-profile',
    'PUT /users/me/student-profile',
    'PATCH /upload/me/avatar',
    'POST /users/student-link-code',
    'POST /users/link-student',
    'POST /users/parent-survey',
    'GET /assessments/placement/current',
    'POST /assessments/placement/submit',
    // Parent accounts can be authenticated with a school-issued student link code.
    // These read-only endpoints return only records linked to the signed-in parent.
    'GET /dashboard/parent',
]);

const PARENT_PORTAL_ROUTES = new Set([
    'GET /workspace/parent/meetings',
    'GET /workspace/parent/certificates',
    'GET /messages/conversations',
    'GET /messages/contacts',
    'POST /messages/start',
    'GET /notifications',
    'POST /notifications/read-all',
    'GET /assessments/placement/reports',
]);

function isParentPortalRouteAllowed(method: string, pathname: string): boolean {
    const normalizedMethod = method.toUpperCase();
    const routeKey = `${normalizedMethod} ${pathname}`;
    if (PARENT_PORTAL_ROUTES.has(routeKey)) return true;

    return (normalizedMethod === 'GET' && (
        /^\/analytics\/student\/[^/]+\/parent-report$/.test(pathname)
        || /^\/grades\/parent\/[^/]+$/.test(pathname)
        || /^\/workspace\/certificates\/[^/]+\/pdf$/.test(pathname)
        || /^\/messages\/[^/]+$/.test(pathname)
        || /^\/assessments\/placement\/reports\/[^/]+(?:\/pdf)?$/.test(pathname)
    )) || (normalizedMethod === 'POST' && /^\/messages\/[^/]+\/send$/.test(pathname))
        || (normalizedMethod === 'POST' && /^\/workspace\/parent\/meetings\/[^/]+\/book$/.test(pathname))
        || (normalizedMethod === 'DELETE' && /^\/workspace\/parent\/meetings\/[^/]+\/bookings\/[^/]+$/.test(pathname))
        || (normalizedMethod === 'POST' && /^\/notifications\/[^/]+\/read$/.test(pathname));
}

export function isOnboardingRouteAllowed(method: string, requestPath: string, role?: string): boolean {
    const pathname = requestPath.split('?')[0].replace(/^\/api(?=\/)/, '');
    const normalizedMethod = method.toUpperCase();
    if (ONBOARDING_ROUTES.has(`${normalizedMethod} ${pathname}`)) return true;

    // The schedule service independently verifies the parent/student relationship.
    if (normalizedMethod === 'GET' && /^\/schedule\/parent\/[^/]+$/.test(pathname)) return true;

    // Unverified parents may use their school-linked portal. Each allowed API
    // performs its own parent/student or conversation ownership check.
    return role === 'PARENT' && isParentPortalRouteAllowed(normalizedMethod, pathname);
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
        const user = await this.authService.validateUser(payload.sub, payload.onboardingOnly === true);
        if (!user) {
            throw new UnauthorizedException();
        }
        if (payload.onboardingOnly === true && !isOnboardingRouteAllowed(request.method, request.path || request.originalUrl || '', user.role)) {
            throw new ForbiddenException('Complete account setup and verify your email before accessing this feature');
        }
        return payload.onboardingOnly === true ? { ...user, onboardingOnly: true } : user;
    }
}

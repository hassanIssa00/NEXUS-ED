import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class AccountLockGuard implements CanActivate {
    private readonly MAX_ATTEMPTS = 5;

    constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const email = request.body?.email;

        if (!email) {
            return true;
        }

        const key = `lockout:${String(email).trim().toLowerCase()}`;
        const attempts = await this.cacheManager.get<number>(key) || 0;

        if (attempts >= this.MAX_ATTEMPTS) {
            throw new HttpException(
                'Account is temporarily locked due to too many failed login attempts. Please try again later.',
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        return true;
    }
}

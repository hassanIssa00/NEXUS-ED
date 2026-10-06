import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AccountLockGuard } from './guards/account-lock.guard';
import { getJwtSecret } from '../../config/jwt';
import { NotificationModule } from '../../notifications/notification.module';
import { GoogleIdentityService } from './services/google-identity.service';
import { FirebaseIdentityService } from './services/firebase-identity.service';

@Module({
    imports: [
        PassportModule,
        NotificationModule,
        JwtModule.registerAsync({
            useFactory: () => ({
                secret: getJwtSecret(),
                signOptions: { expiresIn: '15m' }, // Access token: 15 minutes
            }),
        }),
    ],
    providers: [AuthService, JwtStrategy, AccountLockGuard, GoogleIdentityService, FirebaseIdentityService],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule { }

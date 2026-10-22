import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';
import { winstonConfig } from './config/logger.config';
import { SanitizeInterceptor } from './infrastructure/interceptors/sanitize.interceptor';
import { PerformanceInterceptor } from './infrastructure/interceptors/performance.interceptor';
import { validateProductionConfiguration } from './config/jwt';
import { PrismaRateLimitStore, configureQuotaStorage } from './common/persistent-quota-storage';
import { PrismaService } from './prisma.service';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

async function bootstrap() {
  validateProductionConfiguration();

  // Create app with Winston logger
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: winstonConfig,
  });
  configureQuotaStorage(app.get(PrismaService));

  if (process.env.VERCEL === '1') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }

  const logger = new Logger('Bootstrap');
  const frontendOrigins = new Set(
    (process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3002,http://localhost:3000'))
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

  // Enable CORS for frontend
  app.enableCors({
    origin: (origin, callback) => callback(null, !origin || frontendOrigins.has(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
  app.use(cookieParser());
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", ...frontendOrigins],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    xssFilter: true,
  }));

  // Strict Auth rate limiting: 10 attempts per 15 min
  app.use('/api/auth/login', rateLimit({
    store: new PrismaRateLimitStore('http-auth-login'),
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'تجاوزت الحد المسموح من محاولات الدخول. حاول مجدداً بعد 15 دقيقة.' },
    skipSuccessfulRequests: true,
  }));

  app.use('/api/auth/register', rateLimit({
    store: new PrismaRateLimitStore('http-auth-register'),
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'محاولات تسجيل كثيرة. حاول مرة أخرى بعد ساعة.' },
  }));

  // General auth rate limit
  app.use('/api/auth/', rateLimit({
    store: new PrismaRateLimitStore('http-auth-general'),
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'طلبات كثيرة جداً. حاول مجدداً بعد قليل.' },
  }));


  // Legacy local uploads and queued reports are private data. Do not expose
  // the filesystem as an unauthenticated static route in production; cloud
  // uploads use short-lived signed URLs after the API checks file ownership.
  if (process.env.NODE_ENV !== 'production') {
    app.useStaticAssets(path.join(__dirname, '..', 'uploads'), {
      prefix: '/uploads/',
    });
  }

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable globally registered interceptors
  app.useGlobalInterceptors(
    new SanitizeInterceptor(),
    new PerformanceInterceptor()
  );

  // Add global prefix /api
  app.setGlobalPrefix('api');

  // Setup Swagger documentation
  if (
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_API_DOCS === 'true'
  ) {
    setupSwagger(app);
    logger.log('📚 Swagger documentation available at /api/docs');
  }

  const port = process.env.PORT ?? 4000;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application is running on: ${await app.getUrl()}`);
  logger.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch((err) => {
  new Logger('Bootstrap').error(err);
  process.exit(1);
});

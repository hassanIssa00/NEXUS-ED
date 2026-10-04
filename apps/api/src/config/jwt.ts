import { randomBytes } from 'crypto';

const MIN_PRODUCTION_SECRET_LENGTH = 32;
const KNOWN_PLACEHOLDER_PATTERNS = [
  /^your-secret/i,
  /^change-this/i,
  /^replace-me/i,
  /^placeholder/i,
  /^secret-key-change/i,
];
const developmentJwtSecret = randomBytes(32).toString('hex');

function requireProductionSecret(name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET') {
  const secret = process.env[name]?.trim();
  if (
    !secret ||
    Buffer.byteLength(secret, 'utf8') < MIN_PRODUCTION_SECRET_LENGTH ||
    KNOWN_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(secret))
  ) {
    throw new Error(`${name} must be a unique secret of at least 32 characters in production`);
  }
  return secret;
}

export function getJwtSecret(): string {
  const configuredSecret = process.env.JWT_SECRET?.trim();
  if (process.env.NODE_ENV === 'production') {
    return requireProductionSecret('JWT_SECRET');
  }
  if (configuredSecret) return configuredSecret;

  return developmentJwtSecret;
}

export function getJwtRefreshSecret(): string {
  if (process.env.NODE_ENV === 'production') {
    const refreshSecret = requireProductionSecret('JWT_REFRESH_SECRET');
    if (refreshSecret === getJwtSecret()) {
      throw new Error('JWT_REFRESH_SECRET must differ from JWT_SECRET in production');
    }
    return refreshSecret;
  }

  return process.env.JWT_REFRESH_SECRET?.trim() || getJwtSecret();
}

export function validateProductionConfiguration(): void {
  if (process.env.NODE_ENV !== 'production') return;

  getJwtSecret();
  getJwtRefreshSecret();

  for (const name of ['DATABASE_URL', 'DIRECT_URL'] as const) {
    const value = process.env[name]?.trim();
    if (!value || !/^postgres(?:ql)?:\/\//i.test(value)) {
      throw new Error(`${name} must be a PostgreSQL connection URL in production`);
    }
  }

  const origins = process.env.FRONTEND_URL?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? [];
  if (origins.length === 0 || origins.some((origin) => {
    try {
      return new URL(origin).protocol !== 'https:';
    } catch {
      return true;
    }
  })) {
    throw new Error('FRONTEND_URL must contain one or more HTTPS origins in production');
  }

  const requiredIntegrations = [
    'GOOGLE_CLIENT_ID',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM_EMAIL',
  ] as const;
  const missing = requiredIntegrations.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Required production integrations are not configured: ${missing.join(', ')}`);
  }

  const placeholderIntegrationValues = requiredIntegrations.filter((name) => {
    const value = process.env[name]?.trim() ?? '';
    return /^your[-_]/i.test(value) || /placeholder|example\.(?:com|invalid)/i.test(value);
  });
  if (placeholderIntegrationValues.length > 0) {
    throw new Error(`Replace placeholder production integration values: ${placeholderIntegrationValues.join(', ')}`);
  }

  if (!/^[0-9]+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i.test(process.env.GOOGLE_CLIENT_ID ?? '')) {
    throw new Error('GOOGLE_CLIENT_ID must be a valid Google OAuth web client ID in production');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.SMTP_FROM_EMAIL ?? '')) {
    throw new Error('SMTP_FROM_EMAIL must be a valid sender address in production');
  }

  if (!Number.isInteger(Number(process.env.SMTP_PORT)) || Number(process.env.SMTP_PORT) < 1) {
    throw new Error('SMTP_PORT must be a valid port number in production');
  }
}

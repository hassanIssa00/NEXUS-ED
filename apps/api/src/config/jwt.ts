import { randomBytes } from 'crypto';

export const DEFAULT_JWT_SECRET = 'your-secret-key-change-in-production';
const developmentJwtSecret = randomBytes(32).toString('hex');

export function getJwtSecret() {
  const configuredSecret = process.env.JWT_SECRET?.trim();
  if (configuredSecret) return configuredSecret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production');
  }

  return developmentJwtSecret;
}

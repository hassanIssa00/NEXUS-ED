import {
  getJwtRefreshSecret,
  getJwtSecret,
  validateProductionConfiguration,
} from './jwt';

const names = [
  'NODE_ENV',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DATABASE_URL',
  'DIRECT_URL',
  'FRONTEND_URL',
  'GOOGLE_CLIENT_ID',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM_EMAIL',
] as const;

describe('production configuration', () => {
  const original = new Map(names.map((name) => [name, process.env[name]]));

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(64);
    process.env.JWT_REFRESH_SECRET = 'b'.repeat(64);
    process.env.DATABASE_URL = 'postgresql://nexus:secret@localhost:5432/nexus';
    process.env.DIRECT_URL = 'postgresql://nexus:secret@localhost:5432/nexus';
    process.env.FRONTEND_URL = 'https://nexus.masarplatform.org';
    process.env.GOOGLE_CLIENT_ID = '000000000000-ci.apps.googleusercontent.com';
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'ci@nexus.test';
    process.env.SMTP_PASS = 'ci-only-password';
    process.env.SMTP_FROM_EMAIL = 'ci@nexus.test';
  });

  afterEach(() => {
    for (const name of names) {
      const value = original.get(name);
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it('requires separate strong access and refresh secrets', () => {
    expect(getJwtSecret()).toBe('a'.repeat(64));
    expect(getJwtRefreshSecret()).toBe('b'.repeat(64));
    expect(() => validateProductionConfiguration()).not.toThrow();
  });

  it('rejects weak or example access secrets', () => {
    process.env.JWT_SECRET = 'change-this-to-a-random-64-character-string';
    expect(() => getJwtSecret()).toThrow('JWT_SECRET');
  });

  it('rejects a missing refresh secret instead of reusing the access key', () => {
    delete process.env.JWT_REFRESH_SECRET;
    expect(() => getJwtRefreshSecret()).toThrow('JWT_REFRESH_SECRET');
  });

  it('rejects a production configuration without a direct database URL', () => {
    delete process.env.DIRECT_URL;
    expect(() => validateProductionConfiguration()).toThrow('DIRECT_URL');
  });

  it('rejects insecure production browser origins', () => {
    process.env.FRONTEND_URL = 'http://nexus.masarplatform.org';
    expect(() => validateProductionConfiguration()).toThrow('FRONTEND_URL');
  });
});

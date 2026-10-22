import { EmailService } from './email.service';

const oauthEnvNames = [
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM_EMAIL',
  'SMTP_FROM_NAME',
  'GMAIL_OAUTH_CLIENT_ID',
  'GMAIL_OAUTH_CLIENT_SECRET',
  'GMAIL_OAUTH_REFRESH_TOKEN',
] as const;

const response = (status: number, payload: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(payload),
  }) as unknown as Response;

describe('EmailService Gmail OAuth', () => {
  const originalEnv = new Map(
    oauthEnvNames.map((name) => [name, process.env[name]] as const),
  );
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    oauthEnvNames.forEach((name) => delete process.env[name]);
    process.env.SMTP_USER = 'nexuseduplatform@gmail.com';
    process.env.SMTP_FROM_EMAIL = 'nexuseduplatform@gmail.com';
    process.env.SMTP_FROM_NAME = 'Nexus EDU';
    process.env.GMAIL_OAUTH_CLIENT_ID = 'client-id';
    process.env.GMAIL_OAUTH_CLIENT_SECRET = 'client-secret';
    process.env.GMAIL_OAUTH_REFRESH_TOKEN = 'refresh-token';
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
    oauthEnvNames.forEach((name) => {
      const originalValue = originalEnv.get(name);
      if (originalValue === undefined) delete process.env[name];
      else process.env[name] = originalValue;
    });
  });

  it('refreshes an access token and sends MIME through Gmail with the send-only API', async () => {
    fetchMock
      .mockResolvedValueOnce(response(200, { access_token: 'access-token', expires_in: 3600 }))
      .mockResolvedValueOnce(response(200, { id: 'gmail-message-id' }));
    const service = new EmailService();

    expect(service.isConfigured()).toBe(true);
    await expect(service.isHealthy()).resolves.toBe(true);
    await expect(
      service.sendEmail({
        to: 'recipient@example.com',
        subject: 'تأكيد التسجيل',
        text: 'تم تأكيد الحساب',
        html: '<p>تم تأكيد الحساب</p>',
      }),
    ).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    );
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      headers: {
        Authorization: 'Bearer access-token',
        'Content-Type': 'application/json',
      },
    });
    const payload = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(typeof payload.raw).toBe('string');
    expect(payload.raw).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('reports unhealthy when the refresh token is rejected', async () => {
    fetchMock.mockResolvedValueOnce(response(400, { error: 'invalid_grant' }));
    const service = new EmailService();

    await expect(service.isHealthy()).resolves.toBe(false);
  });

  it('does not mark OAuth as configured when any required credential is missing', () => {
    delete process.env.GMAIL_OAUTH_REFRESH_TOKEN;
    const service = new EmailService();

    expect(service.isConfigured()).toBe(false);
  });
});

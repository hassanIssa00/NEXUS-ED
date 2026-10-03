import {
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleIdentityService } from '../services/google-identity.service';

const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest
    .fn()
    .mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken })),
}));

describe('GoogleIdentityService', () => {
  let service: GoogleIdentityService;
  const config = { get: jest.fn() } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GoogleIdentityService(config);
  });

  it('fails closed when the trusted Google OAuth client ID is missing', async () => {
    (config.get as jest.Mock).mockReturnValue(undefined);

    await expect(
      service.verifyIdToken('a-valid-looking-token'),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it('accepts only a verified email from a token issued to the configured client', async () => {
    (config.get as jest.Mock).mockReturnValue('nexus-client-id');
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-subject',
        email: ' STUDENT@EXAMPLE.COM ',
        email_verified: true,
        name: 'Student',
        picture: 'https://example.com/avatar.png',
      }),
    });

    await expect(service.verifyIdToken('google-token')).resolves.toEqual({
      subject: 'google-subject',
      email: 'student@example.com',
      name: 'Student',
      picture: 'https://example.com/avatar.png',
    });
    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: 'google-token',
      audience: 'nexus-client-id',
    });
  });

  it('rejects tokens with unverified email claims', async () => {
    (config.get as jest.Mock).mockReturnValue('nexus-client-id');
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-subject',
        email: 'student@example.com',
        email_verified: false,
      }),
    });

    await expect(service.verifyIdToken('google-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

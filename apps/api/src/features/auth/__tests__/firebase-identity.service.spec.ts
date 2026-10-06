import { generateKeyPairSync } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { sign } from 'jsonwebtoken';
import { FirebaseIdentityService } from '../services/firebase-identity.service';

describe('FirebaseIdentityService', () => {
  const projectId = 'nexus-edu-ikhlas-jeddah-2026';
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  let service: FirebaseIdentityService;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    service = new FirebaseIdentityService({
      get: jest.fn().mockReturnValue(projectId),
    } as unknown as ConfigService);
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('verifies the Firebase signature and resolves only the authenticated user profile', async () => {
    const token = sign({
      user_id: 'firebase-user-1',
      email: 'student@example.com',
      email_verified: true,
    }, privateKey, {
      algorithm: 'RS256',
      keyid: 'test-key',
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
      expiresIn: '1h',
    });
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({
        'test-key': publicKey.export({ format: 'pem', type: 'spki' }).toString(),
      }), { status: 200, headers: { 'cache-control': 'public, max-age=3600' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        fields: {
          email: { stringValue: 'student@example.com' },
          full_name: { stringValue: 'طالب حقيقي' },
          role: { stringValue: 'student' },
          status: { stringValue: 'pending' },
          gradeLevel: { integerValue: '6' },
        },
      }), { status: 200 }));

    await expect(service.verifyAndReadProfile(token)).resolves.toMatchObject({
      uid: 'firebase-user-1',
      email: 'student@example.com',
      role: 'STUDENT',
      status: 'pending',
      gradeLevel: 6,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firestoreRequest = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(firestoreRequest[0]).toContain('/users/firebase-user-1');
    expect(firestoreRequest[1]).toMatchObject({
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  it('rejects an identity token issued for another Firebase project before reading its profile', async () => {
    const token = sign({
      user_id: 'firebase-user-1',
      email: 'student@example.com',
      email_verified: true,
    }, privateKey, {
      algorithm: 'RS256',
      keyid: 'test-key',
      audience: 'another-project',
      issuer: 'https://securetoken.google.com/another-project',
      expiresIn: '1h',
    });

    await expect(service.verifyAndReadProfile(token)).rejects.toThrow(
      'Firebase identity token is for another project',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts a legacy pending staff profile without routing it through account review', async () => {
    const token = sign({
      user_id: 'firebase-teacher-1',
      email: 'teacher@example.com',
      email_verified: true,
    }, privateKey, {
      algorithm: 'RS256',
      keyid: 'test-key',
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
      expiresIn: '1h',
    });
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({
        'test-key': publicKey.export({ format: 'pem', type: 'spki' }).toString(),
      }), { status: 200, headers: { 'cache-control': 'public, max-age=3600' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        fields: {
          email: { stringValue: 'teacher@example.com' },
          full_name: { stringValue: 'معلم للاختبار' },
          role: { stringValue: 'teacher' },
          status: { stringValue: 'pending' },
        },
      }), { status: 200 }));

    await expect(service.verifyAndReadProfile(token)).resolves.toMatchObject({
      uid: 'firebase-teacher-1',
      role: 'TEACHER',
      status: 'pending',
    });
  });
});

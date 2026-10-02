import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Role } from '../auth/role.enum';
import { PrismaService } from '../prisma.service';
import { UploadService } from './upload.service';

describe('UploadService', () => {
  const previousEnv = {
    nodeEnv: process.env.NODE_ENV,
    supabaseUrl: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  const originalFetch = global.fetch;
  let prisma: {
    file: { findUnique: jest.Mock; findMany: jest.Mock; delete: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let service: UploadService;

  beforeEach(() => {
    prisma = {
      file: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), delete: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    service = new UploadService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    process.env.NODE_ENV = previousEnv.nodeEnv;
    process.env.SUPABASE_URL = previousEnv.supabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = previousEnv.serviceRoleKey;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('fails closed in production when cloud storage rejects an upload', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SUPABASE_URL = 'https://storage.example.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-secret';
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as jest.MockedFunction<typeof fetch>;
    const saveLocally = jest.spyOn(service as any, 'saveLocally');

    await expect(
      service.uploadToSupabase(Buffer.from('test'), 'document.pdf', 'application/pdf'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(saveLocally).not.toHaveBeenCalled();
  });

  it('rejects uploads to a public bucket before sending file bytes', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SUPABASE_URL = 'https://storage.example.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-secret';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ public: true }),
    }) as jest.MockedFunction<typeof fetch>;

    await expect(
      service.uploadToSupabase(Buffer.from('student file'), 'document.pdf', 'application/pdf'),
    ).rejects.toThrow('The school file bucket must be private');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://storage.example.test/storage/v1/bucket/assignments',
      expect.objectContaining({ headers: expect.objectContaining({ apikey: 'test-only-secret' }) }),
    );
  });

  it('stores files under a stable private path and returns a short-lived signed URL', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SUPABASE_URL = 'https://storage.example.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-secret';
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ public: false }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ signedURL: '/object/sign/assignments/file.pdf?token=temporary' }),
      }) as jest.MockedFunction<typeof fetch>;

    const uploaded = await service.uploadToSupabase(Buffer.from('private file'), 'report.pdf', 'application/pdf');

    expect(uploaded.storagePath).toMatch(/^storage:\/\/assignments\/[0-9a-f-]+\.pdf$/i);
    expect(uploaded.url).toMatch(/^https:\/\/storage\.example\.test\/storage\/v1\/object\/sign\/assignments\//);
    expect(uploaded.url).toContain('token=temporary');
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[2][1].body as string)).toEqual({ expiresIn: 900 });
  });

  it('resolves only files owned by the requesting uploader', async () => {
    prisma.file.findUnique.mockResolvedValue({ id: 'file-1', uploadedById: 'student-1' });

    await expect(service.getOwnedFileReference('file:file-1', 'student-1')).resolves.toBe('file:file-1');
    await expect(service.getOwnedFileReference('file:file-1', 'student-2')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lets an administrator reference an uploaded file from the same school', async () => {
    prisma.file.findUnique.mockResolvedValue({
      id: 'file-1',
      uploadedById: 'teacher-1',
      uploadedBy: { schoolId: 'school-1' },
    });

    await expect(service.getOwnedFileReference('file:file-1', 'admin-1', 'school-1', true))
      .resolves.toBe('file:file-1');
    await expect(service.getOwnedFileReference('file:file-1', 'admin-1', 'school-2', true))
      .rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a batch of signed links for references from the private bucket', async () => {
    prisma.file.findMany.mockResolvedValue([
      { id: 'file-1', url: 'storage://assignments/first.pdf' },
      { id: 'file-2', url: 'storage://assignments/second.pdf' },
    ]);
    process.env.SUPABASE_URL = 'https://storage.example.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-secret';
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ public: false }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { path: 'first.pdf', signedURL: '/object/sign/assignments/first.pdf?token=first' },
          { path: 'second.pdf', signedURL: '/object/sign/assignments/second.pdf?token=second' },
        ],
      }) as jest.MockedFunction<typeof fetch>;

    await expect(service.getSignedUrlsForReferences(['file:file-1', 'file:file-2'])).resolves.toEqual([
      'https://storage.example.test/storage/v1/object/sign/assignments/first.pdf?token=first',
      'https://storage.example.test/storage/v1/object/sign/assignments/second.pdf?token=second',
    ]);
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body as string)).toEqual({
      expiresIn: 900,
      paths: ['first.pdf', 'second.pdf'],
    });
  });

  it('preserves valid HTTPS course resources without treating them as storage objects', async () => {
    await expect(service.getSignedUrlsForReferences(['https://cdn.example.test/lesson.pdf'])).resolves.toEqual([
      'https://cdn.example.test/lesson.pdf',
    ]);
    await expect(service.getSignedUrlsForReferences(['javascript:alert(1)']))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('fails closed when production storage is not configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const saveLocally = jest.spyOn(service as any, 'saveLocally');

    await expect(
      service.uploadToSupabase(Buffer.from('test'), 'document.pdf', 'application/pdf'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(saveLocally).not.toHaveBeenCalled();
  });

  it('does not reveal another user\'s file metadata', async () => {
    prisma.file.findUnique.mockResolvedValue({
      id: 'file-1',
      uploadedById: 'owner-1',
      url: 'http://localhost:4000/uploads/file-1.pdf',
      uploadedBy: { id: 'owner-1', schoolId: 'school-1' },
    });

    await expect(service.getFile('file-1', 'student-2', Role.STUDENT)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('allows a school admin to access files from their school', async () => {
    prisma.file.findUnique.mockResolvedValue({
      id: 'file-1',
      uploadedById: 'owner-1',
      url: 'http://localhost:4000/uploads/file-1.pdf',
      uploadedBy: { id: 'owner-1', schoolId: 'school-1' },
    });
    prisma.file.findMany.mockResolvedValue([
      { id: 'file-1', url: 'http://localhost:4000/uploads/file-1.pdf' },
    ]);
    prisma.user.findUnique.mockResolvedValue({ schoolId: 'school-1', isActive: true });

    await expect(service.getFile('file-1', 'admin-1', Role.ADMIN)).resolves.toMatchObject({ id: 'file-1' });
  });

  it('prevents a different student from deleting the file', async () => {
    prisma.file.findUnique.mockResolvedValue({
      id: 'file-1',
      uploadedById: 'owner-1',
      uploadedBy: { id: 'owner-1', schoolId: 'school-1' },
    });

    await expect(service.deleteFile('file-1', 'student-2', Role.STUDENT)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.file.delete).not.toHaveBeenCalled();
  });
});

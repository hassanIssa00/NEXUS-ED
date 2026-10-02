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
    file: { findUnique: jest.Mock; delete: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let service: UploadService;

  beforeEach(() => {
    prisma = {
      file: { findUnique: jest.fn(), delete: jest.fn() },
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
      uploadedBy: { id: 'owner-1', schoolId: 'school-1' },
    });
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

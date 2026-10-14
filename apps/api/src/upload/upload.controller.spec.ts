import { isValidStudentAvatarUpload, UploadController } from './upload.controller';

describe('student avatar upload validation', () => {
  const file = (mimetype: string, bytes: number[], size = bytes.length) => ({
    mimetype,
    size,
    buffer: Buffer.from(bytes),
  }) as Express.Multer.File;

  it.each([
    ['image/jpeg', [0xff, 0xd8, 0xff, 0x00]],
    ['image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ['image/webp', [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]],
  ])('accepts a valid %s image signature', (mimetype, bytes) => {
    expect(isValidStudentAvatarUpload(file(mimetype, bytes))).toBe(true);
  });

  it('rejects mismatched MIME signatures and oversized payloads', () => {
    expect(isValidStudentAvatarUpload(file('image/png', [0xff, 0xd8, 0xff]))).toBe(false);
    expect(isValidStudentAvatarUpload(file('image/jpeg', [0xff, 0xd8, 0xff], 512 * 1024 + 1))).toBe(false);
    expect(isValidStudentAvatarUpload(file('application/pdf', [0x25, 0x50, 0x44, 0x46]))).toBe(false);
  });

  it('rejects missing and empty uploads', () => {
    expect(isValidStudentAvatarUpload(undefined)).toBe(false);
    expect(isValidStudentAvatarUpload(file('image/jpeg', [], 0))).toBe(false);
  });

  it('persists the validated compressed image on the authenticated student record', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'student-db-id' });
    const controller = new UploadController({} as any, { user: { update } } as any);
    const image = file('image/jpeg', [0xff, 0xd8, 0xff, 0x01]);

    await expect(controller.setMyAvatar(image, { user: { userId: 'student-db-id' } }))
      .resolves.toEqual({ success: true });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'student-db-id' },
      data: { avatar: 'data:image/jpeg;base64,/9j/AQ==' },
      select: { id: true },
    });
  });
});

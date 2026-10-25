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

  it('persists the validated compressed image only on the authenticated teacher record', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'teacher-db-id' });
    const controller = new UploadController({} as any, { user: { update } } as any);
    const image = file('image/jpeg', [0xff, 0xd8, 0xff, 0x01]);

    await expect(controller.setMyAvatar(image, { user: { userId: 'teacher-db-id', id: 'different-id' } }))
      .resolves.toEqual({ success: true });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'teacher-db-id' },
      data: { avatar: 'data:image/jpeg;base64,/9j/AQ==' },
      select: { id: true },
    });
  });

  it('rejects an oversized image before changing the authenticated user record', async () => {
    const update = jest.fn();
    const controller = new UploadController({} as any, { user: { update } } as any);
    const image = file('image/jpeg', [0xff, 0xd8, 0xff, 0x01], 512 * 1024 + 1);

    await expect(controller.setMyAvatar(image, { user: { userId: 'teacher-db-id' } }))
      .rejects.toThrow('اختر صورة JPEG أو PNG أو WebP صالحة');
    expect(update).not.toHaveBeenCalled();
  });
});

describe('upload content signature validation', () => {
  const controllerFor = (uploadToSupabase = jest.fn()) => {
    const uploadService = { uploadToSupabase };
    return { controller: new UploadController(uploadService as any, {} as any), uploadToSupabase };
  };

  it('rejects a spoofed single upload before saving it', async () => {
    const { controller, uploadToSupabase } = controllerFor();
    const spoofedPdf = {
      originalname: 'report.pdf',
      mimetype: 'application/pdf',
      size: 8,
      buffer: Buffer.from('not a pdf'),
    } as Express.Multer.File;

    await expect(controller.uploadFile(spoofedPdf, { user: { userId: 'teacher-1' } }))
      .rejects.toThrow('محتوى الملف لا يطابق نوعه المعلن');
    expect(uploadToSupabase).not.toHaveBeenCalled();
  });

  it('validates every item in a batch before saving any file', async () => {
    const { controller, uploadToSupabase } = controllerFor();
    const validPdf = {
      originalname: 'report.pdf',
      mimetype: 'application/pdf',
      size: 8,
      buffer: Buffer.from('%PDF-1.7'),
    } as Express.Multer.File;
    const spoofedImage = {
      originalname: 'photo.png',
      mimetype: 'image/png',
      size: 8,
      buffer: Buffer.from('not png'),
    } as Express.Multer.File;

    await expect(controller.uploadFiles([validPdf, spoofedImage], { user: { userId: 'teacher-1' } }))
      .rejects.toThrow('محتوى أحد الملفات لا يطابق نوعه المعلن');
    expect(uploadToSupabase).not.toHaveBeenCalled();
  });

  it('rejects spoofed PDF text extraction before parsing', async () => {
    const { controller } = controllerFor();
    const spoofedPdf = {
      mimetype: 'application/pdf',
      buffer: Buffer.from('<html>not a PDF</html>'),
    } as Express.Multer.File;

    await expect(controller.extractPdfText(spoofedPdf)).rejects.toThrow('File must be a PDF');
  });
});

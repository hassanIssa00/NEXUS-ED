import { multerConfig } from './multer.config';

describe('multerConfig file filter', () => {
  function accept(file: { originalname: string; mimetype: string }) {
    return new Promise<boolean>((resolve, reject) => {
      multerConfig.fileFilter({}, file, (error: Error | null, accepted: boolean) => {
        if (error) reject(error);
        else resolve(accepted);
      });
    });
  }

  it('accepts a supported extension and matching MIME type', async () => {
    await expect(accept({ originalname: 'lesson.pdf', mimetype: 'application/pdf' })).resolves.toBe(true);
  });

  it('rejects an allowed MIME type with an unrecognized extension', async () => {
    await expect(accept({ originalname: 'payload.exe', mimetype: 'application/pdf' })).rejects.toThrow(
      'امتداد الملف لا يتطابق مع نوعه الفعلي',
    );
  });

  it('rejects a supported extension with a mismatched MIME type', async () => {
    await expect(accept({ originalname: 'lesson.pdf', mimetype: 'image/png' })).rejects.toThrow(
      'امتداد الملف لا يتطابق مع نوعه الفعلي',
    );
  });
});

import { hasValidFileSignature } from './file-signature-validation';

describe('hasValidFileSignature', () => {
  it('accepts files whose signatures match their declared MIME types', () => {
    expect(hasValidFileSignature(Buffer.from('%PDF-1.7\n'), 'application/pdf')).toBe(true);
    expect(
      hasValidFileSignature(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        'image/png',
      ),
    ).toBe(true);
    expect(
      hasValidFileSignature(
        Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]),
        'video/mp4',
      ),
    ).toBe(true);
    expect(
      hasValidFileSignature(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ).toBe(true);
  });

  it('rejects a file with a mismatched signature', () => {
    expect(hasValidFileSignature(Buffer.from('%PDF-1.7\n'), 'image/png')).toBe(false);
    expect(hasValidFileSignature(Buffer.from('not a pdf'), 'application/pdf')).toBe(false);
  });

  it('rejects missing, undersized, or unsupported files', () => {
    expect(hasValidFileSignature(undefined, 'application/pdf')).toBe(false);
    expect(hasValidFileSignature(Buffer.from([0x00, 0x01, 0x02]), 'application/pdf')).toBe(false);
    expect(hasValidFileSignature(Buffer.from('data'), 'application/x-msdownload')).toBe(false);
  });
});

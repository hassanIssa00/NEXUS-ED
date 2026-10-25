const ZIP_SIGNATURES = [
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from([0x50, 0x4b, 0x05, 0x06]),
  Buffer.from([0x50, 0x4b, 0x07, 0x08]),
];

export function hasValidFileSignature(buffer: Buffer | undefined, mimeType: string): boolean {
  if (!buffer || buffer.length < 4) return false;

  switch (mimeType) {
    case 'image/jpeg':
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case 'image/png':
      return buffer.length >= 8
        && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/gif':
      return buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6));
    case 'image/webp':
      return buffer.length >= 12
        && buffer.toString('ascii', 0, 4) === 'RIFF'
        && buffer.toString('ascii', 8, 12) === 'WEBP';
    case 'application/pdf':
      return buffer.toString('ascii', 0, 5) === '%PDF-';
    case 'video/mp4':
      return buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp';
    case 'video/webm':
      return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    case 'application/msword':
      return buffer.length >= 8
        && buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return ZIP_SIGNATURES.some((signature) => buffer.subarray(0, signature.length).equals(signature));
    case 'application/vnd.ms-powerpoint':
      return buffer.length >= 8
        && buffer.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
    default:
      return false;
  }
}

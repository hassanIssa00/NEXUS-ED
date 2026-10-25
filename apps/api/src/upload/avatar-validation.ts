export function isValidAvatarImage(
  buffer: Buffer | undefined,
  mimeType: string | undefined,
  size: number | undefined,
  maxSizeBytes = 512 * 1024,
): boolean {
  if (!buffer || !Buffer.isBuffer(buffer) || !size || size < 1 || size > maxSizeBytes || buffer.length !== size) {
    return false;
  }

  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return mimeType === 'image/webp'
    && buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP';
}

export function avatarDataUrlToBuffer(value: string, maxSizeBytes = 512 * 1024): Buffer | null {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length > Math.ceil(maxSizeBytes * 4 / 3) + 4) return null;

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.toString('base64') !== match[2] || !isValidAvatarImage(buffer, match[1], buffer.length, maxSizeBytes)) {
    return null;
  }
  return buffer;
}

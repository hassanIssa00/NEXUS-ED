import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { randomUUID } from 'crypto';
import { Role } from '../auth/role.enum';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly signedUrlTtlSeconds = 15 * 60;
  private readonly privateBucketVerifiedUntil = new Map<string, number>();

  constructor(private prisma: PrismaService) {}

  async uploadToSupabase(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    bucket: string = 'assignments',
  ): Promise<{ url: string; filename: string; storagePath: string }> {
    const supabaseUrl = this.getSupabaseUrl();
    const supabaseKey = this.getServiceKey();

    if (process.env.NODE_ENV === 'production' && (!supabaseUrl || !supabaseKey)) {
      throw new ServiceUnavailableException('Cloud file storage is not configured');
    }

    // Generate unique filename
    const ext = originalName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'bin';
    const uniqueFilename = `${randomUUID()}.${ext}`;

    // If Supabase is configured, try to upload there
    if (supabaseUrl && supabaseKey) {
      try {
        await this.assertPrivateBucket(supabaseUrl, supabaseKey, bucket);
        const url = `${supabaseUrl}/storage/v1/object/${bucket}/${uniqueFilename}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': mimeType,
            'x-upsert': 'true', // Overwrite if exists (idempotent)
          },
          body: Buffer.from(buffer), // Use Buffer.from for Node.js compatibility
        });

        if (response.ok) {
          const storagePath = `storage://${bucket}/${uniqueFilename}`;
          let signedUrl: string;
          try {
            signedUrl = await this.createSignedUrl(supabaseUrl, supabaseKey, bucket, uniqueFilename);
          } catch (error) {
            await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${uniqueFilename}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
            }).catch(() => undefined);
            throw error;
          }
          return { url: signedUrl, filename: uniqueFilename, storagePath };
        }

        this.logger.warn(`Supabase upload failed with status ${response.status}.`);
      } catch (error) {
        if (error instanceof ServiceUnavailableException) throw error;
        this.logger.warn('Supabase upload request failed.');
      }
    }

    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException('Cloud file storage is unavailable');
    }

    // Fallback: save locally
    return this.saveLocally(buffer, uniqueFilename);
  }

  private getSupabaseUrl() {
    return (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  }

  private getServiceKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  }

  private async assertPrivateBucket(supabaseUrl: string, key: string, bucket: string) {
    const cacheKey = `${supabaseUrl}:${bucket}`;
    if ((this.privateBucketVerifiedUntil.get(cacheKey) ?? 0) > Date.now()) return;

    const response = await fetch(`${supabaseUrl}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
      headers: { Authorization: `Bearer ${key}`, apikey: key },
    });
    if (!response.ok) {
      throw new ServiceUnavailableException('Private school file storage is unavailable');
    }

    const config = await response.json() as { public?: boolean };
    if (config.public !== false) {
      throw new ServiceUnavailableException('The school file bucket must be private');
    }
    this.privateBucketVerifiedUntil.set(cacheKey, Date.now() + 30_000);
  }

  private async createSignedUrl(supabaseUrl: string, key: string, bucket: string, objectPath: string) {
    const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/');
    const response = await fetch(
      `${supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${encodedPath}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: this.signedUrlTtlSeconds }),
      },
    );
    if (!response.ok) {
      throw new ServiceUnavailableException('Unable to create a temporary file access link');
    }

    const result = await response.json() as { signedURL?: string };
    if (!result.signedURL) {
      throw new ServiceUnavailableException('Storage returned an invalid temporary file link');
    }
    return new URL(`/storage/v1${result.signedURL}`, `${supabaseUrl}/`).toString();
  }

  private parseStoragePath(value: string): { bucket: string; objectPath: string } {
    if (value.startsWith('storage://')) {
      const [bucket, ...parts] = value.slice('storage://'.length).split('/');
      return bucket && parts.length ? { bucket, objectPath: parts.join('/') } : null;
    }

    try {
      const parsed = new URL(value);
      const parts = parsed.pathname.split('/').filter(Boolean);
      const objectIndex = parts.findIndex((part, index) => part === 'object' && parts[index - 1] === 'v1');
      if (objectIndex < 0) return null;
      const accessMode = parts[objectIndex + 1];
      if (!['public', 'sign', 'authenticated'].includes(accessMode)) return null;
      const bucket = parts[objectIndex + 2];
      const objectPath = parts.slice(objectIndex + 3).map(decodeURIComponent).join('/');
      return bucket && objectPath ? { bucket, objectPath } : null;
    } catch {
      return null;
    }
  }

  async getOwnedFileReference(
    value: string,
    ownerId: string,
    schoolId?: string,
    allowSchoolFiles = false,
  ): Promise<string> {
    const referenceId = value.startsWith('file:') ? value.slice('file:'.length) : null;
    if (referenceId) {
      const file = await this.prisma.file.findUnique({
        where: { id: referenceId },
        include: { uploadedBy: { select: { schoolId: true } } },
      });
      const owned = file?.uploadedById === ownerId;
      const sameSchool = allowSchoolFiles && !!schoolId && file?.uploadedBy.schoolId === schoolId;
      if (file && (owned || sameSchool)) return `file:${file.id}`;
      throw new NotFoundException('File not found');
    }

    const files = await this.prisma.file.findMany({
      where: allowSchoolFiles && schoolId
        ? { uploadedBy: { schoolId } }
        : { uploadedById: ownerId },
      select: { id: true, url: true },
    });
    const requestedPath = this.parseStoragePath(value);
    const match = files.find((file) => {
      if (file.url === value) return true;
      const storedPath = this.parseStoragePath(file.url);
      return !!requestedPath && !!storedPath &&
        requestedPath.bucket === storedPath.bucket && requestedPath.objectPath === storedPath.objectPath;
    });
    if (!match) throw new NotFoundException('File not found');
    return `file:${match.id}`;
  }

  async getSignedUrlsForReferences(references: string[]): Promise<string[]> {
    if (!references.length) return [];

    const fileIds = [...new Set(references
      .filter((reference) => reference.startsWith('file:'))
      .map((reference) => reference.slice('file:'.length)))];
    const files = fileIds.length
      ? await this.prisma.file.findMany({
        where: { id: { in: fileIds } },
        select: { id: true, url: true },
      })
      : [];
    const fileById = new Map(files.map((file) => [file.id, file.url]));
    const result = new Array<string>(references.length);
    const grouped = new Map<string, Array<{ index: number; objectPath: string }>>();

    references.forEach((reference, index) => {
      const fileId = reference.startsWith('file:') ? reference.slice('file:'.length) : null;
      const storedValue = fileId ? fileById.get(fileId) : reference;
      if (!storedValue) throw new NotFoundException('File not found');

      const location = this.parseStoragePath(storedValue);
      if (!location) {
        if (process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(storedValue)) {
          result[index] = storedValue;
          return;
        }
        try {
          const externalUrl = new URL(storedValue);
          if (externalUrl.protocol === 'https:' && !externalUrl.username && !externalUrl.password) {
            result[index] = externalUrl.toString();
            return;
          }
        } catch {
          // Reject malformed stored references rather than turning them into links.
        }
        throw new ServiceUnavailableException('File storage reference is invalid');
      }

      const entries = grouped.get(location.bucket) ?? [];
      entries.push({ index, objectPath: location.objectPath });
      grouped.set(location.bucket, entries);
    });

    const supabaseUrl = this.getSupabaseUrl();
    const key = this.getServiceKey();
    if (grouped.size && (!supabaseUrl || !key)) {
      throw new ServiceUnavailableException('Private school file storage is not configured');
    }

    for (const [bucket, entries] of grouped) {
      await this.assertPrivateBucket(supabaseUrl, key, bucket);
      const paths = [...new Set(entries.map((entry) => entry.objectPath))];
      const response = await fetch(
        `${supabaseUrl}/storage/v1/object/sign/${encodeURIComponent(bucket)}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            apikey: key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ expiresIn: this.signedUrlTtlSeconds, paths }),
        },
      );
      if (!response.ok) throw new ServiceUnavailableException('Unable to create temporary file access links');

      const signedEntries = await response.json() as Array<{
        path?: string;
        signedURL?: string;
        error?: string;
      }>;
      const signedByPath = new Map(signedEntries
        .filter((entry) => entry.path && entry.signedURL)
        .map((entry) => [entry.path, entry.signedURL]));

      for (const entry of entries) {
        const signedUrl = signedByPath.get(entry.objectPath);
        if (!signedUrl) throw new ServiceUnavailableException('Storage could not sign a requested file');
        result[entry.index] = new URL(`/storage/v1${signedUrl}`, `${supabaseUrl}/`).toString();
      }
    }

    return result;
  }

  async getSignedUrlForReference(reference: string): Promise<string> {
    const [url] = await this.getSignedUrlsForReferences([reference]);
    if (!url) throw new ServiceUnavailableException('Storage returned no file link');
    return url;
  }

  private async saveLocally(
    buffer: Buffer,
    filename: string,
  ): Promise<{ url: string; filename: string; storagePath: string }> {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.promises.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filePath, buffer);
    
    this.logger.log(`File saved locally: ${filename}`);
    
    const port = process.env.PORT || 4000;
    const url = `http://localhost:${port}/uploads/${filename}`;
    return { url, filename, storagePath: url };
  }

  async deleteFromSupabase(url: string, bucket: string = 'assignments'): Promise<void> {
    const supabaseUrl = this.getSupabaseUrl();
    const supabaseKey = this.getServiceKey();

    if (!supabaseUrl || !supabaseKey) {
      if (this.parseStoragePath(url)) {
        throw new ServiceUnavailableException('Private school file storage is not configured');
      }
      this.deleteLocalFile(url);
      return;
    }

    try {
      const location = this.parseStoragePath(url);
      if (!location) {
        this.deleteLocalFile(url);
        return;
      }
      if (location.bucket !== bucket) throw new ServiceUnavailableException('File storage bucket mismatch');
      const deleteUrl = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${location.objectPath
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`;
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
      });
      if (!response.ok) throw new ServiceUnavailableException('Unable to delete the stored file');
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error('Error deleting from Supabase.');
      throw new ServiceUnavailableException('Unable to delete the stored file');
    }
  }

  private deleteLocalFile(value: string) {
    try {
      const parsed = new URL(value);
      if (!['localhost', '127.0.0.1'].includes(parsed.hostname)) return;
      const filename = path.basename(decodeURIComponent(parsed.pathname));
      if (!/^[0-9a-f-]{36}\.[a-z0-9]{1,10}$/i.test(filename)) return;
      const filePath = path.join(process.cwd(), 'uploads', filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      this.logger.warn('Local file deletion skipped because the URL was invalid.');
    }
  }

  async saveFileMetadata(
    filename: string,
    originalName: string,
    mimeType: string,
    size: number,
    userId: string,
    url: string
  ) {
    return this.prisma.file.create({
      data: {
        filename,
        originalName,
        mimeType,
        size,
        url,
        uploadedById: userId,
      },
    });
  }

  private async findAccessibleFile(id: string, actorId: string, actorRole: Role) {
    const file = await this.prisma.file.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            schoolId: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.uploadedById === actorId) {
      return file;
    }

    if (actorRole === Role.ADMIN) {
      const actor = await this.prisma.user.findUnique({
        where: { id: actorId },
        select: { schoolId: true, isActive: true },
      });

      if (actor?.isActive && !!actor.schoolId && actor.schoolId === file.uploadedBy.schoolId) {
        return file;
      }
    }

    throw new NotFoundException('File not found');
  }

  async getFile(id: string, actorId: string, actorRole: Role) {
    const file = await this.findAccessibleFile(id, actorId, actorRole);
    return { ...file, url: await this.getSignedUrlForReference(`file:${id}`) };
  }

  async getUserFiles(userId: string) {
    const files = await this.prisma.file.findMany({
      where: { uploadedById: userId },
      orderBy: { createdAt: 'desc' },
    });
    const urls = await this.getSignedUrlsForReferences(files.map((file) => `file:${file.id}`));
    return files.map((file, index) => ({
      ...file,
      url: urls[index],
    }));
  }

  async deleteFile(id: string, actorId: string, actorRole: Role): Promise<void> {
    const file = await this.findAccessibleFile(id, actorId, actorRole);
    await this.deleteFromSupabase(file.url);
    await this.prisma.file.delete({ where: { id } });
  }

  validateFileSize(size: number, maxSize: number = 10): boolean {
    const maxSizeInBytes = maxSize * 1024 * 1024;
    return size <= maxSizeInBytes;
  }
}

import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { randomUUID } from 'crypto';
import { Role } from '../auth/role.enum';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private prisma: PrismaService) {}

  async uploadToSupabase(buffer: Buffer, originalName: string, mimeType: string, bucket: string = 'assignments'): Promise<{ url: string, filename: string }> {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Prefer SERVICE_ROLE_KEY for storage write ops (anon key may lack bucket permissions)
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (process.env.NODE_ENV === 'production' && (!supabaseUrl || !supabaseKey)) {
      throw new ServiceUnavailableException('Cloud file storage is not configured');
    }

    // Generate unique filename
    const ext = originalName.split('.').pop()?.toLowerCase() || 'bin';
    const uniqueFilename = `${randomUUID()}.${ext}`;

    // If Supabase is configured, try to upload there
    if (supabaseUrl && supabaseKey) {
      try {
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
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${uniqueFilename}`;
          return { url: publicUrl, filename: uniqueFilename };
        }

        this.logger.warn(`Supabase upload failed with status ${response.status}.`);
      } catch (error) {
        this.logger.warn('Supabase upload request failed.');
      }
    }

    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException('Cloud file storage is unavailable');
    }

    // Fallback: save locally
    return this.saveLocally(buffer, uniqueFilename, originalName);
  }

  private async saveLocally(buffer: Buffer, filename: string, originalName: string): Promise<{ url: string, filename: string }> {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    
    this.logger.log(`File saved locally: ${filename}`);
    
    const port = process.env.PORT || 4000;
    const url = `http://localhost:${port}/uploads/${filename}`;
    return { url, filename };
  }

  async deleteFromSupabase(url: string, bucket: string = 'assignments'): Promise<void> {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // Try to delete local file
      try {
        const filename = url.split('/').pop();
        if (filename) {
          const filePath = path.join(process.cwd(), 'uploads', filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (error) {
        this.logger.error('Error deleting local file:', error);
      }
      return;
    }

    try {
      const urlParts = url.split('/');
      const filename = urlParts[urlParts.length - 1];

      const deleteUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filename}`;
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
        }
      });
      
      if (!response.ok) {
        this.logger.error(`Failed to delete from Supabase: ${await response.text()}`);
      }
    } catch (error) {
      this.logger.error('Error deleting from Supabase:', error);
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

      if (actor?.isActive && (!actor.schoolId || actor.schoolId === file.uploadedBy.schoolId)) {
        return file;
      }
    }

    throw new NotFoundException('File not found');
  }

  async getFile(id: string, actorId: string, actorRole: Role) {
    return this.findAccessibleFile(id, actorId, actorRole);
  }

  async getUserFiles(userId: string) {
    return this.prisma.file.findMany({
      where: { uploadedById: userId },
      orderBy: { createdAt: 'desc' },
    });
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

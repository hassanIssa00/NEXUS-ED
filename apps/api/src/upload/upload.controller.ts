import {
  Controller,
  Post,
  Patch,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';
import { multerConfig } from './multer.config';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import * as canvas from '@napi-rs/canvas';
import { PrismaService } from '../core/database/prisma.service';
import { isValidAvatarImage } from './avatar-validation';
import { hasValidFileSignature } from './file-signature-validation';

Object.assign(globalThis, {
  DOMMatrix: canvas.DOMMatrix,
  ImageData: canvas.ImageData,
  Path2D: canvas.Path2D,
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

export function isValidStudentAvatarUpload(file: Express.Multer.File | null | undefined): boolean {
  return isValidAvatarImage(file?.buffer, file?.mimetype, file?.size);
}

@Controller('upload')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('file')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!hasValidFileSignature(file.buffer, file.mimetype)) {
      throw new BadRequestException('محتوى الملف لا يطابق نوعه المعلن');
    }

    const userId = req.user.userId;

    // Upload to Supabase Storage
    const { url, filename, storagePath } = await this.uploadService.uploadToSupabase(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    const savedFile = await this.uploadService.saveFileMetadata(
      filename,
      file.originalname,
      file.mimetype,
      file.size,
      userId,
      storagePath,
    );

    return {
      id: savedFile.id,
      reference: `file:${savedFile.id}`,
      filename: savedFile.filename,
      originalName: savedFile.originalName,
      size: savedFile.size,
      mimeType: savedFile.mimeType,
      url,
      createdAt: savedFile.createdAt,
    };
  }

  @Post('files')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    if (files.some((file) => !hasValidFileSignature(file.buffer, file.mimetype))) {
      throw new BadRequestException('محتوى أحد الملفات لا يطابق نوعه المعلن');
    }

    const userId = req.user.userId;

    const savedFiles = await Promise.all(
      files.map(async (file) => {
        // Upload to Supabase Storage
        const { filename, storagePath } = await this.uploadService.uploadToSupabase(
          file.buffer,
          file.originalname,
          file.mimetype,
        );

        return this.uploadService.saveFileMetadata(
          filename,
          file.originalname,
          file.mimetype,
          file.size,
          userId,
          storagePath,
        );
      }),
    );

    return Promise.all(savedFiles.map(async (file: any) => ({
      id: file.id,
      reference: `file:${file.id}`,
      filename: file.filename,
      originalName: file.originalName,
      size: file.size,
      mimeType: file.mimeType,
      url: await this.uploadService.getSignedUrlForReference(`file:${file.id}`),
      createdAt: file.createdAt,
    })));
  }

  @Get('me/avatar')
  async getMyAvatar(@Request() req: any) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });
    if (!user?.avatar) return { url: null };
    if (user.avatar.startsWith('storage://')) {
      const [url] = await this.uploadService.getSignedUrlsForReferences([user.avatar], 24 * 60 * 60);
      return { url };
    }
    if (!user.avatar.startsWith('file:')) return { url: user.avatar };

    const fileId = user.avatar.slice('file:'.length);
    const file = await this.uploadService.getFile(fileId, userId, req.user.role, 24 * 60 * 60);
    if (!file.mimeType.startsWith('image/')) {
      throw new BadRequestException('ملف الصورة الشخصية غير صالح');
    }
    return { url: file.url };
  }

  @Patch('me/avatar')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT, Role.PRINCIPAL, Role.VICE_PRINCIPAL, Role.COUNSELOR, Role.SUPERVISOR, Role.ACCOUNTANT, Role.HR)
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 512 * 1024, files: 1 },
  }))
  async setMyAvatar(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    const userId = req.user.userId || req.user.sub || req.user.id;
    if (!isValidStudentAvatarUpload(file)) {
      throw new BadRequestException('اختر صورة JPEG أو PNG أو WebP صالحة لا يتجاوز حجمها 512 كيلوبايت');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: `data:${file.mimetype};base64,${file.buffer.toString('base64')}` },
      select: { id: true },
    });
    return { success: true };
  }

  @Get('my-files')
  async getMyFiles(@Request() req: any) {
    const userId = req.user.userId;
    const files = await this.uploadService.getUserFiles(userId);
    return files.map((file) => ({ ...file, reference: `file:${file.id}` }));
  }

  @Get(':id')
  async getFile(@Param('id') id: string, @Request() req: any) {
    const file = await this.uploadService.getFile(id, req.user.userId, req.user.role);
    if (!file) {
      throw new BadRequestException('File not found');
    }
    return { ...file, reference: `file:${file.id}` };
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async deleteFile(@Param('id') id: string, @Request() req: any) {
    await this.uploadService.deleteFile(id, req.user.userId, req.user.role);
    return { message: 'File deleted successfully' };
  }
  @Post('pdf-to-text')
  @Roles(Role.ADMIN, Role.TEACHER)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async extractPdfText(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No PDF file uploaded');
    }

    if (file.mimetype !== 'application/pdf' || !hasValidFileSignature(file.buffer, file.mimetype)) {
      throw new BadRequestException('File must be a PDF');
    }

    const parser = new pdfParse.PDFParse({ data: file.buffer });
    try {
      const data = await parser.getText();
      return { success: true, text: data.text };
    } catch {
      throw new BadRequestException('Failed to parse PDF text');
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }
}

import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  HttpStatus,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { multerConfig } from './multer.config';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/role.enum';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import * as canvas from '@napi-rs/canvas';

Object.assign(globalThis, {
  DOMMatrix: canvas.DOMMatrix,
  ImageData: canvas.ImageData,
  Path2D: canvas.Path2D,
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

@Controller('upload')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

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

    const userId = req.user.userId;

    const savedFiles = await Promise.all(
      files.map(async (file) => {
        // Upload to Supabase Storage
        const { url, filename, storagePath } = await this.uploadService.uploadToSupabase(
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

    if (file.mimetype !== 'application/pdf') {
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

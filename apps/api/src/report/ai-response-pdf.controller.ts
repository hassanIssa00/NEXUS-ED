import { Body, Controller, Post, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength, MinLength } from 'class-validator';
import type { Response } from 'express';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../infrastructure/decorators/roles.decorator';
import { Role } from '../shared/enums/roles.enum';
import { renderQueuedReportPdf } from '../queue/processors/report-pdf-renderer';

class AiResponsePdfDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  title: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30000)
  content: string;
}

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AiResponsePdfController {
  @Post('ai-response-pdf')
  @Roles(...Object.values(Role))
  @Throttle({ long: { limit: 8, ttl: 60_000 } })
  async downloadAiResponsePdf(@Body() body: AiResponsePdfDto, @Res() response: Response) {
    if (typeof body?.title !== 'string' || typeof body?.content !== 'string' || !body.title.trim() || !body.content.trim()) {
      throw new BadRequestException('عنوان الرد ومحتواه مطلوبان لإنشاء ملف PDF.');
    }
    const title = body.title.trim().slice(0, 180);
    const pdf = await renderQueuedReportPdf('ai-response', {
      reportTitle: title,
      response: body.content.trim(),
      generatedAt: new Date(),
    });
    const filename = `Nexus-EDU-AI-${Date.now()}.pdf`;
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Length', pdf.length);
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(title)}.pdf`);
    response.setHeader('Cache-Control', 'private, no-store');
    response.status(200).send(pdf);
  }
}

import { Module } from '@nestjs/common';
import { AuthModule } from '../features/auth/auth.module';
import { RolesGuard } from '../auth/roles.guard';
import { AiResponsePdfController } from './ai-response-pdf.controller';

@Module({
  imports: [AuthModule],
  controllers: [AiResponsePdfController],
  providers: [RolesGuard],
})
export class AiResponsePdfModule {}

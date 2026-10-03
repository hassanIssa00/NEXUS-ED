import { Controller, Post, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('WhatsApp')
@Controller('webhook/whatsapp')
export class WhatsAppController {
  @Post()
  @ApiOperation({ summary: 'WhatsApp webhook (unavailable until a signed provider integration is configured)' })
  handleIncomingMessage(): never {
    throw new ServiceUnavailableException('WhatsApp webhook integration is not configured');
  }
}

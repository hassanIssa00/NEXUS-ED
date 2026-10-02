import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SendMessageDto, StartConversationDto } from './dto/create-message.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  getConversations(@Request() req: any) {
    return this.messagesService.getConversations(req.user.userId);
  }

  @Get('contacts')
  getContacts(@Request() req: any) {
    return this.messagesService.getContacts(req.user.userId);
  }

  @Post('start')
  startConversation(@Request() req: any, @Body() dto: StartConversationDto) {
    return this.messagesService.startDirectConversation(req.user.userId, dto.targetUserId);
  }

  @Get(':conversationId')
  getMessages(@Request() req: any, @Param('conversationId') conversationId: string) {
    return this.messagesService.getMessages(conversationId, req.user.userId);
  }

  @Post(':conversationId/send')
  sendMessage(
    @Request() req: any,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(req.user.userId, conversationId, dto.content, dto.attachments);
  }
}

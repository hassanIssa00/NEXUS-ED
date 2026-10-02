import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  attachments?: string;
}

export class StartConversationDto {
  @IsString()
  @IsNotEmpty()
  targetUserId: string;
}

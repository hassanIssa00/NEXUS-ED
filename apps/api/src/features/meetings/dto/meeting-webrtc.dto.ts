import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class MeetingHeartbeatDto {
  @IsOptional()
  @IsBoolean()
  micOn?: boolean;

  @IsOptional()
  @IsBoolean()
  cameraOn?: boolean;

  @IsOptional()
  @IsBoolean()
  raisedHand?: boolean;

  @IsOptional()
  @IsBoolean()
  isScreenSharing?: boolean;

  @IsOptional()
  @IsString()
  lastMessageTime?: string;
}

export class MeetingSignalDto {
  @IsString()
  @IsNotEmpty()
  toUserId!: string;

  @IsNotEmpty()
  signal!: any;
}

export class MeetingChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1200)
  message!: string;
}

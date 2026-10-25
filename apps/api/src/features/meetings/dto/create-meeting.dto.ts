import { ArrayMaxSize, IsArray, IsDateString, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateMeetingDto {
  @IsIn(['CLASS', 'PARENT', 'STAFF'])
  meetingType!: 'CLASS' | 'PARENT' | 'STAFF';

  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  description?: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @IsUUID('all', { each: true })
  participantIds?: string[];
}

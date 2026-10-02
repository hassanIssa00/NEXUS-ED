import { IsInt, IsOptional, IsString, IsUrl, Length, Max, Min } from 'class-validator';

export class StartClassSessionDto {
  @IsString()
  @Length(2, 120)
  title: string;

  @IsUrl({ require_protocol: true, require_tld: true })
  meetingUrl: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  duration?: number;
}

export class MarkClassSessionAttendanceDto {
  @IsString()
  studentId: string;
}

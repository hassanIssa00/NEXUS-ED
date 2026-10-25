import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class StartClassSessionDto {
  @IsString()
  @Length(2, 120)
  title: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  duration?: number;
}

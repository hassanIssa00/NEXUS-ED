import { ArrayMaxSize, IsString, IsOptional, IsArray, IsNumber, IsDateString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(20000)
  description?: string;

  @IsString()
  subjectId: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(1000)
  maxScore?: number;

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  attachments?: string[];
}

export class UpdateAssignmentDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20000)
  description?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(1000)
  maxScore?: number;

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  attachments?: string[];
}

export class SubmitAssignmentDto {
  @IsString()
  @IsOptional()
  @MaxLength(20000)
  content?: string;

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  attachments?: string[];
}

export class GradeSubmissionDto {
  @IsNumber()
  score: number;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  feedback?: string;
}

export class AssignmentFilterDto {
  @IsString()
  @IsOptional()
  subjectId?: string;

  @IsString()
  @IsOptional()
  teacherId?: string;
}

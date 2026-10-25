import { ArrayMaxSize, IsString, IsOptional, IsArray, IsNumber, IsDateString, Max, MaxLength, Min, MinLength, IsInt, Matches, IsIn } from 'class-validator';

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

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(30)
  questions?: unknown[];

  @IsIn(['AI_QUESTIONS', 'BOOK_PAGES'])
  @IsOptional()
  deliveryMode?: 'AI_QUESTIONS' | 'BOOK_PAGES';

  @IsString()
  @IsOptional()
  @MaxLength(80)
  @Matches(/^[a-z0-9-]+$/)
  curriculumSlug?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  curriculumPageFrom?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  curriculumPageTo?: number;
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

  @IsIn(['AI_QUESTIONS', 'BOOK_PAGES'])
  @IsOptional()
  deliveryMode?: 'AI_QUESTIONS' | 'BOOK_PAGES';

  @IsString()
  @IsOptional()
  @MaxLength(80)
  @Matches(/^[a-z0-9-]+$/)
  curriculumSlug?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  curriculumPageFrom?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  curriculumPageTo?: number;
}

export class SubmitAssignmentDto {
  @IsString()
  @IsOptional()
  @MaxLength(100000)
  content?: string;

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(30)
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

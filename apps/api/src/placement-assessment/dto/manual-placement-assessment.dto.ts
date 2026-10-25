import { IsInt, IsObject, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class ManualPlacementAssessmentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  candidateName!: string;

  @IsInt()
  @Min(0)
  @Max(12)
  gradeLevel!: number;

  @IsObject()
  answers!: Record<string, unknown>;
}

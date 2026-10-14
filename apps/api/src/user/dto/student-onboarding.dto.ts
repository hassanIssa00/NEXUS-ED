import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsObject, IsOptional, IsString, Matches, Max, Min, IsUUID } from 'class-validator';

export class SaveStudentProfileDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(12)
  gradeLevel: number;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'رقم الهوية يجب أن يتكون من 10 أرقام' })
  nationalId?: string;
}

export class RedeemStudentLinkCodeDto {
  @IsString()
  @Matches(/^[A-Fa-f0-9]{16}$/)
  code: string;
}

export class SubmitParentSurveyDto {
  @IsUUID()
  studentId: string;

  @IsObject()
  answers: Record<string, string>;

  @IsBoolean()
  consent: boolean;
}

import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export const SAUDI_ELEMENTARY_SUBJECTS = [
  'ARABIC',
  'ISLAMIC_STUDIES',
  'MATHEMATICS',
  'SCIENCE',
  'ENGLISH',
  'SOCIAL_STUDIES',
  'PHYSICAL_EDUCATION',
  'ART_EDUCATION',
  'DIGITAL_SKILLS',
  'LIFE_SKILLS',
  'ACTIVITY',
] as const;

export class TeacherRegistrationProfileDto {
  @IsString()
  @Matches(/^[12]\d{9}$/)
  nationalId: string;

  /** Required only for teacher attempts; use one of the stable subject keys above. */
  @IsString()
  @IsIn(SAUDI_ELEMENTARY_SUBJECTS)
  specialization: (typeof SAUDI_ELEMENTARY_SUBJECTS)[number];

  /** Optional profile detail. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  yearsExperience?: number;

  /** Optional homeroom class. The API verifies it belongs to the public school. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  homeroomClass?: string;

}

export class RegistrationAttemptDto {
  @IsString()
  @MinLength(100)
  @MaxLength(8192)
  idToken: string;

  /** Required only for teacher attempts. Never persisted or returned. */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  teacherCode?: string;

  /** Required only for teacher attempts. Student attempts omit this object. */
  @IsOptional()
  @ValidateNested()
  @Type(() => TeacherRegistrationProfileDto)
  teacherProfile?: TeacherRegistrationProfileDto;
}

export class VerifyTeacherRegistrationCodeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  code: string;
}

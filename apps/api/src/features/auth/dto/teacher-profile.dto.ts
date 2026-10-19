import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { SAUDI_PRIMARY_SUBJECTS } from '../saudi-primary-subjects';

export class SaveTeacherProfileDto {
  @IsString()
  @IsIn([...SAUDI_PRIMARY_SUBJECTS])
  specialization: string;

  @IsString()
  @Matches(/^[12]\d{9}$/)
  residenceNumber: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  classCodes?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  homeroomCode?: string;
}

import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SaveTeacherProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  specialization: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  qualification: string;

  @IsInt()
  @Min(0)
  @Max(60)
  yearsExperience: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @ArrayUnique()
  @IsString({ each: true })
  classIds: string[];

  @IsString()
  @MinLength(1)
  homeroomClassId: string;
}

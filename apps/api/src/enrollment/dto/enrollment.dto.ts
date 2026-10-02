import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class CreateEnrollmentDto {
  @IsUUID()
  studentId: string;

  @IsUUID()
  classId: string;
}

export class BulkEnrollmentDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  studentIds: string[];

  @IsUUID()
  classId: string;
}

export class EnrollmentFilterDto {
  classId?: string;
  studentId?: string;
}

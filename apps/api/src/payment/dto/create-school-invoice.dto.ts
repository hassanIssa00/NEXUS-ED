import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateSchoolInvoiceDto {
  @IsUUID()
  studentId: string;

  @IsNumber()
  @Min(0.01)
  @Max(1000000)
  amount: number;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsOptional()
  @IsIn(['SAR', 'USD'])
  currency?: string;
}

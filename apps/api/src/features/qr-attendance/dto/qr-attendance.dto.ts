import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateQrSessionDto {
  @IsString()
  @MaxLength(128)
  classId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  durationMinutes?: number;
}

export class ScanQrCodeDto {
  @IsString()
  @IsUUID('4')
  qrCode: string;
}

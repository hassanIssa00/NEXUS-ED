import { IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class GeofenceCheckInDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1000)
  accuracyMeters: number;

  @IsOptional()
  @IsUUID()
  scheduleEventId?: string;
}

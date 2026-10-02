import { IsObject } from 'class-validator';

export class SubmitPlacementAssessmentDto {
  @IsObject()
  answers!: Record<string, unknown>;
}

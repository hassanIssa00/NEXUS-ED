import { IsEmail, Matches, MaxLength, MinLength } from 'class-validator';

export class ConfirmPasswordResetDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @Matches(/^\d{6}$/)
  code: string;

  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

import { IsString, MaxLength, MinLength } from 'class-validator';

export class FirebaseLoginDto {
  @IsString()
  @MinLength(20)
  @MaxLength(8192)
  idToken: string;
}

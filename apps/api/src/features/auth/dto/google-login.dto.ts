import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../../shared/enums/roles.enum';

export class GoogleLoginDto {
  @IsString()
  @MinLength(20)
  @MaxLength(8192)
  idToken: string;

  @IsIn([Role.STUDENT, Role.PARENT])
  role: Role.STUDENT | Role.PARENT;
}

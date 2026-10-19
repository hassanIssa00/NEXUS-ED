import { IsEmail, IsString, MinLength, IsIn, IsOptional, MaxLength, Matches, ValidateIf } from 'class-validator';
import { Role } from '../../../shared/enums/roles.enum';

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    password: string;

    @IsString()
    @IsIn([Role.STUDENT, Role.PARENT, Role.TEACHER])
    role: Role;

    @ValidateIf((dto: RegisterDto) => dto.role === Role.TEACHER)
    @IsString()
    @MinLength(8)
    teacherCode?: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(30)
    @Matches(/^[+0-9()\-\s]{7,30}$/)
    phone?: string;

}

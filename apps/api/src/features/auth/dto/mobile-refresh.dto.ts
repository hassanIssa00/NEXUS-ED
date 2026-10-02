import { IsString, MinLength } from 'class-validator';

export class MobileRefreshDto {
    @IsString()
    @MinLength(32)
    refresh_token: string;
}

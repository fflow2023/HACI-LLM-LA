import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(16)
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(16)
  @Matches(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/, {
    message: '密码必须包含大小写字母和数字'
  })
  password: string;
}
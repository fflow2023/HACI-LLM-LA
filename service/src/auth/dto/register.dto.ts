import { IsString, Length, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(9, 9, { message: '学号必须为9位数字' })
  username: string;

  @IsString()
  @MinLength(2, { message: '姓名至少2位字符' })
  @MaxLength(10, { message: '姓名最多10位字符' })
  name: string;

  @IsString()
  @MinLength(8)
  @MaxLength(16)
  @Matches(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}/, {
    message: '必须包含大小写字母和数字'
  })
  password: string;
}
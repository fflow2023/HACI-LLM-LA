import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

// 新增用户信息 DTO
export class UserInfoDto {
  @ApiProperty({ example: 'john_doe' })
  username: string;

  @ApiProperty({example: '张三', })
  name: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;
}

export class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGci...' })
  access_token: string;

  @ApiProperty({ type: UserInfoDto })
  user: UserInfoDto; // 将 role 和 username 和 name 包裹在 user 对象中
}
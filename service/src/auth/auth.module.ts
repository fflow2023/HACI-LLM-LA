import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from './entities/user.entity';

@Module({
    imports: [
      TypeOrmModule.forFeature([User]),
      JwtModule.register({ // 关键修改：完整注册配置
        secret: process.env.JWT_SECRET || 'your-secure-key',
        signOptions: { expiresIn: '2h' }
      })
    ],
    providers: [AuthService],
    controllers: [AuthController],
    exports: [JwtModule] // 新增：导出JWT模块
  })
  export class AuthModule {}

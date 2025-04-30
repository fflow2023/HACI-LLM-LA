import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) { }

  async register(registerDto: RegisterDto) {
    // 检查用户名是否已存在
    const existingUser = await this.userRepository.findOne({
      where: { username: registerDto.username }
    });
    if (existingUser) {
      throw new ConflictException('用户名已被注册');
    }

    // 生成密码哈希
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    // 创建用户
    const user = this.userRepository.create({
      username: registerDto.username,
      name: registerDto.name,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    return { id: savedUser.id, username: savedUser.username, name: savedUser.name, role: savedUser.role, createdAt: savedUser.createdAt };
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.userRepository.findOne({
      where: { username: loginDto.username },
      select: ['id', 'username', 'password', 'role'] // 新增role字段
    });

    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role // 在JWT负载中加入角色
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {  
        username: user.username,
        role: user.role.toUpperCase() as UserRole // 强制转为大写
      }
  }
}
}
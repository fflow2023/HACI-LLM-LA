import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core'; // 新增Reflector
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'; // 确保路径正确

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService, // 移除@Inject，使用正常注入
    private reflector: Reflector // 新增Reflector依赖
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // 检查是否为公共路由
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true; // 公共路由直接放行

    // 非公共路由需要验证Token
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    
    try {
      request.user = this.jwtService.verify(token);
      return true;
    } catch (e) {
      return false;
    }
  }

  private extractToken(request: Request): string | undefined {
    // 兼容Express/Fastify等框架
    const headers = request.headers as any;
    const [type, token] = headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
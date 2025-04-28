import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core'; // 新增Reflector
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'; // 确保路径正确
import { Logger } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService, // 移除@Inject，使用正常注入
    private reflector: Reflector // 新增Reflector依赖
  ) { }

  canActivate(context: ExecutionContext): boolean {
    const logger = new Logger('AuthGuard');
    const request = context.switchToHttp().getRequest();

    // 调试标记请求基础信息
    logger.debug(`[Guard] 开始验证路由权限 => ${request.method} ${request.url}`);

    // 阶段1: 检查公共路由元数据
    const handler = context.getHandler();
    const controller = context.getClass();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      handler,
      controller,
    ]);

    logger.verbose(`[Guard] 路由元数据检查结果 =>`, {
      controller: controller.name,
      handler: handler.name,
      isPublic
    });

    if (isPublic) {
      logger.log(`[Guard] 放行公共路由: ${controller.name}.${handler.name}`);
      return true;
    }




    // 阶段2: 提取并验证Token
    try {
      logger.debug('[Guard] 开始身份验证流程');

      // 提取Token
      const token = this.extractToken(request);
      logger.verbose('[Guard] 提取到的Token', {
        hasToken: !!token,
        tokenPreview: token ? `${token.slice(0, 6)}...${token.slice(-6)}` : '无'
      });

      if (!token) {
        logger.warn('[Guard] 拒绝访问: 请求头未包含Authorization令牌');
        return false;
      }

      // 验证Token
      logger.debug('[Guard] 开始JWT验证');



      const payload = this.jwtService.verify(token);
      logger.verbose('[Guard] Token解析结果', {
        userId: payload.sub,
        exp: new Date(payload.exp * 1000).toISOString(),
        iss: payload.iss
      });

      // 附加用户信息到请求
      request.user = payload;
      logger.log(`[Guard] 用户认证成功 => UserID: ${payload.sub}`);

      return true;
    } catch (error) {
      // 错误处理
      logger.error('[Guard] 身份验证失败', {
        error: error.name,
        message: error.message,
        stack: error.stack // 生产环境应移除堆栈信息
      });

      // 根据错误类型细化日志
      if (error.name === 'TokenExpiredError') {
        logger.warn(`[Guard] Token已过期，过期时间: ${error.expiredAt.toISOString()}`);
      } else if (error.name === 'JsonWebTokenError') {
        logger.warn('[Guard] 无效的Token格式', { originalToken: error.token });
      }

      return false;
    } finally {
      // 最终状态报告
      logger.verbose('[Guard] 验证流程结束', {
        path: request.url,
        authorized: request.user ? true : false
      });

                // 添加调试语句输出JWT配置
                logger.debug('[Guard] JWT服务实例验证', {
                  isJwtService: this.jwtService instanceof JwtService,
                  options: this.jwtService['options']
                });
    }
  }

  private extractToken(request: Request): string | undefined {
    // 兼容Express/Fastify等框架
    const headers = request.headers as any;
    const [type, token] = headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
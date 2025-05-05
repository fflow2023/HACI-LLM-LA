// service/src/interceptors/rate-limit.interceptor.ts
import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    ForbiddenException
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

// 扩展 Express 的 Request 类型
declare module 'express' {
    interface Request {
        user?: {
            id: string;          // 用户唯一标识
            username?: string;   // 其他需要用的字段
            role?: string;       // 用户角色
        };
    }
}

// 存储用户最后请求时间 { key: 用户ID或IP, value: 时间戳 }
const requestRecords = new Map<string, number>();

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>();
        const now = Date.now();

        // 生成唯一标识（优先使用用户ID，未登录使用IP）
        const identifier = request.user?.id
            ? `user_${request.user.id}`
            : `ip_${this.getClientIp(request)}`;

        // 检查1秒内是否重复请求
        if (requestRecords.has(identifier)) {
            const lastTime = requestRecords.get(identifier)!;
            if (now - lastTime < 1000) {
                throw new ForbiddenException({
                    code: 429,
                    message: '操作过于频繁，请1秒后再试'
                });
            }
        }

        // 更新最后请求时间
        requestRecords.set(identifier, now);

        return next.handle();
    }

    // 获取客户端IP（精简版）
    private getClientIp(request: Request): string {
        return request.ip || // 优先使用Express自带的ip属性
            request.socket.remoteAddress ||
            'unknown_ip';
    }
}
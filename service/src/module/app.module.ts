//HACI-LLM-LA\service\src\module\app.module.ts
import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { AppController } from '../controller/app.controller';
import { AppService } from '../service/app.service';
import { FileService } from '../service/file';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // 环境变量配置（必须放在最前面）
    ConfigModule.forRoot({  
      isGlobal: true,
      envFilePath: '.env'  
    }),

    // 数据库配置
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306, // MySQL默认端口
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_DATABASE || 'llm_service',
      multipleStatements: true, // 多条语句配置
      logging: true, // 开启SQL日志
      logger: 'advanced-console',
      autoLoadEntities: true,
      entities: [join(__dirname, '../**/entities/*.entity{.ts,.js}')],
      synchronize: true,

      // MySQL需要以下额外配置
      charset: 'utf8mb4',
      timezone: '+08:00',
      extra: {
        connectionLimit: 10 // 连接池配置
      }
    }),

    // 认证模块
    AuthModule,

    // 文件上传模块（保留原有配置）
    MulterModule.register({
      storage: diskStorage({
        destination: './fileUpload',
        filename: (req, file, cb) => {
          cb(null, decodeURIComponent(escape(file.originalname)));
        },
      }),
    }),

    // 静态资源服务（保留原有配置）
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '../..', 'fileUpload'),
      serveRoot: '/static',
    }),
  ],
  controllers: [AppController],
  providers: [{
    provide: APP_GUARD,
    useClass: JwtAuthGuard, // 使所有路由默认需要登录认证
  },
    AppService,
    FileService],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(private readonly appService: AppService) {}
  async onApplicationBootstrap() {
    await this.appService.refactorVectorStore('英语');
    await this.appService.refactorVectorStore('日语');
  }
}
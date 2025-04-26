import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './module/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import { getLocalIP } from './common/network-helper'; // 将网络功能抽离
import { DataSource } from 'typeorm';

// 加载环境变量（优先级高于系统环境变量）
dotenv.config({ path: '.env' });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局验证管道（增强配置）
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // 自动过滤非DTO字段
      forbidNonWhitelisted: true, // 抛出非预期字段错误
      transform: true,          // 自动类型转换
      disableErrorMessages: process.env.NODE_ENV === 'production' // 生产环境隐藏错误详情
    })
  );

  // 跨域配置
  app.enableCors({
    origin: [
      'http://localhost:1002', // 前端实际运行端口
      'http://172.22.80.1:1002',
      'http://172.30.217.12:1002'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });

  // Swagger 文档配置（增强安全方案）
  const config = new DocumentBuilder()
    .setTitle('LLM Service API')
    .setDescription('集成用户认证和核心AI能力的API文档')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: '输入获取的JWT Token',
      in: 'header'
    }, 'JWT-auth')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 保持认证状态
      tagsSorter: 'alpha',         // 标签排序
      operationsSorter: 'method'  // 操作排序
    }
  });

  // 启动服务（支持局域网访问）
  const port = process.env.PORT || 3000;
  const listenHost = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

  await app.listen(port, listenHost);

  const dataSource = app.get(DataSource);
  console.log('已加载实体:', dataSource.entityMetadatas.map(e => e.name));

  // 输出访问信息
  console.log(`\n服务运行地址:
  - 本地: http://localhost:${port}
  - 网络: http://${getLocalIP()}:${port}`);

  console.log(`\n接口文档:
  - Swagger UI: http://localhost:${port}/api
  - JSON格式:  http://localhost:${port}/api-json`);
}

// 启动应用
bootstrap();
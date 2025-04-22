import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './module/app.module';
//import { MyVectorStore } from './vector_store/myVectorStore';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
dotenv.config({
  path:  '.env'
});
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();
  const config = new DocumentBuilder()
  .setTitle('Cats example')
  .setDescription('The cats API description')
  .setVersion('1.0')
  .addTag('cats')
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document);
  
  let start_lan = true;
  await app.listen(3000, start_lan ? '0.0.0.0' :'');
  
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`接口文档请查看: ${await app.getUrl()}/api`);
  if (start_lan) 
    console.log(`Network: http://${getLocalIP()}:3000`);  // 输出网络IP地址，方便局域网访问
}

// 获取本地局域网 IP 地址
function getLocalIP() {
  const interfaces = require('os').networkInterfaces();
  for (let interfaceName in interfaces) {
    for (let i = 0; i < interfaces[interfaceName].length; i++) {
      const alias = interfaces[interfaceName][i];
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;  // 返回局域网IP地址
      }
    }
  }
  return 'localhost';
}
bootstrap();

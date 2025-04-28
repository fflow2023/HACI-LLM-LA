//HACI-LLM-LA\service\src\controller\app.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { AppService } from '../service/app.service';
import { EmbeddingManager } from 'src/embeddings/embedding-manager.bak';
import { ApiBody, ApiConsumes, ApiParam, ApiProperty } from '@nestjs/swagger';
import { FileDeleteDto, FileUploadDto, searchDto } from 'src/dto/file.dto';
import { ChatGlmDto, ChatGptDto, SetEmbeddingDto } from 'src/dto/chat.dto';
import { FileService } from '../service/file'; // 添加文件服务依赖
import { memoryStorage } from 'multer';
import { Public } from 'src/auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';



@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly fileService: FileService
  ) { }

// app.controller.ts中的parseFile方法
@UseInterceptors(FileInterceptor('file', {
  storage: memoryStorage(), // 内存存储仅用于解析接口
  limits: {
    fileSize: 100 * 1024 * 1024 // 限制100MB
  }
}))

@Post('file/parse')
async parseFile(@UploadedFile() file: Express.Multer.File) {
  if (!file || file.size === 0) {
    throw new HttpException(
      { 
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Empty file contents!'
      },
      HttpStatus.BAD_REQUEST
    );
  }

  try {
    return {
      statusCode: 200,
      data: await this.fileService.parseMemoryFile(
        file.buffer,
        file.originalname // 传递原始文件名
      )
    };
  } catch (error) {
    throw new HttpException(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.message || 'Unknown parsing error.',
      },
      HttpStatus.BAD_REQUEST  );
  }
}

  //文件相关处理
  @UseInterceptors(FileInterceptor('file'))
  @Post('file')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '上传文件',
    type: FileUploadDto,
 })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ) {
    console.log(decodeURIComponent(escape(file.originalname)));
    return await this.appService.refactorVectorStore();

  }
  @Get('file/query-list')
  async queryFileList( ) {
    console.log(await this.appService.getFileList())
    return  await this.appService.getFileList()
  }
  @Post('file/delete')
  @ApiBody({
    description: '删除文件',
    type: FileDeleteDto,
 })
  async deleteFile(@Body() body:any) {
    return  await this.appService.deleteFile(body.fileName)
  }

  //Chatglm相关
  
  @Post('chat')
  @ApiBody({
    description: 'Glm对话',
    type: ChatGlmDto,
 })
  async chat(
    @Body() body:any,

  ) {
    return await this.appService.chat(body);

  }
  
  @Post('chatfile')
  @ApiBody({
    description: 'Glm文档问答',
    type: ChatGlmDto,
 })
  async chatfile(
    @Body() body: any,

  ) {
    return await this.appService.chatfile(body);

  }
  @Post('chatfileOpenai')
  @ApiBody({
    description: 'Gpt文档问答',
    type: ChatGptDto,
 })
  async chatfileGPT(
    @Body() body: any,
  ) {
    console.log('chatfile-openai',body);
    console.log('xxxxxxxxxxxx,test');
    
    return await this.appService.chatfileOpenAI(body);
  }
  
  @Post('chatfileContent')
  @ApiBody({
    description: '文档问答--只获取文档内容',
    type: ChatGptDto,
 })
  async chatfileContent(
    @Body() body: any,
  ) {
    return await this.appService.chatfileContent(body);
  }
  

  @Post('chatOpenAI')
  @ApiBody({
    description: 'Gpt对话',
    type: ChatGptDto,
 })
  async chatOpenAI(
    @Body() body,
  ) {
    return await this.appService.chatOpenAI(body);

  }

  @Post('search')
  @ApiBody({
    description: 'bing搜索',
    type: searchDto,
 })
  async bingsearch(
    @Body() body,
  ) {
    return await this.appService.bingsearch(body);

  }



  @Post('set-embedding')
  @ApiBody({
    description: '设置向量化文档的模型目前三选一',
    type: SetEmbeddingDto,
 })
  async setEmbedding(
    @Body() body,
  ) {
    const { name ,api_key} = body
    console.log('set-embedding',body);
    
    const strategys = {
      default: async() => {
        await EmbeddingManager.resetEmbedding();
        EmbeddingManager.setCurrentEmbedding('default');
      },
      cohere: async() => {
        await EmbeddingManager.resetEmbedding({ cohereKey: api_key });
        EmbeddingManager.setCurrentEmbedding('cohere');
      },
      openai: async() => {
        await EmbeddingManager.resetEmbedding({ openAIKey: api_key });
        EmbeddingManager.setCurrentEmbedding('openai');
      }
    }
    if (strategys[name]) {
      strategys[name]()
    }
  }

}

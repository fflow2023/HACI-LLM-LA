//HACI-LLM-LA\service\src\controller\app.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
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
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import * as path from 'path';
import * as fs from 'fs';


@UseGuards(JwtAuthGuard)
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly fileService: FileService
  ) { }


  //sql查询api
  @Roles('ADMIN')
  @Post('sql')
  async runSQL(@Body() body: { sql: string }) {
    return this.appService.executeSQL(body.sql);
  }

  // app.controller.ts中的parseFile方法
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(), // 内存存储仅用于解析接口
    limits: {
      fileSize: 100 * 1024 * 1024 // 限制100MB
    }
  }))
  //附件解析
  @Post('file/parse')
  async parseFile(@UploadedFile() file: Express.Multer.File) {
    console.log('api调用:' + 'file/parse');

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
        HttpStatus.BAD_REQUEST);
    }
  }

  // 统一的映射函数
  private mapKnowledgeBase(kb: string | undefined): 'en' | 'jp' {
    const knowledgeBaseMap: Record<string, 'en' | 'jp'> = {
      '英语': 'en',
      '英文': 'en',
      'english': 'en',
      '日语': 'jp',
      '日文': 'jp',
      'japanese': 'jp'
    };
    
    // 标准化输入：转为小写并去除空白
    const normalizedKb = kb ? kb.trim().toLowerCase() : '';
    
    // 尝试从映射表中获取值
    const mappedValue = Object.keys(knowledgeBaseMap)
      .find(key => key.toLowerCase() === normalizedKb)
      ? knowledgeBaseMap[normalizedKb]
      : null;
    
    // 返回映射结果或默认值
    return mappedValue || 'en';
  }

  //文件相关处理
  //文件上传处理
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @Post('file')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '上传文件',
    type: FileUploadDto,
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any
  ) {
    console.log('api调用: file 上传文件');
    // const originalname = file.originalname;
    const originalname = decodeURIComponent(escape(file.originalname));  //解决编码问题
    console.log('原始文件名:', originalname);

    const knowledgeBase = this.mapKnowledgeBase(body.knowledgeBase || '英语') ; // 默认为英语
    console.log('选择的知识库:', knowledgeBase);

    try {
      // 构建知识库目录路径
      const kbPath = this.appService.getKnowledgeBasePath(knowledgeBase);
      console.log('知识库目录:', kbPath);

      // 确保知识库目录存在
      this.appService.ensureDirectoryExists(kbPath);

      // 构建目标文件路径
      const destPath = path.join(kbPath, originalname);
      console.log('目标路径:', destPath);

      // 移动文件到知识库目录
      fs.renameSync(file.path, destPath);
      console.log('文件移动完成');

      // 向量化当前知识库
      await this.appService.refactorVectorStore(knowledgeBase);

      return { success: true, message: '文件上传成功' };
    } catch (error) {
      console.error('文件上传失败:', error);
      throw new HttpException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `文件上传失败: ${error.message}`
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Roles('ADMIN')
  @Get('file/query-list')
  async queryFileList(@Query('knowledgeBase') knowledgeBase: string) {
    const kb = this.mapKnowledgeBase(knowledgeBase);
    console.log('api调用: 查询文件');
    console.log('映射后的知识库:' + kb);
    return await this.appService.getFileList(kb);
  }

  @Roles('ADMIN')
  @Post('file/delete')
  @ApiBody({
    description: '删除文件',
    type: FileDeleteDto,
  })
  async deleteFile(@Body() body: any) {
    const kb = this.mapKnowledgeBase(body.knowledgeBase);
    console.log('api调用: 删除文件');
    console.log('映射后的知识库:' + kb);
    console.log('删除的文件:' + body.fileName);
    return await this.appService.deleteFile(body.fileName, kb);
  }

  //Chatglm相关
  // @Public()
  // @Post('chat')
  // @ApiBody({
  //   description: 'Glm对话',
  //   type: ChatGlmDto,
  // })
  // async chat(
  //   @Body() body: any,

  // ) {
  //   console.log('api调用:' + 'chat - Glm对话');

  //   return await this.appService.chat(body);
  // }

  // @Public()
  @Post('chatfile')
  @ApiBody({
    description: 'Glm文档问答',
    type: ChatGlmDto,
  })
  async chatfile(
    @Body() body: any,
  ) {
    console.log('api调用: chat - Glm文档问答');
    let knowledgeBase = body.knowledgeBase || '英语';
    return await this.appService.chatfile(body, this.mapKnowledgeBase(knowledgeBase));
  }

  // @Public()

  @Post('chatfileContent')
  @ApiBody({
    description: 'Glm文档问答--只获取文档内容',
    type: ChatGptDto,
  })
  async chatfileContent(
    @Body() body: any,
  ) {
    console.log('api调用: chat - Glm文档问答--只获取文档内容');
    let knowledgeBase = body.knowledgeBase || '英语';
    return await this.appService.chatfileContent(body, this.mapKnowledgeBase(knowledgeBase));
  }


  //存储聊天记录
  @Post('chat/record')
  @ApiBody({ description: '存储聊天记录', type: Object })
  async saveChatRecord(
    @CurrentUser() user: User,
    @Body() body: {
      question: string
      answer: string
      characterUsed: string
    }
  ) {
    return this.appService.logChatRecord({
      username: user.username,
      name: user.name,
      ...body
    });
  }

  // @Post('chatfileOpenai')
  // @ApiBody({
  //   description: 'Gpt文档问答',
  //   type: ChatGptDto,
  // })
  // async chatfileGPT(
  //   @Body() body: any,
  // ) {
  //   console.log('chatfile-openai', body);
  //   console.log('xxxxxxxxxxxx,test');

  //   return await this.appService.chatfileOpenAI(body);
  // }

  // @Post('chatOpenAI')
  // @ApiBody({
  //   description: 'Gpt对话',
  //   type: ChatGptDto,
  // })
  // async chatOpenAI(
  //   @Body() body,
  // ) {
  //   return await this.appService.chatOpenAI(body);

  // }

  // @Post('search')
  // @ApiBody({
  //   description: 'bing搜索',
  //   type: searchDto,
  // })
  // async bingsearch(
  //   @Body() body,
  // ) {
  //   return await this.appService.bingsearch(body);

  // }


  // @Post('set-embedding')
  // @ApiBody({
  //   description: '设置向量化文档的模型目前三选一',
  //   type: SetEmbeddingDto,
  // })
  // async setEmbedding(
  //   @Body() body,
  // ) {
  //   const { name, api_key } = body
  //   console.log('set-embedding deault: ', body);
  //   await EmbeddingManager.resetEmbedding();
  //   EmbeddingManager.setCurrentEmbedding('default');
  //   // const strategys = {
  //   //   default: async () => {
  //   //     await EmbeddingManager.resetEmbedding();
  //   //     EmbeddingManager.setCurrentEmbedding('default');
  //   //   },
  //   //   cohere: async () => {
  //   //     await EmbeddingManager.resetEmbedding({ cohereKey: api_key });
  //   //     EmbeddingManager.setCurrentEmbedding('cohere');
  //   //   },
  //   //   openai: async () => {
  //   //     await EmbeddingManager.resetEmbedding({ openAIKey: api_key });
  //   //     EmbeddingManager.setCurrentEmbedding('openai');
  //   //   }
  //   // }
  //   // if (strategys[name]) {
  //   //   strategys[name]()
  //   // }
  // }

}

//service\src\service\app.service.ts
import { Injectable } from '@nestjs/common';
import { FileService } from 'src/service/file';
import { ChatglmService } from 'src/service/chatglm'
import { ChatopenaiService } from './chatopenai';
import { BingService } from './bing';
import { DataSource } from 'typeorm';
import { ChatRecord } from '../auth/entities/record.entity';
import { EntityManager } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppService {
  getKnowledgeBasePath(knowledgeBase: string): string {
    return path.join(process.cwd(), 'knowledgeBases', knowledgeBase);
  }

  // 确保目录存在
  ensureDirectoryExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  //sql查询函数
  constructor(
    private readonly dataSource: DataSource,
    private readonly entityManager: EntityManager, // ✅ 直接注入管理器
  ) { }
  // app.service.ts
  async executeSQL(sql: string): Promise<any> {
    try {
      return await this.dataSource.query(sql);
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        sql: sql
      };
    }
  }

  async logChatRecord(recordData: {
    username: string;
    name: string;
    question: string;
    answer: string;
    characterUsed: string;
  }) {
    // ✅ 直接通过 EntityManager 操作
    const record = this.entityManager.create(ChatRecord, {
      ...recordData,
      characterUsed: recordData.characterUsed, // 确保与实体字段名一致
      answer: recordData.answer || '', // 防止空值
      createdAt: new Date()
    });
    return this.entityManager.save(ChatRecord, record);
  }

  //chatglm交互
  //自由对话
  // async chat(body) {
  //   const res = new ChatglmService
  //   return res.chat(body)
  // }

  //文档问答
  async chatfile(body: any, knowledgeBase: 'en' | 'jp') {
    const res = new ChatglmService()
    return res.chatfile(body, knowledgeBase)
  }
  
  async chatfileContent(body: any, knowledgeBase: 'en' | 'jp') {
    const res = new ChatglmService()
    return res.chatfileContent(body, knowledgeBase)
  }



  //OpenAI交互
  //文档问答
  // async chatfileOpenAI(body) {
  //   const res = new ChatopenaiService
  //   return res.chatfileOpenAI(body)

  // }
  // //自由对话
  // async chatOpenAI(body) {
  //   const res = new ChatopenaiService
  //   return res.chatOpenAI(body)
  // }
  //文档问答-只获取内容

  //文件相关处理
  //文件向量化
  async refactorVectorStore(knowledgeBase) {
    const res = new FileService
    return res.refactorVectorStore(knowledgeBase)
  }
  //获取文件列表
  async getFileList(knowledgeBase) {

    const res = new FileService
    return res.getFileList(knowledgeBase)
  }
  //删除文件
  async deleteFile(fileName,knowledgeBase) {
    const res = new FileService
    return res.deleteFile(fileName,knowledgeBase)
  }

  //bing搜索
  // async bingsearch(body) {
  //   const res = new BingService
  //   return res.search(body)
  // }
}

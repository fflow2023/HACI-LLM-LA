//service\src\service\app.service.ts
import { Injectable } from '@nestjs/common';
import { FileService } from 'src/service/file';
import { ChatglmService } from 'src/service/chatglm'
import { ChatopenaiService } from './chatopenai';
import { BingService } from './bing';
import { DataSource } from 'typeorm';
import { ChatRecord } from '../auth/entities/record.entity';
import { EntityManager } from 'typeorm';

@Injectable()
export class AppService {
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
  async chat(body) {
    const res = new ChatglmService
    return res.chat(body)
  }
  //文档问答
  async chatfile(body) {
    const res = new ChatglmService
    return res.chatfile(body)
  }
  async chatfileContent(body) {
    const res = new ChatglmService
    return res.chatfileContent(body)
  }


  //OpenAI交互
  //文档问答
  async chatfileOpenAI(body) {
    const res = new ChatopenaiService
    return res.chatfileOpenAI(body)

  }
  //自由对话
  async chatOpenAI(body) {
    const res = new ChatopenaiService
    return res.chatOpenAI(body)
  }
  //文档问答-只获取内容

  //文件相关处理
  //文件向量化
  async refactorVectorStore() {
    const res = new FileService
    return res.refactorVectorStore()
  }
  //获取文件列表
  async getFileList() {

    const res = new FileService
    return res.getFileList()
  }
  //删除文件
  async deleteFile(fileName) {
    const res = new FileService
    return res.deleteFile(fileName)
  }

  //bing搜索
  async bingsearch(body) {
    const res = new BingService
    return res.search(body)
  }
}

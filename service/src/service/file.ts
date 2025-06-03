//service\src\service\file.ts 
import * as fs from 'fs';
import * as path from 'path';
import { GlobalService } from 'src/service/global';
import { EmbeddingManager } from 'src/embeddings/embedding-manager.bak';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { DocxLoader } from "langchain/document_loaders/fs/docx";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { DirectoryLoader, UnknownHandling } from "langchain/document_loaders/fs/directory";
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { JSONLinesLoader } from "langchain/document_loaders/fs/json";
import { EPubLoader } from "langchain/document_loaders/fs/epub";
import { SRTLoader } from "langchain/document_loaders/fs/srt";
import { UnstructuredLoader } from "langchain/document_loaders/fs/unstructured";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ocrService } from './ocr.service'; // 本地的OCR服务
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { createHash } from 'crypto';
import os from 'os';
import chardet from 'chardet';
import { BaseDocumentLoader } from 'langchain/dist/document_loaders/base';
import { Document } from "langchain/document";

@Injectable()
export class FileService {
  private readonly allowedExtensions = new Set([
    'txt', 'md', 'docx', 'pdf', 'png', 'jpg', 'jpeg',
    'csv', 'pptx', 'xlsx', 'json', 'xml', 'html', 'vue', 'py', 'js', 'ts',
    'java', 'cpp', 'c', 'kt', 'rs', 'tex'
  ]);

  private readonly officeParserConfig = {
    ignoreNotes: true,          // 忽略PPT备注
    newlineDelimiter: '\n',     // 使用系统换行符
    outputErrorToConsole: false // 禁止输出内部错误
  };

  private classifyFileType(ext: string): 'office' | 'text' | 'image' {
    switch (ext) {
      case 'docx':
      case 'pptx':
      case 'xlsx':
        return 'office';
      case 'pdf':
      case 'png':
      case 'jpg':
      case 'jpeg':
        return 'image';
      case 'txt':
      case 'md':
      case 'json':
      case 'csv':
        return 'text';
      default:
        return 'text';  //其他能直接读取的都默认为text文件就行
    }
  }

  private detectFileType(buffer: Buffer, originalName: string): string {
    const fileExt = path.extname(originalName).toLowerCase().slice(1);
    if (this.allowedExtensions.has(fileExt)) {
      return fileExt;
    }
    throw new Error(`Unsupported file type: ${fileExt}`);
  }

  // async parseMemoryFile(buffer: Buffer, originalName: string) {
  async parseMemoryFile(buffer: Buffer, originalName: string): Promise<string> {
    let tempDir: string;
    try {
      const fileType = this.detectFileType(buffer, originalName);
      if (!this.allowedExtensions.has(fileType)) {
        throw new HttpException(
          { statusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE, message: `Unsupported file types: ${fileType}` },
          HttpStatus.UNSUPPORTED_MEDIA_TYPE
        );
      }

      // 创建带时间戳的唯一临时目录
      tempDir = path.join('./temp', `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
      fs.mkdirSync(tempDir, { recursive: true });

      const tempPath = path.join(tempDir, `upload.${fileType}`);
      fs.writeFileSync(tempPath, buffer);

      return await this.parseFile(tempPath, fileType);

    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { statusCode: HttpStatus.BAD_REQUEST, message: error.message || 'File processing failed' },
        HttpStatus.BAD_REQUEST
      );
    } finally {
      // 统一清理整个临时目录
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  }

  //供知识库向量化调用的解析方法
  // async parseMemoryFile1(buffer: Buffer, originalName: string): Promise<string> {
  //   let tempDir: string;
  //   try {
  //     const fileType = this.detectFileType(buffer, originalName);
  //     if (!this.allowedExtensions.has(fileType)) {
  //       throw new HttpException(
  //         { statusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE, message: `Unsupported file types: ${fileType}` },
  //         HttpStatus.UNSUPPORTED_MEDIA_TYPE
  //       );
  //     }

  //     // 创建带时间戳的唯一临时目录
  //     tempDir = path.join('./temp', `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
  //     fs.mkdirSync(tempDir, { recursive: true });

  //     const tempPath = path.join(tempDir, `upload.${fileType}`);
  //     fs.writeFileSync(tempPath, buffer);

  //     return parsedContent; 
  //   } catch (error) {
  //     if (error instanceof HttpException) throw error;
  //     throw new HttpException(
  //       { statusCode: HttpStatus.BAD_REQUEST, message: error.message || 'File processing failed' },
  //       HttpStatus.BAD_REQUEST
  //     );
  //   } finally {
  //     // 统一清理整个临时目录
  //     if (tempDir && fs.existsSync(tempDir)) {
  //       fs.rmSync(tempDir, { recursive: true, force: true });
  //     }
  //   }
  // }

  // 修改parseFile方法
  async parseFile(filePath: string, fileType: string) {
    const ext = path.extname(filePath).slice(1);
    const classifier = this.classifyFileType(ext);

    try {
      switch (classifier) {
        case 'office':
          return await this.parseOfficeFile(filePath);
        case 'text':
          return await this.parseTextualFile(filePath, ext);
        case 'image':
          return await this.parseWithOCR(filePath);
        default:
          throw new Error('Unsupported file type');
      }
    } catch (error) {
      throw new HttpException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `解析失败: ${error.message}`
      }, HttpStatus.BAD_REQUEST);
    }
  }

  private async parseOfficeFile(filePath: string): Promise<string> {
    try {
      // 添加类型断言确保Buffer类型
      const fileBuffer = fs.readFileSync(filePath) as Buffer;
      const officeParser = require('officeparser');

      // 调用officeParser核心方法
      const content = await officeParser.parseOfficeAsync(
        fileBuffer,
        this.officeParserConfig
      );

      // 后处理逻辑
      return this.postProcessContent(content, path.extname(filePath));
    } catch (error) {
      throw new Error(`Office文件解析失败: ${error.message}`);
    }
  }

  private postProcessContent(content: string, ext: string): string {
    const processors = {
      '.pptx': (text: string) =>
        text.split('\n')
          .map(line => line.replace(/^Notes:\s*/i, ''))  // 移除备注标签
          .filter(line => line.trim().length > 0)
          .join('\n'),
      '.xlsx': (text: string) =>
        text.replace(/\t/g, ' | ')  // 表格格式化
          .replace(/\n{3,}/g, '\n\n'),
      '.docx': (text: string) =>
        text.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .join('\n'),
      '.pdf': (text: string) =>
        text.replace(/\s+/g, ' ')  // 压缩多余空格
          .trim()
    };
    const processor = processors[ext.toLowerCase()] || ((t: string) => t);
    return processor(content);
  }

  // private async parseTextualFile(filePath: string, ext: string) {
  //   try {
  //     const loader = new TextLoader(filePath);
  //     const docs = await loader.load();
  //     return docs.map(doc => doc.pageContent).join('\n')

  //   } catch (error) {
  //     throw new Error(`Text file parsing failed: ${error.message}`);
  //   }
  // }

  private parseTextualFile(filePath: string, ext: string) {
    try {
      // 读取文件为Buffer
      const buffer = fs.readFileSync(filePath);

      // 尝试UTF-8解码
      let content = buffer.toString('utf-8');

      // 检查乱码
      if (/�/.test(content)) {
        // 使用iconv-lite解码为GBK
        const iconv = require('iconv-lite');
        content = iconv.decode(buffer, 'gbk');
      }

      return content;
    } catch (error) {
      throw new Error(`文件解析失败: ${error.message}`);
    }
  }

  private async parseWithOCR(filePath: string) {

    let workerInitialized = false;

    try {
      const fileType = path.extname(filePath).toLowerCase().slice(1);
      const isPDF = fileType === 'pdf';
      if (isPDF) {
        // 尝试直接提取PDF文本
        const pdfText = await this.parseOfficeFile(filePath)
        if (pdfText.trim().length > 0) return pdfText;
      }

      // 提前初始化OCR Worker
      await ocrService.start();
      workerInitialized = true;

      if (isPDF) {
        // OCR处理流程
        const imagePaths = await this.convertPDFToImages(filePath);
        const results: string[] = [];

        try {
          for (const imgPath of imagePaths) {
            const text = await ocrService.extractText(imgPath);
            results.push(text);
          }
          return '(OCR识别内容)\n' + results.join('\n');
        } finally {
          // 清理生成的图片文件
          imagePaths.forEach(imgPath => fs.rmSync(imgPath));
          const outputDir = path.join(path.dirname(filePath), 'pdf_images');
          fs.rmSync(outputDir, { recursive: true, force: true });
        }
      }

      // 单图像处理
      const singleImageText = await ocrService.extractText(filePath);
      return '(OCR识别内容)\n' + singleImageText;
    } catch (error) {
      throw new Error(`OCR 处理失败: ${error.message}`);
    } finally {
      // 关闭Worker
      if (workerInitialized) {
        await ocrService.shutdown();
      }
    }
  }

  private async convertPDFToImages(pdfPath: string): Promise<string[]> {
    let poppler;
    try {
      poppler = require('pdf-poppler');
    } catch (error) {
      throw new Error('pdf-poppler not found');
    }

    const outputDir = path.join(path.dirname(pdfPath), 'pdf_images');
    let createdFiles: string[] = [];

    try {
      fs.mkdirSync(outputDir, { recursive: true });

      const opts = {
        format: 'jpeg',
        out_dir: outputDir,
        out_prefix: path.basename(pdfPath, '.pdf'),
        page: null
      };

      await poppler.convert(pdfPath, opts);

      createdFiles = fs.readdirSync(outputDir)
        .filter(file => file.startsWith(opts.out_prefix))
        .map(file => path.join(outputDir, file))
        .sort();

      if (createdFiles.length === 0) {
        throw new Error('PDF转换未生成任何图片文件');
      }

      return createdFiles;
    } catch (error) {
      fs.existsSync(outputDir) && fs.rmSync(outputDir, { recursive: true, force: true });
      throw new Error(`PDF转图片失败: ${error.message}`);
    }
  }


  // private async parsescv(filePath: string): Promise<string> {
  //   const ext = path.extname(filePath).toLowerCase();

  //   try {
  //     if (ext === '.csv') {
  //       return this.parseCSV(filePath);
  //     }
  //     if (ext === '.xlsx') {
  //       return this.parseExcel(filePath);
  //     }
  //     throw new Error('Unsupported spreadsheet format');
  //   } catch (error) {
  //     throw new Error(`表格文件解析失败: ${error.message}`);
  //   }
  // }

  // private async parseCSV(filePath: string): Promise<string> {
  //   const content = fs.readFileSync(filePath, 'utf-8');
  //   const parse = require('csv-parse/sync').parse;

  //   const records = parse(content, {
  //     columns: true,
  //     skip_empty_lines: true,
  //     trim: true
  //   });

  //   return records
  //     .map(row => Object.entries(row)
  //       .map(([key, value]) => `${key}: ${value}`)
  //       .join(' | ')
  //     )
  //     .join('\n');
  // }


  // private async parseExcel(filePath: string): Promise<string> {
  //   const xlsx = require('xlsx');
  //   const workbook = xlsx.readFile(filePath);

  //   return workbook.SheetNames.map(sheetName => {
  //     const sheet = workbook.Sheets[sheetName];
  //     const range = xlsx.utils.decode_range(sheet['!ref']);

  //     const rows = [];
  //     for (let rowNum = range.s.r; rowNum <= range.e.r; rowNum++) {
  //       const row = [];
  //       for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
  //         const cellAddress = xlsx.utils.encode_cell({ r: rowNum, c: colNum });
  //         const cell = sheet[cellAddress];
  //         row.push(cell ? cell.v : '');
  //       }
  //       rows.push(row.join('\t'));
  //     }

  //     return `工作表: ${sheetName}\n${rows.join('\n')}`;
  //   }).join('\n\n');
  // }


  // private async parseppt(filePath: string): Promise<string> {
  //   const ext = path.extname(filePath).toLowerCase();

  //   try {
  //     if (ext === '.pptx') {
  //       return this.parsePPTX(filePath);
  //     }
  //     throw new Error('Unsupported ppt format');
  //   } catch (error) {
  //     throw new Error(`ppt解析失败: ${error.message}`);
  //   }
  // }

  // private async parsePPTX(filePath: string): Promise<string> {
  //   try {
  //     const PPTX = require('nodejs-pptx');
  //     const composer = new PPTX.Composer();

  //     // 1. 必须显式加载文件
  //     await composer.load(filePath);

  //     let slidesContent: string[] = [];

  //     // 2. 使用 compose() 的正确方式
  //     await composer.compose(async pres => {
  //       // 3. 通过 getSlideCount() 获取总页数
  //       const slideCount = pres.getSlideCount();

  //       // 4. 从1开始遍历 (base-1)
  //       for (let i = 1; i <= slideCount; i++) {
  //         const slide = pres.getSlide(i);
  //         let slideTexts: string[] = [];

  //         // 5. 通过专用API获取文本框
  //         const texts = slide.getTexts();
  //         for (const text of texts) {
  //           slideTexts.push(text.value().trim());
  //         }

  //         // 6. 获取形状中的文字
  //         const shapes = slide.getShapes();
  //         for (const shape of shapes) {
  //           if (shape.hasText()) {
  //             slideTexts.push(shape.getText().value().trim());
  //           }
  //         }

  //         slidesContent.push(`=== 幻灯片 ${i} ===\n${slideTexts.join('\n')}\n`);
  //       }
  //     });
  //     return "(ppt解析内容)\n" + slidesContent.join('\n');
  //   } catch (error) {
  //     throw new Error(`PPTX解析失败: ${error.message}`);
  //   }
  // }

  // private async parseLegacyPPT(filePath: string): Promise<string> {
  //   // 注意：PPT二进制文件需要特殊处理，这里演示调用外部工具
  //   try {
  //     const { execSync } = require('child_process');
  //     const outputPath = path.join(path.dirname(filePath), 'temp.pptx');

  //     // 使用LibreOffice转换（需要系统安装）
  //     execSync(`soffice --convert-to pptx --outdir ${path.dirname(filePath)} ${filePath}`);
  //     const result = await this.parsePPTX(outputPath);
  //     fs.unlinkSync(outputPath);
  //     return result;
  //   } catch (error) {
  //     throw new Error('PPT文件解析需要安装LibreOffice');
  //   }
  // }


  // 上传文件向量化
  async refactorVectorStore() {
    console.log('【调试】开始重建向量存储库...');
    
    try {
      // 1. 加载文件上传目录内容
      const directoryPath = './fileUpload';
      const files = fs.readdirSync(directoryPath);
      console.log(`【调试】发现 ${files.length} 个文件在 ${directoryPath} 目录中：`, files);
      
      if (files.length === 0) {
        console.warn('【警告】没有找到任何文件！请检查 fileUpload 目录');
      }
      
      // 2. 初始化 DirectoryLoader
     const loader = new DirectoryLoader(
        "./fileUpload",
        {
          ".pdf": (path) => new PDFLoader(path),
          ".csv": (path) => new CSVLoader(path),       // 新增 CSV 支持
          ".docx": (path) => new DocxLoader(path),
          ".epub": (path) => new EPubLoader(path),            // 新增 EPUB 支持
          ".srt": (path) => new SRTLoader(path),              // 新增 SRT 字幕支持
          ".jsonl": (path) => new JSONLinesLoader(path, "/html"), // 新增 JSONL 支持
          // 特殊格式专用loader
  
          // 纯文本格式（共20种直接列出）
          ".txt": (path) => new TextLoader(path),
          ".md": (path) => new TextLoader(path),
          ".py": (path) => new TextLoader(path),
          ".js": (path) => new TextLoader(path),
          ".ts": (path) => new TextLoader(path),
          ".java": (path) => new TextLoader(path),
          ".cpp": (path) => new TextLoader(path),
          ".c": (path) => new TextLoader(path),
          ".kt": (path) => new TextLoader(path),
          ".rs": (path) => new TextLoader(path),
          ".tex": (path) => new TextLoader(path),
          ".vue": (path) => new TextLoader(path),
          ".html": (path) => new TextLoader(path),
          ".xml": (path) => new TextLoader(path),
          ".json": (path) => new TextLoader(path),
          ".css": (path) => new TextLoader(path),
          ".sh": (path) => new TextLoader(path),
          ".yaml": (path) => new TextLoader(path),
          ".yml": (path) => new TextLoader(path),
          ".conf": (path) => new TextLoader(path),
          ".": (path) => new TextLoader(path)  //DirectoryLoader 的原生实现只做精确匹配，没有通配符逻辑 这个是无后缀名的文件
        }
      );
      
      // 3. 加载并解析文件
      console.log('【调试】开始加载和解析文件...');
      const rawDocuments = await loader.load();
      console.log(`【调试】成功加载 ${rawDocuments.length} 个文档`);
      
      // 记录每个文件的处理结果
      const fileStats = {};
      rawDocuments.forEach((doc, index) => {
        const sourceFile = doc.metadata.source;
        const charCount = doc.pageContent.length;
        
        if (!fileStats[sourceFile]) {
          fileStats[sourceFile] = { charCount: 0, chunks: 0 };
        }
        fileStats[sourceFile].charCount += charCount;
        
        // 记录文档片段的前100字符
        console.log(`【调试】文档 ${index + 1} (来源: ${sourceFile}) - ${charCount} 字符`);
        console.log(`    文本预览: ${doc.pageContent.substring(0, 100)}${charCount > 100 ? '...' : ''}`);
      });
      
      // 4. 文本分割
      console.log('【调试】开始文本分割...');
      const textsplitter = new RecursiveCharacterTextSplitter({
        separators: ["\n\n", "\n", "。", "！", "？"],
        chunkSize: 400,
        chunkOverlap: 100,
      });
      
      const docs = await textsplitter.splitDocuments(rawDocuments);
      console.log(`【调试】分割后共生成 ${docs.length} 个文本块`);
      
      // 分析文本块分布
      const chunkSizes = docs.map(doc => doc.pageContent.length);
      const avgSize = Math.round(chunkSizes.reduce((a, b) => a + b, 0) / chunkSizes.length);
      const minSize = Math.min(...chunkSizes);
      const maxSize = Math.max(...chunkSizes);
      
      console.log('【调试】文本块统计:');
      console.log(`  - 最小块大小: ${minSize} 字符`);
      console.log(`  - 最大块大小: ${maxSize} 字符`);
      console.log(`  - 平均块大小: ${avgSize} 字符`);
      
      // 记录分割结果样例
      console.log('【调试】前 3 个文本块样例:');
      docs.slice(0, 3).forEach((doc, i) => {
        console.log(`  --- 块 ${i + 1} (${doc.pageContent.length} 字符) ---`);
        console.log(`     元数据: ${JSON.stringify(doc.metadata)}`);
        console.log(`     内容: ${doc.pageContent.substring(0, 150)}${doc.pageContent.length > 150 ? '...' : ''}`);
      });
      
      // 5. 获取嵌入模型
      console.log('【调试】获取嵌入模型...');
      const embeddingModel = EmbeddingManager.getCurrentEmbedding();
      console.log(`【调试】当前使用的嵌入模型: ${embeddingModel.constructor.name}`);
      
      // 6. 创建向量存储
      console.log('【调试】开始创建向量存储...');
      const vectorStore = await MemoryVectorStore.fromDocuments(
        docs,
        embeddingModel
      );
      
      // 7. 验证向量存储
      console.log('【调试】向量存储创建完成，正在验证...');
      
      // 测试查询
      const testQuery = '测试查询';
      const testResults = await vectorStore.similaritySearch(testQuery, 1);
      
      console.log('【调试】验证查询结果:');
      if (testResults.length > 0) {
        console.log(`  - 获取 ${testResults.length} 个结果`);
        console.log(`  - 第一个结果得分: ${testResults[0]?.metadata?.score || 'N/A'}`);
        console.log(`  - 来源文件: ${testResults[0]?.metadata?.source || '未知'}`);
        console.log(`  - 内容预览: ${testResults[0]?.pageContent?.substring(0, 100) || '无内容'}...`);
      } else {
        console.warn('【警告】测试查询返回空结果！向量库可能为空或未正确索引');
      }
      
      // 8. 存储在全局变量
      GlobalService.globalVar = vectorStore;
      console.log('【调试】向量存储已存储在 GlobalService.globalVar');
      
      // 9. 汇总报告
      console.log('【调试】向量库构建完成汇总报告:');
      console.log(`  - 加载文件数: ${Object.keys(fileStats).length}`);
      console.log(`  - 原始文本字符数: ${rawDocuments.reduce((sum, doc) => sum + doc.pageContent.length, 0)}`);
      console.log(`  - 生成文本块数: ${docs.length}`);
      console.log(`  - 向量库状态: ${vectorStore?.memoryVectors?.length || 0} 个向量`);
      
      return { success: true, stats: { files: fileStats, chunks: docs.length } };
    } catch (error) {
      console.error('【错误】向量库重建过程中发生错误:', error);
      throw error; // 重新抛出以便调用方处理
    }
  }


  //获取本地文件列表
  async getFileList() {
    const directoryPath = './fileUpload';
    const files = fs.readdirSync(directoryPath);
    return files;
  }

  //删除文件
  async deleteFile(fileName) {
    const directoryPath = './fileUpload';
    fs.rmSync(`${directoryPath}/${fileName}`);
    this.refactorVectorStore();
  }
}

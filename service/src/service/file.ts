//service\src\service\file.ts 
import * as fs from 'fs';
import * as path from 'path';
import { GlobalService } from 'src/service/global';
import { EmbeddingManager } from 'src/embeddings/embedding-manager.bak';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { DocxLoader } from "langchain/document_loaders/fs/docx";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ocrService } from './ocr.service'; // 本地的OCR服务
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class FileService {
  private readonly allowedExtensions = new Set(['txt', 'md', 'docx', 'pdf', 'png', 'jpg', 'jpeg']);

  private detectFileType(buffer: Buffer, originalName: string): string {
    const fileExt = path.extname(originalName).toLowerCase().slice(1);
    if (this.allowedExtensions.has(fileExt)) {
      return fileExt;
    }
    throw new Error(`Unsupported file type: ${fileExt}`);
  }

  async parseMemoryFile(buffer: Buffer, originalName: string) {
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

  async parseFile(filePath: string, fileType: string) {
    if (!fs.existsSync(filePath)) {
      throw new HttpException(
        { statusCode: HttpStatus.NOT_FOUND, message: `File not found: ${filePath}` },
        HttpStatus.NOT_FOUND
      );
    }

    const supportedText = new Set(['txt', 'md', 'markdown', 'docx']);
    const supportedOCR = new Set(['pdf', 'png', 'jpg', 'jpeg']);

    try {
      if (supportedText.has(fileType)) {
        return await this.parseTextualFile(filePath, fileType);
      } else if (supportedOCR.has(fileType)) {
        return await this.parseWithOCR(filePath);
      }
      throw new HttpException(
        { statusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE, message: `Unsupported file type: ${fileType}` },
        HttpStatus.UNSUPPORTED_MEDIA_TYPE
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: `File parsing failed: ${error.message}` },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private async parseTextualFile(filePath: string, ext: string) {
    try {
      if (ext === 'docx') {
        // 使用专业docx解析库+自定义处理
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({
          path: filePath,
          // 配置转换参数
          includeHiddenText: false,  // 排除隐藏文本
          includeFootnotes: false,   // 排除脚注
          preserveLineBreaks: false  // 不保留软换行
        });
        // 自定义段落处理
        return result.value
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0) // 移除空行
          .join('\n');
      }
      const loader = new TextLoader(filePath);
      const docs = await loader.load();
      return docs.map(doc => doc.pageContent).join('\n')

    } catch (error) {
      throw new Error(`Text file parsing failed: ${error.message}`);
    }
  }

  // private async parseWithOCR(filePath: string) {
  //   try {
  //     const fileType = path.extname(filePath).toLowerCase().slice(1);
  //     const isPDF = fileType === 'pdf';
  
  //     if (isPDF) {
  //       try {
  //         const pdfText = await this.extractPDFText(filePath);
  //         if (pdfText.trim().length > 0) return pdfText;
  //       } catch (error) {
  //         console.log(`PDF 直接解析失败，启动 OCR 回退: ${error.message}`);
  //       }
  //     }
  
  //     if (isPDF) {
  //       const imagePaths = await this.convertPDFToImages(filePath);
  //       const results: string[] = [];
        
  //       for (const imgPath of imagePaths) {
  //         try {
  //           const text = await ocrService.extractText(imgPath); // 单页处理
  //           results.push(text);
  //         } catch (error) {
  //           console.error(`页面 ${path.basename(imgPath)} 识别失败:`, error);
  //           throw error; // 任一页面失败则整体失败
  //         }
  //       }
        
  //       return results.join('\n');
  //     }
  
  //     return await ocrService.extractText(filePath);
  //   } catch (error) {
  //     throw new Error(`OCR 处理失败: ${error.message}`);
  //   }
  // }
  private async parseWithOCR(filePath: string) {
    let workerInitialized = false;
    
    try {
      const fileType = path.extname(filePath).toLowerCase().slice(1);
      const isPDF = fileType === 'pdf';
  
      // 提前初始化OCR Worker
      await ocrService.start();
      workerInitialized = true;
  
      if (isPDF) {
        // 尝试直接提取PDF文本
        try {
          const pdfText = await this.extractPDFText(filePath);
          if (pdfText.trim().length > 0) return pdfText;
        } catch (error) {
          console.log(`PDF 直接解析失败，启动 OCR 回退: ${error.message}`);
        }
  
        // OCR处理流程
        const imagePaths = await this.convertPDFToImages(filePath);
        const results: string[] = [];
        
        try {
          for (const imgPath of imagePaths) {
            const text = await ocrService.extractText(imgPath);
            results.push(text);
          }
          return results.join('\n');
        } finally {
          // 清理生成的图片文件
          imagePaths.forEach(imgPath => fs.rmSync(imgPath));
          const outputDir = path.join(path.dirname(filePath), 'pdf_images');
          fs.rmSync(outputDir, { recursive: true, force: true });
        }
      }
  
      // 单图像处理
      return await ocrService.extractText(filePath);
    } catch (error) {
      throw new Error(`OCR 处理失败: ${error.message}`);
    } finally {
      // 关闭Worker
      if (workerInitialized) {
        await ocrService.shutdown();
      }
    }
  }

  private async extractPDFText(filePath: string): Promise<string> {
    try {
      const loader = new PDFLoader(filePath);
      const docs = await loader.load();

      // 后处理文本
      return docs.map(doc => {
        return doc.pageContent
          .replace(/\s+/g, ' ')  // 将所有连续空白字符替换为单个空格
          .trim();
      }).join(' ');
    }
    catch (error) {
      throw new Error(`PDF text extraction failed: ${error.message}`);
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

  // private async convertPDFToImages(pdfPath: string): Promise<string[]> {
  //   const poppler = require('pdf-poppler');
  //   const outputDir = path.join(path.dirname(pdfPath), 'pdf_images');

  //   try {
  //     fs.mkdirSync(outputDir, { recursive: true });

  //     const opts = {
  //       format: 'jpeg',
  //       out_dir: outputDir,
  //       out_prefix: path.basename(pdfPath, '.pdf'),
  //       page: null
  //     };

  //     await poppler.convert(pdfPath, opts);

  //     return fs.readdirSync(outputDir)
  //       .filter(file => file.startsWith(opts.out_prefix))
  //       .map(file => path.join(outputDir, file))
  //       .sort();
  //   } catch (error) {
  //     // 转换失败时清理生成目录
  //     fs.existsSync(outputDir) && fs.rmSync(outputDir, { recursive: true, force: true });
  //     throw new Error(`PDF to image conversion failed: ${error.message}`);
  //   }
  // }

  //上传文件向量化
  async refactorVectorStore() {
    const loader = new DirectoryLoader(
      "./fileUpload",
      {
        //".json": (path) => new JSONLoader(path, "/texts"),
        //".jsonl": (path) => new JSONLinesLoader(path, "/html"),
        ".txt": (path) => new TextLoader(path),
        ".docx": (path) => new DocxLoader(path),
        ".pdf": (path) => new PDFLoader(path),
        //".csv": (path) => new CSVLoader(path, "text"),
      }
    );
    // Split the docs into chunks
    // 文本切割,将文档拆分为块
    const textsplitter = new RecursiveCharacterTextSplitter({
      separators: ["\n\n", "\n", "。", "！", "？"],
      chunkSize: 400,
      chunkOverlap: 100,
    })
    const docs = await loader.loadAndSplit(textsplitter);
    // Load the docs into the vector store
    // 加载向量存储库 
    const vectorStore = await MemoryVectorStore.fromDocuments(
      docs,
      EmbeddingManager.getCurrentEmbedding()
    );
    GlobalService.globalVar = vectorStore
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
  }
}

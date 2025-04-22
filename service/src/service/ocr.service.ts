// service\src\service\ocr.service.ts
import { createWorker, OEM, Worker } from 'tesseract.js';
import { promises as fs } from 'fs';

class OCRService {
  private worker: Worker | null = null;

  async start() {
    if (!this.worker) {
      try {
        this.worker = await createWorker('chi_sim', OEM.DEFAULT, {
          cachePath: './traineddata',
          cacheMethod: 'none',
          logger: (info) => console.log(`[Tesseract] ${info.status}: ${info.progress}`),
        });
      } catch (error) {
        console.error('Worker 初始化失败:', error);
        throw error;
      }
    }
  }

  async shutdown() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  async extractText(filePath: string): Promise<string> {
    if (!this.worker) {
      throw new Error('OCR Worker 未初始化');
    }

    try {
      const imageBuffer = await fs.readFile(filePath);
      const { data: { text } } = await this.worker.recognize(imageBuffer, {
        rotateAuto: true,
      });
      console.log(`[DEBUG]OCR rusult : ${text?.trim()} `);
      return text?.trim() || '';
    } catch (error) {
      console.error(`OCR 处理失败: ${error.message}`);
      throw new Error(`OCR 处理失败: ${error.message}`);
    }
  }
}

export const ocrService = new OCRService();
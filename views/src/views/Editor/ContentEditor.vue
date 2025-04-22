<template>
  <div class="container">
    <div class="toolbar">
      <button class="toolbar-btn" @click="importContent">
        <span class="icon"><i class="fas fa-file-import"></i></span>
        <span class="btn-text">导入</span>
      </button>

      <div class="export-dropdown">
        <button class="toolbar-btn" @click="toggleExportOptions">
          <span class="icon"><i class="fas fa-file-export"></i></span>
          <span class="btn-text">导出</span>
          <span class="dropdown-icon"><i class="fas fa-chevron-down"></i></span>
        </button>
        <div v-show="showExportOptions" class="export-options">
          <button @click="exportAsHTML">
            <i class="fab fa-html5"></i> HTML
          </button>
          <button @click="exportAsPDF">
            <i class="fas fa-file-pdf"></i> PDF
          </button>
          <button @click="exportAsWord">
            <i class="fas fa-file-word"></i> Word
          </button>
        </div>
      </div>

      <button class="toolbar-btn" @click="goBack">
        <span class="icon"><i class="fas fa-arrow-left"></i></span>
        <span class="btn-text">返回</span>
      </button>

      <input type="file" ref="fileInput" style="display: none">
    </div>

    <jodit-editor ref="joditInstance" v-model="content" :config="editorConfig" />
  </div>
</template>

<script>
import { JoditEditor } from 'jodit-vue'
import 'jodit/es2021/jodit.min.css'
import { router } from '@/router'
import { useEditorStore } from '@/store/modules/editor'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel, // 新增
  AlignmentType,
  WidthType
} from "docx";
import { saveAs } from 'file-saver';
import * as cheerio from 'cheerio'; // 需要先安装 npm install cheerio

// 样式配置中心
const styleConfig = {
  h1: { size: 36, bold: true, color: '000000', spacing: { before: 600, after: 400 } },
  h2: { size: 28, color: '444444', italic: true },
  h3: { size: 24, bold: true, underline: true },
  dateline: { size: 14, color: '666666' },
  blockquote: { color: '2F5496', indent: { left: 720 }, border: { left: { color: '2F5496', space: 4 } } },
  reporterInfo: { alignment: AlignmentType.RIGHT }
};

export default {
  name: 'App',
  components: { JoditEditor },
  data() {
    const editorStore = useEditorStore()
    return {
      showExportOptions: false, // 新增响应式状态
      content: editorStore.generatedHTML || '<!-- 默认HTML内容 -->',
      editorConfig: {
        height: 'calc(100vh - 120px)', // 动态计算高度
        iframe: true, // 关键配置：启用iframe模式以正确渲染HTML
        allowTags: ['*'], // 允许所有HTML标签
        removeEmptyElements: false, // 保留空标签（如<!-- slots -->）
        prototype: {
          controls: {
            print: {
              exec: (editor) => {
                const iframe = editor.create.element('iframe');
                const myWindow = iframe.contentWindow;
                if (myWindow) {
                  style.innerHTML = `
                          @media print {
                              @page {
                                margin-top: 0;
                                margin-bottom: 0;
                              }
                      body {
                        word-break: break-word;
                        -webkit-print-color-adjust: exact;
                        margin: 1.6cm;
                      }
                    }
                  `;
                  myWindow.document.head.appendChild(style);
                  console.log(myWindow.document.head)
                  myWindow.focus();
                  myWindow.print();
                }
              }
            }
          },
        },
        events: {
          afterInit: (editor) => {
            // 初始化后强制设置内容
            editor.value = this.content
            console.log('编辑器已完成初始化');
            this.editorReady = true;
          }
        }
      }
    }
  },
  mounted() {
    // 从Pinia获取生成的内容
    const editorStore = useEditorStore()
    this.content = editorStore.generatedHTML
    this.$refs.fileInput.addEventListener('change', this.handleFileSelect)
  },
  beforeUnmount() {
    this.$refs.fileInput.removeEventListener('change', this.handleFileSelect)
  },
  methods: {
    toggleExportOptions() {
      this.showExportOptions = !this.showExportOptions
    },

    // HTML导出（原导出功能）
    exportAsHTML() {
      this.showExportOptions = false
      if (!this.content) {
        alert('编辑器内容为空！')
        return
      }

      const blob = new Blob([this.content], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `export-${new Date().toISOString().slice(0, 10)}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },

    exportAsPDF() {
      this.showExportOptions = false;

      // 直接调用Jodit打印功能
      try {
        const jodit = this.$refs.joditInstance;
        if (jodit && jodit.editor) {
          // 执行编辑器内置打印命令
          jodit.editor.execCommand('print');
        }
      } catch (error) {
        console.error('打印失败:', error);
      }
    },

    handleSpecialElements($section) {
      const elements = [];

      // 处理直接引语
      $section.find('blockquote').each((i, el) => {
        const $el = $(el);
        elements.push(
          new TextRun({
            text: $el.text().replace(/"/g, ''), // 去除引号
            italics: true,
            color: '2F5496',
            indent: { left: 720 }
          })
        );
      });

      return elements;
    },

    parseTextContent($elem) {
      return $elem.clone()    // 克隆元素避免修改原DOM
        .children()           // 获取所有子元素
        .map((i, el) => $(el).text()) // 提取纯文本
        .get()
        .join('\n');          // 用换行符连接
    },

    // 处理段落级样式（对齐/缩进等）
    parseParagraphStyles($elem) {
      const styles = {};

      // 文本对齐
      const alignMap = {
        left: AlignmentType.LEFT,
        center: AlignmentType.CENTER,
        right: AlignmentType.RIGHT,
        justify: AlignmentType.JUSTIFIED
      };
      styles.alignment = alignMap[$elem.css('text-align')] || AlignmentType.LEFT;

      // 首行缩进（处理2em缩进）
      if ($elem.css('text-indent') === '2em') {
        styles.indent = { firstLine: 720 }; // 720=2个中文字符缩进
      }

      return styles;
    },

    // 保留原有的 parseInlineStyles 方法
    parseInlineStyles($elem) {
      // ...原有内联样式处理逻辑
    },

    parseInlineStyles($elem) {
      const styles = {};

      // 解析颜色
      const color = $elem.css('color');
      if (color) {
        styles.color = this.cssColorToHex(color);
      }

      // 解析字体大小
      const fontSize = $elem.css('font-size');
      if (fontSize) {
        styles.size = this.convertFontSize(fontSize);
      }

      // 解析粗体
      styles.bold = $elem.css('font-weight') >= 600;

      return styles;
    },

    cssColorToHex(color) {
      // 实现颜色格式转换逻辑
      const rgbMatch = color.match(/rgb$(\d+),\s*(\d+),\s*(\d+)$/);
      if (rgbMatch) {
        return `${this.toHex(rgbMatch[1])}${this.toHex(rgbMatch[2])}${this.toHex(rgbMatch[3])}`;
      }
      return color.replace('#', '');
    },

    toHex(num) {
      return parseInt(num).toString(16).padStart(2, '0');
    },

    convertFontSize(size) {
      // 将12px转换为24（1pt=2单位）
      return parseInt(size) * 2;
    },

    handleDefinitionList($dl) {
      return $dl.children().map((i, child) => {
        const $child = $(child);
        return $child.is('dt')
          ? new Paragraph({ text: $child.text(), bold: true })
          : new Paragraph({ text: $child.text(), indent: { left: 720 } });
      }).get();
    },

    // 导出为Word
    async exportAsWord() {
      const $ = cheerio.load(this.content);
      const doc = new Document({
        sections: [{
          properties: { page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } } },
          children: [
            // 处理头部
            this.createHeader($),
            // 处理正文内容
            ...this.createContent($),
            // 处理页脚
            this.createFooter($)
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, '新闻稿.docx');
    },

    createHeader($) {
      return new Paragraph({
        children: [
          new TextRun({
            text: $('.news-header h1').text(), // 仅提取文本
            heading: HeadingLevel.HEADING_1,
            size: 36,
            bold: true
          }),
          new TextRun({
            text: '\n' + $('.news-header h2').text(), // 提取文本
            break: 1,
            size: 28,
            color: '444444'
          })
        ]
      });
    },

    createContent($) {
      return $('.news-content section').map((i, section) => {
        const $section = $(section);
        const paragraph = new Paragraph({
          ...this.parseParagraphStyles($section.find('p')), // 段落样式
          children: [
            new TextRun({
              text: $section.find('h3').text(),
              ...this.parseInlineStyles($section.find('h3')) // 标题样式
            }),
            new TextRun({
              text: '\n' + $section.find('p').not('blockquote p').text(),
              break: 1,
              ...this.parseInlineStyles($section.find('p')) // 正文样式
            }),
            ...this.handleSpecialElements($section, $)
          ]
        });
        return paragraph;
      }).get();
    },

    handleSpecialElements($section, $) {
      const elements = [];
      // 处理引用块
      $section.find('blockquote').each((i, el) => {
        elements.push(new TextRun({
          text: '\n' + $(el).text(),
          break: 1,
          ...styleConfig.blockquote,
          ...this.parseInlineStyles($(el))
        }));
      });
      return elements;
    },

    createFooter($) {
      try {
        const $container = $('.news-footer');
        if (!$container.length) return null;

        const $info = $container.find('.reporter-info p');
        const content = $info.length
          ? $info.html()
            .replace(/<br>/g, '\n')
            .replace(/<\/?strong>/g, '') // 移除加粗标签
          : '暂无联系信息';

        return new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun(content || '')]
        });
      } catch (e) {
        console.error('页脚处理失败:', e);
        return null; // 防止整个导出失败
      }
    },

    // 样式解析方法
    parseInlineStyles($elem) {
      if (!$elem || !$elem.length) return {}; // 防止空元素
      const styles = {};
      const colorMatch = $elem.css('color')?.match(/rgb$(\d+),\s*(\d+),\s*(\d+)$/);
      if (colorMatch) {
        styles.color = this.rgbToHex(colorMatch[1], colorMatch[2], colorMatch[3]);
      }
      if ($elem.css('font-weight') === 'bold') styles.bold = true;
      if ($elem.css('font-style') === 'italic') styles.italics = true;
      return styles;
    },

    rgbToHex(r, g, b) {
      return [r, g, b].map(x => (+x).toString(16).padStart(2, '0')).join('').toUpperCase();
    },

    importContent() {
      this.$refs.fileInput.click()
    },
    handleFileSelect(event) {
      const file = event.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          this.content = e.target.result
          event.target.value = ''
        }
        reader.readAsText(file)
      }
    },
    goBack() {
      router.push('/')
    }
  }
}
</script>

<style scoped>
/* 基础样式 */
.container {
  max-width: 90%;
  height: 100vh;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.toolbar {
  margin-bottom: 0;
  flex-shrink: 0;
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px;
  background-color: #f6f7f9; /* 与Jodit工具栏一致的灰色背景 */
  border-radius: 8px 8px 0 0; /* 只保留顶部圆角 */
  box-shadow: none; /* 移除阴影 */
  border-bottom: 1px solid #e1e5eb; /* 添加底部边框 */
}

/* 添加按钮分隔线 */
.toolbar-btn:not(:last-child)::after {
  content: "";
  display: inline-block;
  width: 1px;
  height: 16px;
  background-color: #e1e5eb;
  margin-left: 12px;
}

/* 调整按钮间距 */
.toolbar-btn {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 按钮样式 */
.toolbar-btn i {
  font-size: 14px;
  width: 16px;
  text-align: center;
}

/* 悬停状态 */
.toolbar-btn:hover {
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%); /* 悬停背景渐变 */
  color: white !important; /* 悬停文字白色 */
  border-color: transparent; /* 隐藏边框 */
}

/* 确保图标颜色也跟随变化 */
.toolbar-btn:hover .icon,
.toolbar-btn:hover .dropdown-icon,
.toolbar-btn:hover .btn-text,
.toolbar-btn:hover i {
  color: white !important;
}

/* 图标默认样式 */
.icon,
.dropdown-icon,
.btn-text,
.toolbar-btn i {
  color: inherit;
  transition: color 0.3s ease;
}

.toolbar-btn:active {
  transform: translateY(0);
}

.icon {
  font-size: 14px;
}

.dropdown-icon {
  font-size: 10px;
  margin-left: 4px;
}

.btn-text {
  margin-left: 4px;
}

/* 下拉菜单样式 */
.export-dropdown {
  position: relative;
  display: inline-block;
}

.export-options {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  background: white;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  margin-top: 8px;
  min-width: 150px;
  overflow: hidden;
  animation: fadeIn 0.2s ease-out;
  display: flex; /* 新增 */
  flex-direction: column; /* 新增 - 使子元素垂直排列 */
}

.export-options button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%; /* 确保宽度填满容器 */
  margin: 0;
  padding: 10px 16px;
  background: white;
  color: #333;
  border: none;
  text-align: left;
  transition: all 0.2s;
  font-size: 14px;
  border-bottom: 1px solid #f0f0f0; /* 添加分隔线 */
}

/* 移除最后一个按钮的分隔线 */
.export-options button:last-child {
  border-bottom: none;
}

.export-options button:hover {
  background: #f5f7fa;
  color: #2575fc;
}

.export-options button i {
  width: 18px;
  text-align: center;
}

/* 编辑器样式 */
:deep(.jodit-container) {
  border: 1px solid #e1e5eb;
  border-top: none; /* 移除顶部边框 */
  border-radius: 0 0 8px 8px; /* 只保留底部圆角 */
  height: 100% !important;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

:deep(.jodit-workplace) {
  height: calc(100% - 40px) !important;
  border-radius: 0 0 8px 8px;
}

:deep(.jodit-toolbar__box) {
  border-radius: 8px 8px 0 0 !important;
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .toolbar {
    flex-wrap: wrap;
    padding: 8px;
  }

  .toolbar-btn {
    padding: 8px 12px;
    font-size: 12px;
  }

  .btn-text {
    display: none;
  }

  .icon {
    margin-right: 0;
  }
}
</style>
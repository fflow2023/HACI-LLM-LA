import { defineStore } from 'pinia'

// 类型定义
interface TemplateDraft {
  message: string
  prompt: string
}

export const useEditorStore = defineStore('editor', {
  state: () => ({
    draft: {} as TemplateDraft,
    generatedHTML: ''
  }),
  actions: {
    // 设置草稿
    setDraft(message: string, prompt: string) {
      this.draft = { message, prompt }
    },

    setGeneratedContent(html: string) {
      // 主正则匹配
      const codeBlockRegex = /```html([\s\S]*?)```/;
      const matches = codeBlockRegex.exec(html);
    
      if (matches?.[1]) {
        this.generatedHTML = matches[1]
          .replace(/^\n+/, '')
          .replace(/\n+$/, '')
          .trim();
      } else {
        // 备用方案：查找第一个代码块
        const startIdx = html.indexOf('```');
        if (startIdx !== -1) {
          const endIdx = html.indexOf('```', startIdx + 3);
          if (endIdx !== -1) {
            this.generatedHTML = html
              .slice(startIdx + 3, endIdx)
              .trim();
          } else {
            // 无闭合标记，使用全文
            this.generatedHTML = html;
          }
        } else {
          // 无代码块标记，直接使用
          this.generatedHTML = html;
        }
      }
    },

    // 清空状态
    clearDraft() {
      this.draft = { message: '', prompt: '' }
    }
  },
  getters: {
    // 获取组合后的提示词
    fullPrompt: (state) => {
      return `${state.draft.message}\n\n${state.draft.prompt}`
    }
  }
})
<template>
  <div class="generator-container">
    <!-- 状态提示与操作区域 -->
    <div class="status-container">
      <div v-if="loading" class="loading-status">
        <span class="loader"></span>
        正在使用【{{ modelName }}】生成内容，请稍候...
      </div>
      
      <div v-else-if="showConfirm" class="action-buttons">
        <button class="confirm-button" @click="handleConfirmation">
          <span class="button-icon">✅</span>
          内容确认完成，前往编辑页面
          <span class="button-icon">✅</span>
        </button>
      </div>
    </div>

    <!-- 流式内容展示区 -->
    <div 
      ref="streamContainer"
      class="stream-container"
      @scroll="handleScroll"
    >
      <div class="stream-content" v-html="processedContent" />
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      <span class="error-icon">⚠️</span>
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useEditorStore } from '@/store/modules/editor'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// 类型定义
type StreamSegment = {
  type: 'reasoning' | 'answer'
  content: string
}

const modelName = import.meta.env.VITE_SILICONFLOW_MODEL
const editorStore = useEditorStore()
const router = useRouter()

// 响应式状态
const loading = ref(true)
const error = ref('')
const streamSegments = ref<StreamSegment[]>([])
const streamContainer = ref<HTMLElement | null>(null)
const shouldAutoScroll = ref(true)
const showConfirm = ref(false)

type MaxTokensBase = {
	[key: string]: number;
  };

let max_tokens_base: MaxTokensBase = {
	"deepseek-ai/DeepSeek-V3": 4096,
	"Qwen/Qwen2.5-7B-Instruct": 4096,
	"deepseek-ai/DeepSeek-R1": 8192,
	"Qwen/QwQ-32B": 8192,
}

// 观察生成状态变化
watch([loading, error], ([isLoading, hasError]) => {
  showConfirm.value = !isLoading && !hasError && streamSegments.value.length > 0
})

// 确认处理
const handleConfirmation = async () => {
  try {
    const fullContent = streamSegments.value
      .filter(s => s.type === 'answer')
      .map(s => s.content)
      .join('\n')
    
    editorStore.setGeneratedContent(fullContent)
    await router.push({
      name: 'Editor',
      query: { generated: 'true', ts: Date.now() }
    })
  } catch (err) {
    console.error('导航失败:', err)
    error.value = '页面跳转失败，请检查网络连接'
  }
}

// Markdown 处理配置
marked.setOptions({
  breaks: true,
  gfm: true,
})

// 内容处理逻辑
const processedContent = computed(() => {
  return DOMPurify.sanitize(
    streamSegments.value.map(segment => {
      if (segment.type === 'reasoning') {
        // 创建文本节点自动转义HTML
        const div = document.createElement('div')
        div.textContent = segment.content
        // 保留换行
        const withBreaks = div.innerHTML.replace(/\n/g, '<br>')
        return `<div class="segment-reasoning" style="white-space: pre-wrap;">${withBreaks}</div>`
      }
      const parsed = marked.parse(segment.content)
      return `<div class="segment-answer">${parsed}</div>`
    }).join('')
  )
})


// 滚动处理逻辑
const handleScroll = () => {
  if (!streamContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = streamContainer.value
  shouldAutoScroll.value = scrollHeight - (scrollTop + clientHeight) < 30
}

const smartScroll = () => {
  nextTick(() => {
    if (streamContainer.value && shouldAutoScroll.value) {
      streamContainer.value.scrollTop = streamContainer.value.scrollHeight
    }
  })
}

// 流式数据处理
const processStream = async (reader: ReadableStreamDefaultReader) => {
  const decoder = new TextDecoder()
  let currentType: 'reasoning' | 'answer' = 'answer'
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')

      // 保留未完成的行
      buffer = lines.pop() || ''

      for (const line of lines) {
        const dataPrefix = 'data: '
        if (!line.startsWith(dataPrefix)) continue
        
        const content = line.slice(dataPrefix.length).trim()
        if (content === '[DONE]') continue  // 添加DONE处理

        try {
          const json = JSON.parse(content)  // 移除非必要的slice
          const delta = json.choices[0]?.delta || {}

          if (delta.reasoning_content) {
            currentType = 'reasoning'
            appendContent(delta.reasoning_content, currentType)
          }
          
          if (delta.content) {
            if (currentType === 'reasoning') {
              currentType = 'answer'
              startNewSegment()
            }
            appendContent(delta.content, currentType)
          }
        } catch (e) {
          console.error('JSON解析错误:', e, '原始内容:', content)
        }
      }
    }

    // 处理剩余缓冲（修正解码方式）
    if (buffer) {
      const remainingContent = decoder.decode()
      if (remainingContent) {
        appendContent(remainingContent, currentType)
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// 内容追加逻辑
const appendContent = (text: string, type: 'reasoning' | 'answer') => {
  if (streamSegments.value.length === 0) {
    streamSegments.value.push({ type, content: '' })
  }
  
  const lastSegment = streamSegments.value[streamSegments.value.length - 1]
  if (lastSegment.type !== type) {
    streamSegments.value.push({ type, content: text })
  } else {
    lastSegment.content += text
  }
  
  smartScroll()
}

// 创建新段落
const startNewSegment = () => {
  streamSegments.value.push({ type: 'answer', content: '' })
}

// API 调用
const callAIAPI = async (prompt: string, message: string) => {
  try {
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SILICONFLOW_API_KEY}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "system",
            content: `按要求将用户内容填写进对应的模板，要求以HTML代码的格式，只给出代码内容即可，不要新增其他任何注释信息。注意代码要符合HTML的格式，将代码块包裹在反引号中。不要使用markdown格式。模板如下"
            ${prompt}`
          },
          {
            role: "user",
            content: `用户内容：${message} ; 请只生成完整的HTML代码块。注意不要直接返回原模板，而是将用户内容按照模板格式改写，且要确保原模板留空的待填位置填写完整`
          }
        ],
        temperature: 0.7,
        max_tokens: max_tokens_base[import.meta.env.VITE_SILICONFLOW_MODEL] || 4096,
        stream: true
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || '生成失败')
    }
    
    const reader = response.body?.getReader()
    if (reader) {
      await processStream(reader)
    }
  } catch (err) {
    console.error('API调用失败:', err)
    throw err
  }
}

// 组件挂载
onMounted(async () => {
  try {
    await callAIAPI(
      editorStore.draft.prompt,
      editorStore.draft.message
    )
  } catch (err) {
    console.error('完整错误对象:', err)
    // 添加类型保护
    error.value = err instanceof Error ? err.message 
               : typeof err === 'string' ? err
               : '内容生成失败，请稍后重试'
  } finally {
    loading.value = false
    const fullContent = streamSegments.value
      .filter(s => s.type === 'answer')
      .map(s => s.content)
      .join('\n')
    console.log('[Debug] AI生成内容:', {fullContent})
  }
})

</script>

<style scoped>
/* 容器布局 */
.generator-container {
  height: 100vh;
  padding: 20px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.status-container {
  padding: 4px 0;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #e0e0e0;
}

/* 状态提示 */
.loading-status {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  background: #f8f9fa;
  border-radius: 8px;
  color: #666;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* 内容区域 */
.stream-container {
  flex: 1;
  padding: 20px;
  margin-bottom: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #ffffff;
  overflow-y: auto;
  scroll-behavior: smooth;
}

/* 交互元素 */
.confirm-button {
  padding: 12px 36px;
  font-size: 14px;
  background: #89C4F4;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.confirm-button:hover {
  background: #4A90E2;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
}

.error-message {
  padding: 16px;
  margin-top: 16px;
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* 动画效果 */
.loader {
  width: 20px;
  height: 20px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #2196f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 深度样式 */
.stream-content :deep(.segment-reasoning) {
  margin: 12px 0;
  padding: 12px 16px;
  background: #e6f1ea;
  border-left: 4px solid #379f79;
  border-radius: 4px;
  white-space: pre-wrap;
}

.stream-content :deep(.segment-reasoning::before) {
  content: "💡 思考过程：";
  font-weight: 600;
  color: #278562;
  display: block;
  margin-bottom: 8px;
}

.stream-content :deep(.segment-answer) {
  margin: 16px 0;
  padding: 16px;
  background: #e3f2fd;
  border-left: 4px solid #2196f3;
  border-radius: 4px;
}

.stream-content :deep(.segment-answer::before) {
  content: "📝 最终回答：";
  font-weight: 600;
  color: #1565c0;
  display: block;
  margin-bottom: 8px;
}

.stream-content :deep(pre) {
  padding: 16px;
  margin: 12px 0;
  background: #caddec;
  border-radius: 6px;
  overflow-x: auto;
}

.stream-content :deep(code) {
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 13px;
}

.stream-content :deep(h1) {
  font-size: 24px;
  margin: 24px 0 16px;
  color: #1a237e;
}
</style>
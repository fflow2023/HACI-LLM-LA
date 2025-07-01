<template>
  <div class="file-management">
    <h2 class="title">知识库文件管理</h2>
    
    <!-- 知识库选择器 -->
    <div class="p-4">
      <div class="flex items-center gap-3 mb-3">
        <NSelect
          v-model:value="currentKnowledgeBase"
          :options="knowledgeBases"
          style="width: 200px"
          @update:value="handleKnowledgeBaseChange"
        />
              <!-- 文件上传 -->
      <NUpload 
        :action="api_file_url" 
        :headers="uploadHeaders" 
        :data="uploadData"
        @finish="handleUploadSuccess" 
        @error="handleUploadError"
        :key="uploadKey"
      >
        <NButton block>上传文件</NButton>
      </NUpload>
      </div>
    </div>
    
    <!-- 文件列表 -->
    <div class="p-2 flex-1 min-h-0 pb-4 overflow-hidden">
      <NScrollbar class="px-4">
        <div class="flex flex-col gap-2 text-sm">
          <template v-if="!dataSources.length">
            <div class="flex flex-col items-center mt-4 text-center text-neutral-300">
              <SvgIcon icon="ri:inbox-line" class="mb-2 text-3xl" />
              <span>{{ currentKnowledgeBase }} 知识库为空</span>
            </div>
          </template>
          <template v-else>
            <div v-for="(item, index) in dataSources" :key="index">
              <div
                class="relative flex items-center gap-3 px-3 py-3 break-all border rounded-md group dark:border-neutral-800 dark:hover:bg-[#24272e] hover:bg-neutral-100"
              >
                <span>
                  <SvgIcon icon="ri:file-line" />
                </span>
                <div class="flex-1 overflow-hidden break-all text-ellipsis whitespace-nowrap">
                  {{ item }}
                </div>
                <div class="absolute z-10 flex visible right-1">
                  <NPopconfirm placement="bottom" @positive-click="() => handleDelete(item)">
                    <template #trigger>
                      <button class="p-1 hover:text-red-500">
                        <SvgIcon icon="ri:delete-bin-line" />
                      </button>
                    </template>
                    {{ `确认从 ${currentKnowledgeBase} 知识库中删除？` }}
                  </NPopconfirm>
                </div>
              </div>
            </div>
          </template>
        </div>
      </NScrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NButton, NUpload, NPopconfirm, NScrollbar, NSelect, useMessage } from 'naive-ui'
import type { UploadFileInfo } from 'naive-ui'
import { SvgIcon } from '@/components/common'
import { deletefile, getfilelist } from '@/api/chat'

const api_file_url = import.meta.env.VITE_VIEWS_ADDRESS + '/api/file'
const message = useMessage()
const dataSources = ref<string[]>([])

// 知识库相关状态
const knowledgeBases = ref([
  { label: '英语知识库', value: '英语' },
  { label: '日语知识库', value: '日语' }
])
const currentKnowledgeBase = ref('英语')

// 上传配置
const uploadHeaders = computed(() => ({
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
}))
const uploadData = computed(() => ({
  knowledgeBase: currentKnowledgeBase.value
}))

// 统一初始化加载
onMounted(() => {
  loadFileList(currentKnowledgeBase.value)
})

async function loadFileList(KnowledgeBase: string) {
  try {
    const res = await getfilelist( KnowledgeBase )
    dataSources.value = res.data
    uploadKey.value = Date.now()
    message.success(`已加载 ${KnowledgeBase} 知识库`)
  } catch (error) {
    console.error('获取文件列表失败:', error)
    message.error(`获取 ${KnowledgeBase} 知识库失败`)
  }
}

const uploadKey = ref(Date.now())

// 知识库切换处理
const handleKnowledgeBaseChange = (value: string) => {
  currentKnowledgeBase.value = value
  loadFileList(value)
}

// 上传成功处理
const handleUploadSuccess = ({ file }: { file: UploadFileInfo }) => {
  message.success(`${file.name} 已上传到 ${currentKnowledgeBase.value} 知识库`)
  loadFileList(currentKnowledgeBase.value)
}

const handleUploadError = ({ file }: { file: UploadFileInfo }) => {
  message.error(`${file.name} 上传到 ${currentKnowledgeBase.value} 知识库失败`)
}

// 删除处理
async function handleDelete(item: string) {
  try {
    await deletefile({ 
      fileName: item,
      knowledgeBase: currentKnowledgeBase.value
    })
    await loadFileList(currentKnowledgeBase.value)
    message.success(`已从 ${currentKnowledgeBase.value} 知识库中删除`)
  } catch (error) {
    console.error('删除失败:', error)
    message.error('删除失败')
  }
}
</script>

<style scoped>
.file-management {
  padding: 20px;
}

.overflow-hidden {
  overflow: hidden;
}

.min-h-0 {
  min-height: 0;
}
</style>
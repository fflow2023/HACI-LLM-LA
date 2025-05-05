//views\src\views\admin\modules\FileManagement.vue
<template>
  <div class="file-management">
    <h2 class="title">知识库文件管理</h2>
    <div class="p-4">
      <NUpload :action="api_file_url" :headers="uploadHeaders" :data="{ 'naive-data': 'cool! naive!' }"
        @finish="handleUploadSuccess" @error="handleUploadError" :key="uploadKey">
        <NButton block>文件上传</NButton>
      </NUpload>
    </div>
    <div class="p-2 flex-1 min-h-0 pb-4 overflow-hidden">
      <NScrollbar class="px-4">
        <div class="flex flex-col gap-2 text-sm">
          <template v-if="!dataSources.length">
            <div class="flex flex-col items-center mt-4 text-center text-neutral-300">
              <SvgIcon icon="ri:inbox-line" class="mb-2 text-3xl" />
              <span>{{ ('知识库文件空') }}</span>
            </div>
          </template>
          <template v-else>
            <div v-for="(item, index) in dataSources" :key="index">
              <div
                class="relative flex items-center gap-3 px-3 py-3 break-all border rounded-md group dark:border-neutral-800 dark:hover:bg-[#24272e] hover:bg-neutral-100">
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
                    {{ ('确认删除') }}
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
import { NButton, NUpload, NPopconfirm, NScrollbar, useMessage } from 'naive-ui'
import type { UploadFileInfo } from 'naive-ui'
import { SvgIcon } from '@/components/common'
import { deletefile, getfilelist } from '@/api/chat'

const api_file_url = import.meta.env.VITE_VIEWS_ADDRESS + '/api/file'
const message = useMessage()
const dataSources = ref<string[]>([])

const uploadHeaders = computed(() => ({
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
}))
// 统一初始化加载
onMounted(loadFileList)

async function loadFileList() {
  try {
    const res = await getfilelist()
    dataSources.value = res.data
    uploadKey.value = Date.now();
  } catch (error) {
    console.error('获取文件列表失败:', error)
    message.error('获取文件列表失败')
  }
}
const uploadKey = ref(Date.now())
// 上传成功处理（新增自动刷新）
const handleUploadSuccess = ({ file }: { file: UploadFileInfo }) => {
  message.success(`${file.name} 上传成功`)
  loadFileList()
}

const handleUploadError = ({ file }: { file: UploadFileInfo }) => {
  message.error(`${file.name} 上传失败`)
}

// 删除处理
async function handleDelete(item: string) {
  try {
    await deletefile({ fileName: item })
    await loadFileList() // 使用统一的刷新方法
    message.success('删除成功')
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
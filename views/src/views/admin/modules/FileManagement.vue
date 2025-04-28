//views\src\views\admin\modules\FileManagement.vue
<template>
  <div class="file-management">
    <h2 class="title">知识库文件管理</h2>
    <div class="p-4">
      <NUpload :action="api_file_url" :headers="{
        'naive-info': 'hello!',
      }" :data="{
        'naive-data': 'cool! naive!',
      }" @finish="handleSuccess" @error="handleError">
        <NButton block>
          文件上传
        </NButton>
      </NUpload>
    </div>
    <div class="p-2 flex-1 min-h-0 pb-4 overflow-hidden">
      <FileList />
    </div>
  </div>
</template>

<script setup lang="ts">
import { NButton, NUpload, useMessage, type UploadFileInfo } from 'naive-ui' // 添加类型导入
import FileList from './Filelist.vue'

const api_file_url = import.meta.env.VITE_VIEWS_ADDRESS + '/api/file'
const message = useMessage()

const handleSuccess = ({ file }: { file: UploadFileInfo }) => {
  message.success(`${file.name} 上传成功`)
}
const handleError = ({ file }: { file: UploadFileInfo; event?: ProgressEvent }) => {
  message.error(`${file.name} 上传失败`)
}
</script>

<style scoped>
/* 原有样式保持不变 */
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
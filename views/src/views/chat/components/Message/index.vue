<script setup lang='ts'>
import { computed, ref } from 'vue'
import { NDropdown, NModal, NList, NListItem, NThing, useMessage } from 'naive-ui'
import AvatarComponent from './Avatar.vue'
import TextComponent from './Text.vue'
import { SvgIcon } from '@/components/common'
import { useIconRender } from '@/hooks/useIconRender'
import { t } from '@/locales'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { copyToClip } from '@/utils/copy'
import { router } from '@/router'
import { useEditorStore } from '@/store/modules/editor'
interface Props {
  dateTime?: string
  text?: string
  inversion?: boolean
  error?: boolean
  loading?: boolean
  templates?: Array<{  // 从父组件接收的模板数据
    name: string
    prompt: string
    preview: string
  }>
  attachments?: Array<{ name: string, content: string }>
}


interface Emit {
  (ev: 'regenerate'): void
  (ev: 'delete'): void
}

const editorStore = useEditorStore()

const props = defineProps<Props>()

const emit = defineEmits<Emit>()

const { isMobile } = useBasicLayout()

const { iconRender } = useIconRender()

const message = useMessage()

const textRef = ref<HTMLElement>()

const asRawText = ref(props.inversion)

const messageRef = ref<HTMLElement>()

const options = computed(() => {
  const common = [
    {
      label: t('chat.copy'),
      key: 'copyText',
      icon: iconRender({ icon: 'ri:file-copy-2-line' }),
    },
    {
      label: t('common.delete'),
      key: 'delete',
      icon: iconRender({ icon: 'ri:delete-bin-line' }),
    },
  ]

  if (!props.inversion) {
    common.unshift({
      label: asRawText.value ? t('chat.preview') : t('chat.showRawText'),
      key: 'toggleRenderType',
      icon: iconRender({ icon: asRawText.value ? 'ic:outline-code-off' : 'ic:outline-code' }),
    })
  }

  return common
})

function handleSelect(key: 'copyText' | 'delete' | 'toggleRenderType') {
  switch (key) {
    case 'copyText':
      handleCopy()
      return
    case 'toggleRenderType':
      asRawText.value = !asRawText.value
      return
    case 'delete':
      emit('delete')
      return
  }
}

function handleRegenerate() {
  messageRef.value?.scrollIntoView()
  emit('regenerate')
}

async function handleCopy() {
  try {
    await copyToClip(props.text || '')
    message.success('复制成功')
  }
  catch {
    message.error('复制失败')
  }
}

const showAttachmentDetail = ref(false)
const selectedAttachment = ref<{ name: string; content: string } | null>(null)

// 生成附件菜单选项
const attachmentOptions = computed(() => {
  return props.attachments?.map(attachment => ({
    label: attachment.name,
    key: attachment.name,
    icon: iconRender({ icon: 'ri:file-text-line' })
  })) || []
})

// 处理附件选择
function handleAttachmentSelect(key: string) {
  selectedAttachment.value = props.attachments?.find(a => a.name === key) || null
  showAttachmentDetail.value = true
}
</script>

<template>
  <div>
    <!-- 附件详情模态框 -->
    <NModal v-model:show="showAttachmentDetail">
      <NCard style="width: 600px; max-width: 90vw" :title="selectedAttachment?.name" :bordered="false" size="huge">
        <div class="attachment-content-box">
          <pre>{{ '[' + selectedAttachment?.name + '] 文件内容:\n' + selectedAttachment?.content }}</pre>
        </div>
      </NCard>
    </NModal>

    <div ref="messageRef" class="flex w-full mb-6 overflow-hidden" :class="[{ 'flex-row-reverse': inversion }]">
      <div class="flex items-center justify-center flex-shrink-0 h-8 overflow-hidden rounded-full basis-8"
        :class="[inversion ? 'ml-2' : 'mr-2']">
        <AvatarComponent :image="inversion" />
      </div>
      <div class="overflow-hidden text-sm " :class="[inversion ? 'items-end' : 'items-start']">
        <p class="text-xs text-[#b4bbc4]" :class="[inversion ? 'text-right' : 'text-left']">
          {{ dateTime }}
        </p>
        <div class="flex items-end gap-1 mt-2" :class="[inversion ? 'flex-row-reverse' : 'flex-row']">
          <TextComponent ref="textRef" :inversion="inversion" :error="error" :text="text" :loading="loading"
            :as-raw-text="asRawText" />
          <div class="flex flex-col">
            <button v-if="!inversion"
              class="mb-2 transition text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-300"
              @click="handleRegenerate">
              <SvgIcon icon="ri:restart-line" />
            </button>
            <!-- 操作菜单容器 -->
            <!-- 修改操作菜单容器部分 -->
            <div class="flex flex-col items-end gap-1"> <!-- 改为纵向排列 -->
              <!-- 附件菜单调整到上方 -->
              <NDropdown v-if="attachments?.length" trigger="hover" :options="attachmentOptions" :show-arrow="true"
                placement="left-start" @select="handleAttachmentSelect">
                <HoverButton class="text-gray-500 hover:text-blue-500 transition-colors">
                  <SvgIcon icon="ri:attachment-line" class="text-[1.1em]" />
                </HoverButton>
              </NDropdown>
              <!-- 原三点菜单 -->
              <NDropdown :trigger="isMobile ? 'click' : 'hover'" :placement="!inversion ? 'right' : 'left'"
                :options="options" @select="handleSelect">
                <HoverButton
                  class="transition-colors text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-200">
                  <SvgIcon icon="ri:more-2-fill" class="text-[1.1em]" />
                </HoverButton>
              </NDropdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.attachment-content-box {
  max-height: 60vh;
  overflow: auto;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
}

.attachment-content-box pre {
  white-space: pre-wrap;
  font-family: inherit;
  margin: 0;
}

:deep(.n-dropdown-option-body) {
  max-width: 300px;

  .n-dropdown-option-body__label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

/* 模板模态框容器 */
.template-list {
  background: rgba(249, 250, 251, 0.9);
  border-radius: 8px;
  backdrop-filter: blur(4px);
  max-height: 410px;
  overflow-y: auto;
}

/* 模板列表项 */
.template-item {
  cursor: pointer;
  height: 90px;
  margin: 8px 0;
  border: 3px solid transparent;
  box-sizing: border-box;
  border-radius: 4px;
  overflow: hidden;
  transition:
    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);

}

/* 列表项交互效果 */
.template-item:hover {
  box-shadow: 0 8px 24px rgba(43, 108, 176, 0.15);
  border-color: #2B6CB0;
  border-radius: 4px;
  background: linear-gradient(45deg, #f0fdf4, #f0f9ff);
}

.template-item:active {
  transform: translateY(3px);
  border-width: 2px;
}

/* 图标样式 */
.template-icon {
  padding: 7px;
  background: rgba(43, 108, 176, 0.1);
  border-radius: 10px;
  margin-right: 10px;
  transition: all 0.3s ease;
}

.template-icon svg {
  width: 1.3em;
  height: 1.3em;
  color: #2B6CB0;
}

/* 悬停时图标效果 */
.template-item:hover .template-icon {
  transform: rotate(15deg) scale(1.1);
  background: rgba(43, 108, 176, 0.15);
}

/* 滚动条样式 */
.template-list::-webkit-scrollbar {
  width: 6px;
}

.template-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.template-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

/* 列表项间距调整 */
.n-list-item:not(:last-child) {
  margin-bottom: 10px;
}

/* 文本内容样式 */
.n-thing__title {
  color: #4a5568;
  font-weight: 600;
}

.n-thing__content {
  white-space: pre-wrap;
}
</style>

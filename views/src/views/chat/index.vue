<script setup lang='ts'>
import type { Ref } from 'vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { NAutoComplete, NButton, NInput, NSwitch, useDialog, useMessage, NSelect, NTooltip } from 'naive-ui'
import html2canvas from 'html2canvas'
import { Message } from './components'
import { useScroll } from './hooks/useScroll'
import { useChat } from './hooks/useChat'
import { useUsingContext } from './hooks/useUsingContext'
import HeaderComponent from './components/Header/index.vue'
import { HoverButton, SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useChatStore, usePromptStore } from '@/store'
import { t } from '@/locales'
import { chat, chatOpenAI, chatSiliconflow, chatfile, chatfileOpenai, chatfileContent } from '@/api/chat'
import { fetchStreamData } from '@/api/api'
import axios from '@/utils/request/axios'
import { modelsStore } from '@/store/modules/models/models-setting'
import { useCharacter } from '@/hooks/useCharacter'
import { characterPrompts, CharacterType } from '@/templates/characterPrompts'
let controller = new AbortController()

// 以下为文本编辑器相关内容👇
{
  const templates = ref<Array<{ name: string, prompt: string, preview: string, }>>([])

  const loadTemplates = async () => {
    try {
      const modules = import.meta.glob('@/templates/*.txt', {
        as: 'raw',
        eager: true
      })

      templates.value = Object.entries(modules).map(([path, content]) => {
        // 从文件路径提取模板名称
        const fullFileName = path.split('/').pop() || ''
        const fileName = fullFileName.replace(/\\/g, '/').split('/').pop() || '';
        const firstLine = content.split('\n')[0].trim()
        const preview = firstLine.length > 30 ? firstLine.slice(0, 30) + '...' : firstLine;
        return {
          name: fileName, // 直接使用文件名作为显示名称
          prompt: content,
          preview: preview  //选取prompt第一行作为预览
        }
      })
    }

    catch (error) {
      console.error('加载模板失败:', error)
      ms.error('模板加载失败，请检查模板文件')
    }
  }

  // 挂载时加载模板
  // onMounted(() => {
  //   loadTemplates()
  //   console.log('[Debug] chat挂载模板成功 ', {})
  // })
  // 以上为文本编辑器相关内容👆
}

// const openLongReply = import.meta.env.VITE_GLOB_OPEN_LONG_REPLY === 'true'

const store = modelsStore()
const route = useRoute()
const dialog = useDialog()
const ms = useMessage()
const chatStore = useChatStore()

const { isMobile } = useBasicLayout()
const { addChat, updateChat, updateChatSome, getChatByUuidAndIndex } = useChat()
const { scrollRef, scrollToBottom, scrollToBottomIfAtBottom } = useScroll()
const { usingContext, toggleUsingContext } = useUsingContext()

const { uuid } = route.params as { uuid: string }

const dataSources = computed(() => chatStore.getChatByUuid(+uuid))
const conversationList = computed(() => dataSources.value.filter(item => (!item.inversion && !!item.conversationOptions)))

const prompt = ref<string>('')

const loading = ref<boolean>(false)
const inputRef = ref<Ref | null>(null)

// 添加PromptStore
const promptStore = usePromptStore()

// 历史记录相关
const history: any = ref([])
// 使用storeToRefs，保证store修改后，联想部分能够重新渲染
const { promptList: promptTemplate } = storeToRefs<any>(promptStore) as { promptList: any };

// 是否开启知识库问答
const active = ref<boolean>(true)   //默认选择开启知识库，可能需要用户自行决定

// 未知原因刷新页面，loading 状态不会重置，手动重置
dataSources.value.forEach((item, index) => {
  if (item.loading)
    updateChatSome(+uuid, index, { loading: false })
})

// 发送对话-提交
function handleSubmit() {
  const originalText = prompt.value

  // 构建附件信息
  const attachmentInfo = fileList.value
    .filter(item => item.parsed)
    .map((item, index) =>
      `[附件${index + 1}] 文件名: ${item.file.name}\n内容: ${item.parsedContent}`
    ).join('\n\n')

  // 生成API请求的合并消息
  const message = attachmentInfo
    ? `用户问题：${originalText} \n\n (以下是用户提交的附件)：\n${attachmentInfo} `
    : `用户问题：${originalText}`;

  // 仅添加一次用户输入
  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: originalText,
      attachments: fileList.value.filter(i => i.parsed).map(i => ({
        name: i.file.name,
        content: i.parsedContent
      })),
      inversion: true,
      error: false,
      conversationOptions: null,
      requestOptions: {
        prompt: message,
        options: null
      },
    }
  )

  // 清空文件列表
  prompt.value = ''
  fileList.value = []

  // 根据当前模型调用对应的处理函数
  if (store.Chatgpt) {
    onConversation2()
  } else if (store.chatglm) {
    onConversation()
  } else if (store.siliconflow) {
    onConversation3()
  }
}

// 延续接口，silicon flow的接口用onConversation3函数实现
async function onConversation3() {
  loading.value = true

  // 获取最新的用户输入（dataSources长度-1是刚添加的用户消息）
  const lastUserMsg = dataSources.value[dataSources.value.length - 1]
  let message = lastUserMsg?.requestOptions?.prompt || ''  //message就是刚刚的版合并消息
  console.log('[DEBUG]message:\n' + message);

  // 更新上下文处理逻辑
  if (usingContext.value) {
    // 仅处理用户消息（过滤AI回复）
    const userMessages = dataSources.value.filter(item => item.inversion)
    history.value = userMessages.map((msg, index) => [
      // `Human:${msg.text}`,  //只将用户的原始输入内容保存到历史记录中
      `Human:${msg.requestOptions.prompt}`,  //在历史记录中附带保留附件内容


      dataSources.value[index * 2 + 1]?.text.split('\n\n数据来源：\n\n')[0] || ''
    ])
  } else {
    history.value = []
  }

  controller = new AbortController()

  scrollToBottom()

  prompt.value = ''

  let options: Chat.ConversationRequest = {}
  const lastContext = conversationList.value[conversationList.value.length - 1]?.conversationOptions

  if (lastContext && usingContext.value)
    options = { ...lastContext }

  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: '',
      loading: true,
      inversion: false,
      error: false,
      conversationOptions: null,
      requestOptions: {
        prompt: message,
        options: { ...options },
        character: currentCharacter.value // 添加性格类型
      },
    },
  )
  scrollToBottom()

  try {
    let lastText = ''
    const fetchChatAPIOnce = async () => {
      let stream = true

      if (stream) {
        interface DocumentContent {
          data: {
            content: string[];
            url: string;
          };
        }

        let documentContent: DocumentContent;
        if (active.value) {

          // 1. 获取知识库内容
          try {
            documentContent = await chatfileContent({
              message: message,
              hyperparameters: {
                document_number: 2,
              }
            })
          } catch (error: any) {
            throw new Error("知识库查询失败，请检查网络连接或联系管理员") // 终止后续处理
          }
          // console.log("****", documentContent)

          // 2. add the prompt to the message
          let mergedContent = ''
          for (let i = 0; i < documentContent.data.content.length; i++) {
            mergedContent += `第${i + 1}份参考资料：` + documentContent.data.content[i]
          }

          console.log("referenced content: ", mergedContent)
          if(documentContent.data.content.length>0)
            message = `请根据以下参考资料回答问题：\n\n${mergedContent}\n\n 用户的输入：${message}`
        }

        const gen = fetchStreamData({
          message: message,
          history: history.value,
          stream: stream,
          character: currentCharacter.value, // 添加性格类型
          signal: controller.signal // 传入 signal 用于stream
        });

        function step(value?: any) {
          const result = gen.next(value);

          if (!result.done) {
            // 检查 result.value 是否为 Promise，若是则等待其完成，否则直接打印
            if (result.value instanceof Promise) {
              result.value.then(data => step(data)).catch(err => gen.throw(err));
            } else {
              dataSources.value[dataSources.value.length - 1].text += result.value;

              step(); // 继续执行生成器
              scrollToBottomIfAtBottom()
            }
          } else {
            lastText += dataSources.value[dataSources.value.length - 1].text
            loading.value = false
            updateChat(
              +uuid,
              dataSources.value.length - 1,
              {
                dateTime: new Date().toLocaleString(),
                text: lastText,
                inversion: false,
                error: false,
                loading: false,
                conversationOptions: null,
                requestOptions: { prompt: message, options: { ...options } },
              },
            )
          }
        }
        step();
      } else {
        let res = active.value ? await chatfile({ message, history: history.value }) : await chatSiliconflow({ message, history: history.value, stream: stream })
        let result = active.value ? `${res.data.response.text}\n\n数据来源：\n\n[${res.data.url.split('/static/')[1]}](${import.meta.env.VITE_SERVICE_ADDRESS}${res.data.url})` : res
        lastText += result
      }

      updateChat(
        +uuid,
        dataSources.value.length - 1,
        {
          dateTime: new Date().toLocaleString(),
          text: lastText,
          inversion: false,
          error: false,
          loading: false,
          conversationOptions: null,
          requestOptions: { prompt: message, options: { ...options } },
        },
      )
      scrollToBottomIfAtBottom()
      updateChatSome(+uuid, dataSources.value.length - 1, { loading: false })
    }
    await fetchChatAPIOnce()
  } catch (error: any) {
    loading.value = false
    const errorMessage = error?.message ?? t('common.wrong')

    if (error.message === 'canceled') {
      updateChatSome(
        +uuid,
        dataSources.value.length - 1,
        {
          loading: false,
        },
      )
      scrollToBottomIfAtBottom()
      return
    }

    const currentChat = getChatByUuidAndIndex(+uuid, dataSources.value.length - 1)

    if (currentChat?.text && currentChat.text !== '') {
      updateChatSome(
        +uuid,
        dataSources.value.length - 1,
        {
          text: `${currentChat.text}\n[${errorMessage}]`,
          error: false,
          loading: false,
        },
      )
      return
    }

    updateChat(
      +uuid,
      dataSources.value.length - 1,
      {
        dateTime: new Date().toLocaleString(),
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, options: { ...options } },
      },
    )
    scrollToBottomIfAtBottom()
  } finally {
  }
  // const lastUserMsg = dataSources.value[dataSources.value.length - 1]
  // const lastAIMsg = dataSources.value[dataSources.value.length - 2]
  //保存消息记录到后端...zhy加油~
}

// onConversation 和onConversation2 不用
async function onConversation() {
  const message = prompt.value
  if (usingContext.value) {
    for (let i = 0; i < dataSources.value.length; i = i + 2)
      history.value.push([`Human:${dataSources.value[i].text}`, `Assistant:${dataSources.value[i + 1].text.split('\n\n数据来源：\n\n')[0]}`])
  }
  else { history.value.length = 0 }
  if (!message || message.trim() === '')
    return

  controller = new AbortController()

  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: message,
      inversion: true,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: null },

    },
  )
  scrollToBottom()

  loading.value = true
  prompt.value = ''

  let options: Chat.ConversationRequest = {}
  const lastContext = conversationList.value[conversationList.value.length - 1]?.conversationOptions

  if (lastContext && usingContext.value)
    options = { ...lastContext }

  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: '',
      loading: true,
      inversion: false,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: { ...options } },
    },
  )
  scrollToBottom()

  try {
    const lastText = ''
    const fetchChatAPIOnce = async () => {
      const res = active.value ? await chatfile({ message, history: history.value }) : await chat({ message, history: history.value })
      const result = active.value ? `${res.data.response.text}\n\n数据来源：\n\n[${res.data.url.split('/static/')[1]}](${import.meta.env.VITE_SERVICE_ADDRESS}${res.data.url})` : res.data.text
      updateChat(
        +uuid,
        dataSources.value.length - 1,
        {
          dateTime: new Date().toLocaleString(),
          text: lastText + (result ?? ''),
          inversion: false,
          error: false,
          loading: false,
          conversationOptions: null,
          requestOptions: { prompt: message, options: { ...options } },
        },
      )
      scrollToBottomIfAtBottom()
      loading.value = false
      /* await fetchChatAPIProcess<Chat.ConversationResponse>({
        prompt: message,
        options,
        signal: controller.signal,
        onDownloadProgress: ({ event }) => {
          const xhr = event.target
          const { responseText } = xhr
          // Always process the final line
          const lastIndex = responseText.lastIndexOf('\n', responseText.length - 2)
          let chunk = responseText
          if (lastIndex !== -1)
            chunk = responseText.substring(lastIndex)
          try {
            const data = JSON.parse(chunk)
            updateChat(
              +uuid,
              dataSources.value.length - 1,
              {
                dateTime: new Date().toLocaleString(),
                text: lastText + (data.text ?? ''),
                inversion: false,
                error: false,
                loading: true,
                conversationOptions: { conversationId: data.conversationId, parentMessageId: data.id },
                requestOptions: { prompt: message, options: { ...options } },
              },
            )

            if (openLongReply && data.detail.choices[0].finish_reason === 'length') {
              options.parentMessageId = data.id
              lastText = data.text
              message = ''
              return fetchChatAPIOnce()
            }

            scrollToBottomIfAtBottom()
          }
          catch (error) {
            //
          }
        },
      }) */
      updateChatSome(+uuid, dataSources.value.length - 1, { loading: false })
    }

    await fetchChatAPIOnce()
  }
  catch (error: any) {
    const errorMessage = error?.message ?? t('common.wrong')

    if (error.message === 'canceled') {
      updateChatSome(
        +uuid,
        dataSources.value.length - 1,
        {
          loading: false,
        },
      )
      scrollToBottomIfAtBottom()
      return
    }

    const currentChat = getChatByUuidAndIndex(+uuid, dataSources.value.length - 1)

    if (currentChat?.text && currentChat.text !== '') {
      updateChatSome(
        +uuid,
        dataSources.value.length - 1,
        {
          text: `${currentChat.text}\n[${errorMessage}]`,
          error: false,
          loading: false,
        },
      )
      return
    }

    updateChat(
      +uuid,
      dataSources.value.length - 1,
      {
        dateTime: new Date().toLocaleString(),
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, options: { ...options } },
      },
    )
    scrollToBottomIfAtBottom()
  }
  finally {
    loading.value = false
  }
}
async function onConversation2() {
  const message = prompt.value
  if (usingContext.value) {
    for (let i = 0; i < dataSources.value.length; i = i + 2)
      history.value.push([`Human:${dataSources.value[i].text}`, `Assistant:${dataSources.value[i + 1].text.split('\n\n数据来源：\n\n')[0]}`])
  }
  else { history.value.length = 0 }
  if (!message || message.trim() === '')
    return

  controller = new AbortController()

  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: message,
      inversion: true,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: null },
    },
  )
  scrollToBottom()

  loading.value = true
  prompt.value = ''

  let options: Chat.ConversationRequest = {}
  const lastContext = conversationList.value[conversationList.value.length - 1]?.conversationOptions

  if (lastContext && usingContext.value)
    options = { ...lastContext }

  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: '',
      loading: true,
      inversion: false,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: { ...options } },
    },
  )
  scrollToBottom()

  try {
    const lastText = ''
    const fetchChatAPIOnce = async () => {
      const res = active.value ? await chatfileOpenai({ message, api_key: store.Openaikey, basePath: store.Openaipath, history: history.value }) : await chatOpenAI({ message, api_key: store.Openaikey, basePath: store.Openaipath, history: history.value })
      const result = active.value ? `${res.data.response.text}\n\n数据来源：\n\n[${res.data.url.split('/static/')[1]}](${import.meta.env.VITE_SERVICE_ADDRESS}${res.data.url})` : res.data.text
      updateChat(
        +uuid,
        dataSources.value.length - 1,
        {
          dateTime: new Date().toLocaleString(),
          text: lastText + (result ?? ''),
          inversion: false,
          error: false,
          loading: false,
          conversationOptions: null,
          requestOptions: { prompt: message, options: { ...options } },
        },
      )
      scrollToBottomIfAtBottom()
      loading.value = false
      /* await fetchChatAPIProcess<Chat.ConversationResponse>({
        prompt: message,
        options,
        signal: controller.signal,
        onDownloadProgress: ({ event }) => {
          const xhr = event.target
          const { responseText } = xhr
          // Always process the final line
          const lastIndex = responseText.lastIndexOf('\n', responseText.length - 2)
          let chunk = responseText
          if (lastIndex !== -1)
            chunk = responseText.substring(lastIndex)
          try {
            const data = JSON.parse(chunk)
            updateChat(
              +uuid,
              dataSources.value.length - 1,
              {
                dateTime: new Date().toLocaleString(),
                text: lastText + (data.text ?? ''),
                inversion: false,
                error: false,
                loading: true,
                conversationOptions: { conversationId: data.conversationId, parentMessageId: data.id },
                requestOptions: { prompt: message, options: { ...options } },
              },
            )

            if (openLongReply && data.detail.choices[0].finish_reason === 'length') {
              options.parentMessageId = data.id
              lastText = data.text
              message = ''
              return fetchChatAPIOnce()
            }

            scrollToBottomIfAtBottom()
          }
          catch (error) {
            //
          }
        },
      }) */
      updateChatSome(+uuid, dataSources.value.length - 1, { loading: false })
    }

    await fetchChatAPIOnce()
  }
  catch (error: any) {
    const errorMessage = error?.message ?? t('common.wrong')

    if (error.message === 'canceled') {
      updateChatSome(
        +uuid,
        dataSources.value.length - 1,
        {
          loading: false,
        },
      )
      scrollToBottomIfAtBottom()
      return
    }

    const currentChat = getChatByUuidAndIndex(+uuid, dataSources.value.length - 1)

    if (currentChat?.text && currentChat.text !== '') {
      updateChatSome(
        +uuid,
        dataSources.value.length - 1,
        {
          text: `${currentChat.text}\n[${errorMessage}]`,
          error: false,
          loading: false,
        },
      )
      return
    }

    updateChat(
      +uuid,
      dataSources.value.length - 1,
      {
        dateTime: new Date().toLocaleString(),
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, options: { ...options } },
      },
    )
    scrollToBottomIfAtBottom()
  }
  finally {
    loading.value = false
  }
}

// /* async function onRegenerate(index: number) {
//   if (loading.value)
//     return

//   controller = new AbortController()

//   const { requestOptions } = dataSources.value[index]

//   let message = requestOptions?.prompt ?? ''

//   let options: Chat.ConversationRequest = {}

//   if (requestOptions.options)
//     options = { ...requestOptions.options }

//   loading.value = true

//   updateChat(
//     +uuid,
//     index,
//     {
//       dateTime: new Date().toLocaleString(),
//       text: '',
//       inversion: false,
//       error: false,
//       loading: true,
//       conversationOptions: null,
//       requestOptions: { prompt: message, options: { ...options } },
//     },
//   )

//   try {
//     let lastText = ''
//     const fetchChatAPIOnce = async () => {
//       await fetchChatAPIProcess<Chat.ConversationResponse>({
//         prompt: message,
//         options,
//         signal: controller.signal,
//         onDownloadProgress: ({ event }) => {
//           const xhr = event.target
//           const { responseText } = xhr
//           // Always process the final line
//           const lastIndex = responseText.lastIndexOf('\n', responseText.length - 2)
//           let chunk = responseText
//           if (lastIndex !== -1)
//             chunk = responseText.substring(lastIndex)
//           try {
//             const data = JSON.parse(chunk)
//             updateChat(
//               +uuid,
//               index,
//               {
//                 dateTime: new Date().toLocaleString(),
//                 text: lastText + (data.text ?? ''),
//                 inversion: false,
//                 error: false,
//                 loading: true,
//                 conversationOptions: { conversationId: data.conversationId, parentMessageId: data.id },
//                 requestOptions: { prompt: message, options: { ...options } },
//               },
//             )

//             if (openLongReply && data.detail.choices[0].finish_reason === 'length') {
//               options.parentMessageId = data.id
//               lastText = data.text
//               message = ''
//               return fetchChatAPIOnce()
//             }
//           }
//           catch (error) {
//             //
//           }
//         },
//       })
//       updateChatSome(+uuid, index, { loading: false })
//     }
//     await fetchChatAPIOnce()
//   }
//   catch (error: any) {
//     if (error.message === 'canceled') {
//       updateChatSome(
//         +uuid,
//         index,
//         {
//           loading: false,
//         },
//       )
//       return
//     }

//     const errorMessage = error?.message ?? t('common.wrong')

//     updateChat(
//       +uuid,
//       index,
//       {
//         dateTime: new Date().toLocaleString(),
//         text: errorMessage,
//         inversion: false,
//         error: true,
//         loading: false,
//         conversationOptions: null,
//         requestOptions: { prompt: message, options: { ...options } },
//       },
//     )
//   }
//   finally {
//     loading.value = false
//   }
// } 
//  */


function handleExport() {
  if (loading.value)
    return

  const d = dialog.warning({
    title: t('chat.exportImage'),
    content: t('chat.exportImageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: async () => {
      try {
        d.loading = true
        const ele = document.getElementById('image-wrapper')
        const canvas = await html2canvas(ele as HTMLDivElement, {
          useCORS: true,
        })
        const imgUrl = canvas.toDataURL('image/png')
        const tempLink = document.createElement('a')
        tempLink.style.display = 'none'
        tempLink.href = imgUrl
        tempLink.setAttribute('download', 'chat-shot.png')
        if (typeof tempLink.download === 'undefined')
          tempLink.setAttribute('target', '_blank')

        document.body.appendChild(tempLink)
        tempLink.click()
        document.body.removeChild(tempLink)
        window.URL.revokeObjectURL(imgUrl)
        d.loading = false
        ms.success(t('chat.exportSuccess'))
        Promise.resolve()
      }
      catch (error: any) {
        ms.error(t('chat.exportFailed'))
      }
      finally {
        d.loading = false
      }
    },
  })
}

function handleDelete(index: number) {
  if (loading.value)
    return

  dialog.warning({
    title: t('chat.deleteMessage'),
    content: t('chat.deleteMessageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.deleteChatByUuid(+uuid, index)
    },
  })
}

function handleClear() {
  if (loading.value)
    return

  dialog.warning({
    title: t('chat.clearChat'),
    content: t('chat.clearChatConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.clearChatByUuid(+uuid)
    },
  })
}

function handleEnter(event: KeyboardEvent) {
  if (loading.value) {  // 新增loading状态检查
    event.preventDefault()
    return
  }

  if (!isMobile.value) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      !buttonDisabled.value && handleSubmit()  // 新增禁用状态检查
    }
  }
  else {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault()
      !buttonDisabled.value && handleSubmit()  // 新增禁用状态检查
    }
  }
}

//手动停止响应
function handleStop() {
  if (loading.value) {
    controller.abort()
    loading.value = false
    
    // 立即更新最后一条消息状态
    const currentIndex = dataSources.value.length - 1
    updateChatSome(
      +uuid,
      currentIndex,
      {
        loading: false,
        text: `${dataSources.value[currentIndex].text}\n[已手动停止响应]`
      }
    )
    
    // 强制滚动到底部
    scrollToBottomIfAtBottom()
    
    // 创建新控制器以备下次使用
    controller = new AbortController()
  }
}
// function handleStop() {
//   if (loading.value) {
//     controller.abort()
//     loading.value = false
//   }
// }

// 可优化部分
// 搜索选项计算，这里使用value作为索引项，所以当出现重复value时渲染异常(多项同时出现选中效果)
// 理想状态下其实应该是key作为索引项,但官方的renderOption会出现问题，所以就需要value反renderLabel实现
const searchOptions = computed(() => {
  if (prompt.value.startsWith('/')) {
    return promptTemplate.value.filter((item: { key: string }) => item.key.toLowerCase().includes(prompt.value.substring(1).toLowerCase())).map((obj: { value: any }) => {
      return {
        label: obj.value,
        value: obj.value,
      }
    })
  }
  else {
    return []
  }
})

// value反渲染key
const renderOption = (option: { label: string }) => {
  for (const i of promptTemplate.value) {
    if (i.value === option.label)
      return [i.key]
  }
  return []
}

const placeholder = computed(() => {
  if (isMobile.value)
    return t('chat.placeholderMobile')
  return t('chat.placeholder')
})

// 修改buttonDisabled计算属性
const buttonDisabled = computed(() => {
  const hasUnparsed = fileList.value.some(item => !item.parsed)
  return loading.value || !prompt.value || prompt.value.trim() === '' || hasUnparsed
})
const footerClass = computed(() => {
  let classes = ['p-4']
  if (isMobile.value)
    classes = ['sticky', 'left-0', 'bottom-0', 'right-0', 'p-2', 'pr-3', 'overflow-hidden']
  return classes
})

onMounted(() => {
  scrollToBottom()
  if (inputRef.value && !isMobile.value)
    inputRef.value?.focus()
})

onUnmounted(() => {
  if (loading.value)
    controller.abort()
})


// 新增文件相关状态
interface FileItem {
  file: File
  parsing: boolean
  parsed: boolean
  parsedContent: string // 解析内容字段
}
const fileList = ref<FileItem[]>([])

const fileInputRef = ref<HTMLInputElement | null>(null)

// parseFile函数
const parseFile = async (fileItem: FileItem) => {
  if (fileItem.file.size > 10 * 1024 * 1024) {
    throw new Error('单个文件大小不能超过10MB');
  }

  const formData = new FormData();
  formData.append('file', fileItem.file);

  try {
    // ✅ 使用统一配置的 axios 实例
    const response = await axios.post('/file/parse', formData, {
      headers: {
        // ✅ 自动携带 Token（通过拦截器）
        'Content-Type': 'multipart/form-data' // 必须显式声明
      }
    });

    return response.data;
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    throw new Error(`[${fileItem.file.name}] 上传失败: ${errorMsg}`);
  }
};

// 修改后的文件处理逻辑
const handleFileSelect = async (e: Event) => {
  const input = e.target as HTMLInputElement
  if (input.files?.length) {
    // 1. 验证文件数量
    if (fileList.value.length + input.files.length > 10) {
      ms.error('最多上传10个文件')
      return
    }

    // 2. 验证文件大小
    const oversizedFiles = Array.from(input.files).filter(file => file.size > 10 * 1024 * 1024)
    if (oversizedFiles.length > 0) {
      ms.error(`文件大小超过限制：${oversizedFiles.map(f => f.name).join(', ')}`)
      return
    }

    // 3. 过滤重复文件
    const existingFiles = new Set(fileList.value.map(f => f.file.name));
    const newFiles = Array.from(input.files)
      .filter(file => !existingFiles.has(file.name)).map(file => ({
        file,
        parsing: true,
        parsed: false,
        parsedContent: ""
      }))
    fileList.value = [...fileList.value, ...newFiles]
    ms.success(`已添加 ${input.files.length} 个文件，正在解析中...`)

    // 处理每个文件的解析
    newFiles.forEach(async (fileItem) => {
      try {
        const content = await parseFile(fileItem)
        const target = fileList.value.find(item => item.file === fileItem.file)
        if (target) {
          target.parsing = false
          target.parsed = true
          target.parsedContent = content as string // 保存解析内容
        }
      } catch (error) {
        // 添加类型校验
        if (error instanceof Error) {
          ms.error(error.message)
        } else {
          ms.error('发生未知错误')
        }
        // 移除失败的文件
        fileList.value = fileList.value.filter(item => item.file !== fileItem.file)
      }
    })
  }
  if (input) input.value = '';
}


// 触发文件选择对话框
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const { currentCharacter, setCurrentCharacter } = useCharacter()

// 性格选项
const characterOptions = [
  { label: '严厉型（教师角色）', value: 'strict' },
  { label: '鼓励型（教师角色）', value: 'encouraging' },
  { label: '学霸领学型（同学角色）', value: 'topStudent' },
  { label: '学渣共同进步型（同学角色）', value: 'strugglingStudent' }
]

// 处理性格变更
const handleCharacterChange = (value: CharacterType) => {
  console.log('Character changed to:', value) // 添加日志
  setCurrentCharacter(value)
  if (uuid) {
    chatStore.updateHistory(Number(uuid), { character: value })
    console.log('History updated with character:', value) // 添加日志
  }
}

</script>

<template>
  <div class="flex flex-col w-full h-full bg-green-50">
    <HeaderComponent v-if="isMobile" :using-context="usingContext" @export="handleExport"
      @toggle-using-context="toggleUsingContext" />
    <main class="flex-1 overflow-hidden">
      <div id="scrollRef" ref="scrollRef" class="h-full overflow-hidden overflow-y-auto">
        <div id="image-wrapper" class="w-full max-w-screen-xl m-auto dark:bg-[#101014]"
          :class="[isMobile ? 'p-2' : 'p-4']">
          <div class="flex items-center justify-between p-4 border-b dark:border-neutral-800">
            <div class="flex items-center space-x-4">
              <NSelect v-model:value="currentCharacter" :options="characterOptions"
                :placeholder="('chat.selectCharacter')" @update:value="handleCharacterChange" />
            </div>
          </div>
          <template v-if="!dataSources.length">
            <div class="flex items-center justify-center mt-4 text-center text-neutral-300">
              <SvgIcon icon="ri:bubble-chart-fill" class="mr-2 text-3xl" />
              <span>Aha~</span>
            </div>
          </template>
          <template v-else>
            <div>
              <!-- :templates="templates" -->

              <Message v-for="(item, index) of dataSources" :key="index" :attachments="item.attachments"
                :date-time="item.dateTime" :text="item.text" :inversion="item.inversion" :error="item.error"
                :loading="item.loading" @delete="handleDelete(index)" />
              <div class="sticky bottom-0 left-0 flex justify-center">
                <NButton v-if="loading" type="warning" @click="handleStop">
                  <template #icon>
                    <SvgIcon icon="ri:stop-circle-line" />
                  </template>
                  Stop Responding
                </NButton>
              </div>
            </div>
          </template>
        </div>
      </div>
    </main>
    <footer :class="footerClass">
      <div class="w-full max-w-screen-xl m-auto">
        <!-- 调试信息 -->
        <!-- <div class="text-xs text-red-500 mb-1">
          buttonDisabled: {{ buttonDisabled }}, loading: {{ loading }}
        </div> -->

        <!-- 文件预览区域 -->
        <div v-if="fileList.length" class="mb-2 flex flex-wrap gap-2">
          <div v-for="(fileItem, index) in fileList" :key="index"
            class="flex items-center px-2 py-1 bg-gray-100 dark:bg-neutral-700 rounded">
            <span class="text-sm truncate max-w-xs">{{ fileItem.file.name }}</span>
            <div class="ml-1 flex items-center space-x-1">
              <SvgIcon v-if="fileItem.parsing" icon="ri:loader-4-line" class="text-sm animate-spin text-blue-500" />
              <SvgIcon v-else-if="fileItem.parsed" icon="ri:check-line" class="text-sm text-green-500" />
              <button @click="fileList.splice(index, 1)" class="text-gray-500 hover:text-red-500">
                <SvgIcon icon="ri:close-line" class="text-sm" />
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between space-x-2">
          <!-- 左侧功能按钮组 -->
          <NSwitch v-model:value="active" class="flex-shrink-0 w-20">
            <template #checked>知识库</template>
            <template #unchecked>知识库&nbsp;&nbsp;</template>
          </NSwitch>

          <div class="flex items-center space-x-2">
            <HoverButton @click="handleClear" class="flex-shrink-0">
              <span class="text-xl text-[#4f555e] dark:text-white">
                <SvgIcon icon="ri:delete-bin-line" />
              </span>
            </HoverButton>

            <HoverButton v-if="!isMobile" @click="handleExport" class="flex-shrink-0">
              <span class="text-xl text-[#4f555e] dark:text-white">
                <SvgIcon icon="ri:download-2-line" />
              </span>
            </HoverButton>

            <HoverButton v-if="!isMobile" @click="toggleUsingContext" class="flex-shrink-0">
              <span class="text-xl" :class="{ 'text-[#4b9e5f]': usingContext, 'text-[#a8071a]': !usingContext }">
                <SvgIcon icon="ri:chat-history-line" />
              </span>
            </HoverButton>
          </div>

          <div class="flex flex-1 items-center space-x-2">
            <!-- 文件上传按钮 -->
            <input ref="fileInputRef" type="file" multiple hidden @change="handleFileSelect"
            accept=".pdf,.docx,.csv,.pptx,.txt,.md,.xlsx,.json,.png,.jpg,.jpeg,.xml,.html,.vue,.py,.js,.ts,.java,.cpp,.c,.kt,.rs,.tex">
            <NTooltip trigger="hover" placement="top">
              <template #trigger>
                <HoverButton @click="triggerFileInput" class="flex-shrink-0">
                  <span class="text-xl text-[#4f555e] dark:text-white">
                    <SvgIcon icon="ri:attachment-line" />
                  </span>
                </HoverButton>
              </template>
              <div class="max-w-[200px] text-center text-xs space-y-1">
                <div class="font-medium">支持上传文件</div>
                <div>(最多10个，每个10MB)</div>
                <div class="pt-1 border-t border-gray-200 dark:border-neutral-600">
                  支持格式：PDF, DOCX, PPTX, XLSX, JPG, TXT等
                </div>
              </div>
            </NTooltip>


            <NAutoComplete v-model:value="prompt" :options="searchOptions" :render-label="renderOption"
              class="flex-1 min-w-0">
              <template #default="{ handleInput, handleBlur, handleFocus }">
                <NInput ref="inputRef" v-model:value="prompt" type="textarea" :placeholder="placeholder"
                  :autosize="{ minRows: 1, maxRows: isMobile ? 4 : 8 }" @input="handleInput" @focus="handleFocus"
                  @blur="handleBlur" @keypress="handleEnter" />
              </template>
            </NAutoComplete>
          </div>

          <!-- 发送按钮 -->
          <NButton type="primary" :disabled="buttonDisabled" @click="handleSubmit" class="flex-shrink-0">
            <template #icon>
              <span class="dark:text-black">
                <SvgIcon icon="ri:send-plane-fill" />
              </span>
            </template>
          </NButton>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* 新增样式 */
.max-w-xs {
  max-width: 10rem;
}

/* 确保按钮不会挤压输入框 */
.flex-shrink-0 {
  flex-shrink: 0;
}

/* 输入框自适应 */
.min-w-0 {
  min-width: 0;
}
</style>

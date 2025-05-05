import { defineStore } from 'pinia'
import { getLocalState, setLocalState } from './helper'
import { router } from '@/router'
import { CharacterType } from '@/templates/characterPrompts'
import { useAuthStore } from '../auth'
import axios from '@/utils/request/axios'

const characterInfo = {
  strict: '严厉型（教师角色）',
  encouraging: '鼓励型（教师角色）',
  topStudent: '学霸领学型（同学角色）',
  strugglingStudent: '学渣共同进步型（同学角色）'
}

export const useChatStore = defineStore('chat-store', {
  state: (): Chat.ChatState & {
    isSubmitting: boolean;
    submitTimer: NodeJS.Timeout | null;
  } => ({
    // 合并本地持久化状态和运行时状态
    ...getLocalState(),
    isSubmitting: false,
    submitTimer: null
  }),

  getters: {
    getChatHistoryByCurrentActive(state: Chat.ChatState) {
      const index = state.history.findIndex(item => item.uuid === state.active)
      if (index !== -1)
        return state.history[index]
      return null
    },

    getChatByUuid(state: Chat.ChatState) {
      return (uuid?: number) => {
        if (uuid)
          return state.chat.find(item => item.uuid === uuid)?.data ?? []
        return state.chat.find(item => item.uuid === state.active)?.data ?? []
      }
    },
    currentCharacter(state): string {
      const activeHistory = state.history.find(h => h.uuid === state.active)
      return activeHistory?.character || 'strict'
    },
  },

  actions: {
    setUsingContext(context: boolean) {
      this.usingContext = context
      this.recordState()
    },

    // 修改 addHistory 方法
    addHistory(history: Chat.History, chatData: Chat.Chat[] = []) {
      const authStore = useAuthStore()

      const character = history.character as CharacterType || 'strict'
      const characterDescription = characterInfo[character] || '未知性格类型'

      // 添加用户信息到历史记录
      this.history.unshift({
        ...history,
        character,
        characterDescription,
        creator: {
          username: authStore.user?.username || '未知用户',
          name: authStore.user?.name || '未命名'
        }
      })

      // 更新元数据
      this.meta = {
        exportDate: new Date().toISOString(),
        userInfo: {
          username: authStore.user?.username || '未知用户',
          name: authStore.user?.name || '未命名',
          role: authStore.user?.role || 'USER'
        }
      }

      // 保持原有逻辑
      this.chat.unshift({
        uuid: history.uuid,
        data: chatData,
        character,
        characterDescription
      })

      this.active = history.uuid
      this.reloadRoute(history.uuid)
      this.recordState()
    },


    // 修改 updateHistory 方法
    updateHistory(uuid: number, edit: Partial<Chat.History>) {
      const authStore = useAuthStore()

      const index = this.history.findIndex(item => item.uuid === uuid)
      if (index !== -1) {
        const character = edit.character as CharacterType || this.history[index].character
        const characterDescription = characterInfo[character] || '未知性格类型'

        this.history[index] = {
          ...this.history[index],
          ...edit,
          character,
          characterDescription,
          // 更新创建者信息
          creator: {
            username: authStore.user?.username || this.history[index].creator?.username || '未知用户',
            name: authStore.user?.name || this.history[index].creator?.name || '未命名'
          }
        }

        // 更新元数据
        this.meta = {
          exportDate: new Date().toISOString(),
          userInfo: {
            username: authStore.user?.username || '未知用户',
            name: authStore.user?.name || '未命名',
            role: authStore.user?.role || 'USER'
          }
        }

        // 同时更新对应的聊天记录
        const chatIndex = this.chat.findIndex(item => item.uuid === uuid)
        if (chatIndex !== -1) {
          this.chat[chatIndex] = {
            ...this.chat[chatIndex],
            character,
            characterDescription
          }
        }

        this.recordState()
      }
    },

    async deleteHistory(index: number) {
      this.history.splice(index, 1)
      this.chat.splice(index, 1)

      if (this.history.length === 0) {
        this.active = null
        this.reloadRoute()
        return
      }

      if (index > 0 && index <= this.history.length) {
        const uuid = this.history[index - 1].uuid
        this.active = uuid
        this.reloadRoute(uuid)
        return
      }

      if (index === 0) {
        if (this.history.length > 0) {
          const uuid = this.history[0].uuid
          this.active = uuid
          this.reloadRoute(uuid)
        }
      }

      if (index > this.history.length) {
        const uuid = this.history[this.history.length - 1].uuid
        this.active = uuid
        this.reloadRoute(uuid)
      }
    },

    async setActive(uuid: number) {
      this.active = uuid
      return await this.reloadRoute(uuid)
    },

    getChatByUuidAndIndex(uuid: number, index: number) {
      if (!uuid || uuid === 0) {
        if (this.chat.length)
          return this.chat[0].data[index]
        return null
      }
      const chatIndex = this.chat.findIndex(item => item.uuid === uuid)
      if (chatIndex !== -1)
        return this.chat[chatIndex].data[index]
      return null
    },

    //存储ai回答结果
    async saveChatToServer(uuid: number, chat: Chat.Chat) {
      // 等待500ms确保DOM更新完成
      await new Promise(resolve => setTimeout(resolve, 500))

      // 严格校验响应内容
      if (!chat.response?.trim() || chat.response === '(无回答)') {
        console.error('拒绝保存无效回答:', chat)
        return
      }

      try {
        const authStore = useAuthStore()
        await axios.post('/chat/record', {
          question: chat.text,
          answer: chat.response,
          characterUsed: this.currentCharacter,
          username: authStore.user?.username,
          name: authStore.user?.name
        })
        console.log('✅ 存储成功:', chat)
      } catch (error) {
        console.error('存储失败:', error)
        throw error
      }
    },

    async addChatByUuid(uuid: number, chat: Chat.Chat) {
      if (!uuid || uuid === 0) {
        if (this.history.length === 0) {
          const uuid = Date.now()
          const character = 'strict' as CharacterType
          const characterDescription = characterInfo[character]

          this.history.push({
            uuid,
            title: chat.text,
            isEdit: false,
            character,
            characterDescription
          })

          this.chat.push({
            uuid,
            data: [chat],
            character,
            characterDescription
          })

          this.active = uuid
          this.recordState()
        }
        else {
          this.chat[0].data.push(chat)
          if (this.history[0].title === 'New Chat')
            this.history[0].title = chat.text
          this.recordState()
        }
      }

      const index = this.chat.findIndex(item => item.uuid === uuid)
      if (index !== -1) {
        this.chat[index].data.push(chat)
        if (this.history[index].title === 'New Chat')
          this.history[index].title = chat.text
        this.recordState()
      }
    },

    updateChatByUuid(uuid: number, index: number, chat: Chat.Chat) {
      if (!uuid || uuid === 0) {
        if (this.chat.length) {
          this.chat[0].data[index] = chat
          this.recordState()
        }
        return
      }

      const chatIndex = this.chat.findIndex(item => item.uuid === uuid)
      if (chatIndex !== -1) {
        this.chat[chatIndex].data[index] = chat
        this.recordState()
      }
    },

    updateChatSomeByUuid(uuid: number, index: number, chat: Partial<Chat.Chat>) {
      if (!uuid || uuid === 0) {
        if (this.chat.length) {
          this.chat[0].data[index] = { ...this.chat[0].data[index], ...chat }
          this.recordState()
        }
        return
      }

      const chatIndex = this.chat.findIndex(item => item.uuid === uuid)
      if (chatIndex !== -1) {
        this.chat[chatIndex].data[index] = { ...this.chat[chatIndex].data[index], ...chat }
        this.recordState()
      }
    },

    deleteChatByUuid(uuid: number, index: number) {
      if (!uuid || uuid === 0) {
        if (this.chat.length) {
          this.chat[0].data.splice(index, 1)
          this.recordState()
        }
        return
      }

      const chatIndex = this.chat.findIndex(item => item.uuid === uuid)
      if (chatIndex !== -1) {
        this.chat[chatIndex].data.splice(index, 1)
        this.recordState()
      }
    },

    clearChatByUuid(uuid: number) {
      if (!uuid || uuid === 0) {
        if (this.chat.length) {
          this.chat[0].data = []
          this.recordState()
        }
        return
      }

      const index = this.chat.findIndex(item => item.uuid === uuid)
      if (index !== -1) {
        this.chat[index].data = []
        this.recordState()
      }
    },

    async reloadRoute(uuid?: number) {
      this.recordState()
      await router.push({ name: 'Chat', params: { uuid } })
    },

    // 修改记录状态方法
    recordState() {
      // 在保存前更新元数据
      this.meta = {
        exportDate: new Date().toISOString(),
        userInfo: {
          username: useAuthStore().user?.username || '未知用户',
          name: useAuthStore().user?.name || '未命名',
          role: useAuthStore().user?.role || 'USER'
        }
      }
      setLocalState(this.$state)
    },
  },
})

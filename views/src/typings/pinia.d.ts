import { Chat } from './chat'

declare module 'pinia' {
  export interface PiniaCustomProperties {
    // 声明 saveChatToServer 方法
    saveChatToServer: (uuid: number, chat: Chat.Chat) => Promise<void>
  }
}
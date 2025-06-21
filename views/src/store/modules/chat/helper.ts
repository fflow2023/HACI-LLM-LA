import { ss } from '@/utils/storage'
import { CharacterType } from '@/templates/characterPrompts'

const LOCAL_NAME = 'chatStorage'

export function defaultState(): Chat.ChatState {
  const uuid = Date.now()
  return {
    active: uuid,
    usingContext: true,
    history: [{ 
      uuid, 
      title: 'New Chat', 
      isEdit: false, 
      character: 'Japanese' as CharacterType,
      characterDescription: '日语学习助手'
    }],
    chat: [{ 
      uuid, 
      data: [],
      character: 'Japanese' as CharacterType,
      characterDescription: '日语学习助手'
    }],
  }
}

export function getLocalState(): Chat.ChatState {
  const localState = ss.get(LOCAL_NAME)
  return { ...defaultState(), ...localState }
}

export function setLocalState(state: Chat.ChatState) {
  ss.set(LOCAL_NAME, state)
}

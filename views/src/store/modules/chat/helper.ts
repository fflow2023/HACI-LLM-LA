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
      character: 'strict' as CharacterType,
      characterDescription: '严厉型（教师角色）'
    }],
    chat: [{ 
      uuid, 
      data: [],
      character: 'strict' as CharacterType,
      characterDescription: '严厉型（教师角色）'
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

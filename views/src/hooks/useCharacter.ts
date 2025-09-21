import { ref } from 'vue'
import { CharacterType } from '@/templates/characterPrompts'

export function useCharacter() {
  const currentCharacter = ref<CharacterType>('英语-严厉型')

  function setCurrentCharacter(character: CharacterType) {
    currentCharacter.value = character
  }

  return {
    currentCharacter,
    setCurrentCharacter
  }
}

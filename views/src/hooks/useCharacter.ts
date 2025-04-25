import { ref } from 'vue'
import { CharacterType } from '@/templates/characterPrompts'

export function useCharacter() {
  const currentCharacter = ref<CharacterType>('strict')

  function setCurrentCharacter(character: CharacterType) {
    currentCharacter.value = character
  }

  return {
    currentCharacter,
    setCurrentCharacter
  }
} 
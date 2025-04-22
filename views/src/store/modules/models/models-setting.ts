import { defineStore } from 'pinia'

export const modelsStore = defineStore('modelsStore', {
  state: () => {
    return {
      chatglm: false,
      Chatgpt: false,
      siliconflow: true,
      embedding: 'default',
      Coherekey: '',
      Openaikey: '',
      Coherepath: '',
      Openaipath: '',
    }
  },

})

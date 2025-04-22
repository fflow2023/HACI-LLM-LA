import type { App } from 'vue'
import { createPinia } from 'pinia'

export const store = createPinia()

export function setupStore(app: App) {
  app.use(store)
}

export * from './modules'

export default store

// 可选：类型导出
export * from './modules/editor'
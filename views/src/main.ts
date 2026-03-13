import { createApp } from 'vue'
import App from './App.vue'
import { setupI18n } from './locales'
import { setupAssets, setupScrollbarStyle } from './plugins'
import { setupStore } from './store'

import { setupRouter } from './router'
import '@fortawesome/fontawesome-free/css/all.min.css'

async function bootstrap() {
  // Global debug toggle for console logs
  if (import.meta.env.VITE_GLOB_LOG_DEBUG !== 'true') {
    console.log = () => {}
    console.info = () => {}
    console.debug = () => {}
  }

  const app = createApp(App)
  setupAssets()

  setupScrollbarStyle()

  setupStore(app)

  setupI18n(app)

  await setupRouter(app)

  app.mount('#app')
}

bootstrap()

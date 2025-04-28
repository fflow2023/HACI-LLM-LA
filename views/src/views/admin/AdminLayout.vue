//views\src\views\admin\AdminLayout.vue
<template>
  <div class="admin-layout">
    <AdminHeader />
    <div class="admin-container">
      <AdminSidebar v-model="activeTab" :tabs="tabs" />
      <main class="admin-content">
        <component :is="activeComponent" />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AdminHeader from './components/AdminHeader.vue'
import AdminSidebar from './components/AdminSidebar.vue'
import Overview from './modules/Overview.vue'
import UserManagement from './modules/UserManagement.vue'
import InteractionManagement from './modules/InteractionManagement.vue'
import FileManagement from './modules/FileManagement.vue'
document.title = "AI学习助手-管理页面"
const tabs = ref([
  { id: 'overview', label: '总览', component: Overview},
  { id: 'users', label: '用户管理', component: UserManagement },
  { id: 'interactions', label: '交互记录', component: InteractionManagement },
  { id: 'files', label: '文件上传', component: FileManagement }
])

const activeTab = ref(tabs.value[0].id) // 设置默认页为总览

const activeComponent = computed(() => {
  return tabs.value.find(tab => tab.id === activeTab.value)?.component
})
</script>

<style scoped>
/* 保持原有样式不变 */
.admin-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.admin-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.admin-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}
</style>
//views\src\views\admin\AdminLayout.vue
<template>
  <div class="admin-layout">
    <AdminHeader />
    <div class="admin-container">
      <AdminSidebar v-model="activeTab" :tabs="tabs" />
      <main class="admin-content">
        <component :is="activeComponent" :searchUsername="searchUsername" @search-by-username="handleSearchByUsername"
          @search-complete="searchUsername = ''" />
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
document.title = "AI语言学习助手-管理页面"
const tabs = ref([
  { id: 'overview', label: '总览', component: Overview },
  { id: 'users', label: '用户管理', component: UserManagement },
  { id: 'interactions', label: '交互记录', component: InteractionManagement },
  { id: 'files', label: '文件上传', component: FileManagement }
])

const activeTab = ref(tabs.value[0].id) // 设置默认页为总览

const activeComponent = computed(() => {
  return tabs.value.find(tab => tab.id === activeTab.value)?.component
})

const searchUsername = ref('')
const handleSearchByUsername = (username: string) => {
  searchUsername.value = username
  activeTab.value = 'interactions' // 切换到交互记录页面
  setTimeout(() => {
    searchUsername.value = '';
  }, 1000); //1s后清空
}
</script>

<style scoped>
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
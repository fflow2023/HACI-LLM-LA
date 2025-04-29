<!-- views\src\views\admin\components\AdminHeader.vue -->
<template>
  <header class="admin-header">
    <div class="header-left">
      <h1>AI学习助手管理端</h1>
    </div>
    <div class="header-right">
      <span class="welcome-text">欢迎回来，管理员</span>
      <n-popconfirm
        placement="bottom-end"
        positive-text="确认退出"
        negative-text="取消"
        @positive-click="handleLogout"
      >
        <template #trigger>
          <button class="logout-button">
            <span>退出系统</span>
          </button>
        </template>
        确定要退出管理员账号吗？
      </n-popconfirm>
    </div>
  </header>
</template>

<script setup lang="ts">
import { NPopconfirm } from 'naive-ui'
import { useAuthStore } from '@/store/modules/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const handleLogout = () => {
  authStore.logout()
  router.replace('/login')
}
</script>

<style scoped>
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 32px;
  height: 64px;
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.welcome-text {
  font-size: 14px;
  opacity: 0.9;
}

.logout-button {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(155, 46, 46, 0.734);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.logout-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(198, 60, 60, 0.4);
}

.logout-button svg {
  width: 18px;
  height: 18px;
}
</style>
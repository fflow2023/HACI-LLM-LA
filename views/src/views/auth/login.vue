<template>
  <div class="login-container">
    <h1>用户登录</h1>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>用户名</label>
        <input v-model="username" type="text" required />
      </div>
      <div class="form-group">
        <label>密码</label>
        <input v-model="password" type="password" required />
      </div>
      <button type="submit">登录</button>
    </form>
  </div>
</template>

<script lang="ts" setup>
import { nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/modules/auth'

const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)
const username = ref('')
const password = ref('')

const handleSubmit = async () => {
  try {
    isLoading.value = true

    // 1. 双重验证机制
    const storedToken = localStorage.getItem('token')
    if (!authStore.token || !storedToken) {
      throw new Error('Token 存储失败，请检查本地存储权限')
    }
    
    await authStore.login({ username: username.value, password: password.value })
    
    // 等待状态更新
    await nextTick()

    console.log('用户角色:', authStore.user?.role)

    // 2. 路由跳转前验证用户角色
    if (authStore.isAdmin) {
      router.push('/admin'); 
      console.log("admin")
    } else {
      router.push('/chat');  
      console.log("user")
    }

  } catch (error: any) {
    // 3. 增强错误分类处理
    const errorMessage = error.response?.data?.message 
      || error.message 
      || '未知网络错误'
      
    alert(`登录失败: ${errorMessage}`)
    
    // 4. 敏感操作日志（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.error('登录调试信息:', {
        username: username.value,
        error: error.stack
      })
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
}

input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  width: 100%;
  padding: 0.75rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
<!-- 暂时规定，username是学号， name是姓名 -->

<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="login-title">欢迎登录</h1>

      <form @submit.prevent="handleSubmit" class="login-form">
        <!-- 学号输入 -->
        <div class="form-group">
          <label class="input-label">学号</label>
          <input v-model="username" type="text" required placeholder="请输入学号" class="form-input"
            :class="{ 'input-error': errors.username }" @input="validateUsername">
          <div v-if="errors.username" class="error-message">{{ errors.username }}</div>
        </div>

        <!-- 密码输入 -->
        <div class="form-group">
          <label class="input-label">密码</label>
          <input v-model="password" type="password" required placeholder="请输入密码" class="form-input"
            :class="{ 'input-error': errors.password }" @input="validatePassword">
          <div v-if="errors.password" class="error-message">{{ errors.password }}</div>
        </div>

        <!-- 提交按钮 -->
        <button type="submit" class="submit-btn" :disabled="isSubmitting || !formValid"
          :class="{ 'btn-loading': isSubmitting }">
          <span v-if="!isSubmitting">立即登录</span>
          <span v-else class="loading-text">
            <span class="loading-dot">●</span> 登录中...
          </span>
        </button>

        <!-- 辅助功能区 -->
        <div class="auth-actions">
          <!-- 暂时注释忘记密码功能（TODO：后续按需开发）
          <router-link to="/reset-password" class="auth-link">忘记密码？</router-link>
          <div class="auth-divider">|</div>
          -->
          <router-link to="/register" class="auth-link">注册新账号</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/modules/auth'

const router = useRouter()
const authStore = useAuthStore()

// 表单数据
const username = ref('')
const password = ref('')

// 验证状态
const errors = ref({
  username: '',
  password: ''
})

// 加载状态
const isSubmitting = ref(false)

// 表单验证状态
const formValid = computed(() => {
  return username.value.length > 0 &&
    password.value.length > 0 &&
    !errors.value.username &&
    !errors.value.password
})

// 验证逻辑
const validateUsername = () => {
  errors.value.username =
    username.value.length >= 9 ? '' : '学号至少需要9个字符'
}

const validatePassword = () => {
  errors.value.password =
    password.value.length >= 8 ? '' : '密码至少需要8个字符'
}

// 提交处理
const handleSubmit = async () => {
  validateUsername()
  validatePassword()

  if (!formValid.value) return

  try {
    isSubmitting.value = true
    await authStore.login({
      username: username.value,
      password: password.value
    })

    // 登录成功后跳转
    const redirectPath = authStore.isAdmin ? '/admin' : '/chat'
    router.push(redirectPath)

  } catch (error: any) {
    // 增强错误处理
    const errorMessage = error.response?.data?.message || error.message
    errors.value.password = errorMessage

  } finally {
    isSubmitting.value = false
    password.value = '' // 清空密码字段
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f8fafc;
  padding: 2rem;
}

.login-card {
  background: white;
  width: 100%;
  max-width: 440px;
  padding: 2.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.login-title {
  text-align: center;
  font-size: 1.75rem;
  color: #1e293b;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.input-label {
  display: block;
  margin-bottom: 0.5rem;
  color: #475569;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 0.875rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.input-error {
  border-color: #ef4444;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.submit-btn {
  width: 100%;
  padding: 1rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-top: 1.5rem;
}

.submit-btn:hover {
  background-color: #2563eb;
}

.submit-btn:disabled {
  background-color: #94a3b8;
  cursor: not-allowed;
}

.btn-loading {
  position: relative;
  opacity: 0.8;
}

.loading-text {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.loading-dot {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

.auth-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
  color: #64748b;
}

/* 保留样式以便后续恢复功能
.auth-divider {
  color: #cbd5e1;
}
*/

.auth-link {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
  transition: opacity 0.2s;
}

.auth-link:hover {
  opacity: 0.8;
  text-decoration: underline;
}
</style>

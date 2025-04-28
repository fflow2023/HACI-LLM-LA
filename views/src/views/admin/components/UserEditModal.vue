//views\src\views\admin\components\UserEditModal.vue
<template>
    <div v-if="visible" class="modal-mask">
      <div class="modal-wrapper">
        <div class="modal-container">
          <div class="modal-header">
            <h3>编辑用户信息</h3>
            <button class="close-btn" @click="close">×</button>
          </div>
  
          <div class="modal-body">
            <form @submit.prevent="handleSubmit">
              <div class="form-group">
                <label>用户名</label>
                <input v-model="form.username" required>
              </div>
              
              <div class="form-group">
                <label>邮箱</label>
                <input v-model="form.email" required>
              </div>
  
              <div class="form-group">
                <label>用户角色</label>
                <select v-model="form.role" class="role-select">
                  <option value="ADMIN">管理员</option>
                  <option value="USER">普通用户</option>
                </select>
              </div>
  
              <div class="form-actions">
                <button type="button" class="reset-pwd" @click="handleResetPassword">
                  {{ resettingPwd ? '重置中...' : '重置密码' }}
                </button>
                <button type="submit" class="save" :disabled="saving">
                  {{ saving ? '保存中...' : '保存更改' }}
                </button>
              </div>
            </form>
          </div>
  
          <div v-if="error" class="error-message">
            {{ error }}
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, watch } from 'vue'
  import { updateUser, resetPassword, type User } from '@/api/admin'
  
  const props = defineProps<{
    visible: boolean
    user: User | null
  }>()
  
  const emit = defineEmits(['close', 'updated'])
  watch(() => props.user, (user) => {
  if (user) {
    form.value = {
      username: user.username,
      email: user.email,
      role: user.role as 'ADMIN' | 'USER'
    }
  }
}, { immediate: true })


  const form = ref({
    username: '',
    email: '',
    role: 'USER' as 'ADMIN' | 'USER'
  })
  
  const saving = ref(false)
  const resettingPwd = ref(false)
  const error = ref('')
  
  watch(() => props.user, (user) => {
    if (user) {
      form.value = {
        username: user.username,
        email: user.email,
        role: user.role
      }
    }
  })
  
  const close = () => {
    error.value = ''
    emit('close')
  }
  
// 提交处理逻辑
const handleSubmit = async () => {
  if (!props.user) return
  
  try {
    saving.value = true
    error.value = ''
    
    const { data, error: apiError } = await updateUser(props.user.id, form.value)
    if (apiError) throw new Error(apiError)
    
    emit('updated')
    close()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
  } finally {
    saving.value = false
  }
}

// 密码重置逻辑
const handleResetPassword = async () => {
  if (!props.user || resettingPwd.value) return
  
  try {
    resettingPwd.value = true
    const confirm = window.confirm('确定要重置该用户的密码吗？')
    if (!confirm) return

    const { error } = await resetPassword(props.user.id)
    if (error) throw new Error(error)
    
    alert('密码已重置为默认值: Ab123456')
  } catch (err) {
    error.value = err instanceof Error ? err.message : '重置失败'
  } finally {
    resettingPwd.value = false
  }
}
  </script>
  
  <style scoped>
  .modal-mask {
    position: fixed;
    z-index: 9998;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .modal-container {
    width: 500px;
    background: white;
    border-radius: 8px;
    padding: 20px;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .close-btn {
    font-size: 24px;
    cursor: pointer;
    background: none;
    border: none;
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 5px;
  }
  
  .form-group input, .role-select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .form-actions {
    margin-top: 20px;
    display: flex;
    justify-content: space-between;
  }
  
  .save {
    background: #409eff;
    color: white;
  }
  
  .reset-pwd {
    background: #f56c6c;
    color: white;
  }
  
  button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .error-message {
    color: #f56c6c;
    padding: 10px;
    margin-top: 10px;
  }
  </style>
//views\src\views\admin\modules\UserManagement.vue
<template>
  <div class="user-management">
    <div class="header">
      <h2>用户管理</h2>
      <button @click="loadUsers" :disabled="loading">
        {{ loading ? '加载中...' : '刷新数据' }}
      </button>
    </div>

    <div v-if="error" class="error">
      {{ error }}
    </div>

    <table v-if="!loading && users.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>用户名</th>
          <th>姓名</th>
          <th>角色</th>
          <th>注册时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.id }}</td>
          <td>{{ user.username }}</td>
          <td>{{ user.name }}</td>
          <td :class="user.role">{{ user.role }}</td>
          <td>{{ formatDate(user.created_at) }}</td>
          <td class="actions">
            <button class="view-btn" @click="handleView(user.id)">
              查看记录
            </button>
            <button class="edit-btn" @click="handleEdit(user.id)">
              修改信息
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else-if="!loading" class="empty">
      没有找到用户数据
    </div>
    <UserEditModal :visible="showEditModal" :user="selectedUser" @close="showEditModal = false"
      @updated="handleUserUpdated" />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchUsers, type User } from '@/api/admin'
import UserEditModal from '@/views/admin/components/UserEditModal.vue'
const users = ref<User[]>([])
const loading = ref(false)
const error = ref('')

const loadUsers = async () => {
  try {
    loading.value = true
    error.value = ''

    const result = await fetchUsers()
    if (result.error) {
      throw new Error(result.error)
    }
    users.value = result.data

  } catch (err: unknown) {
    if (err instanceof Error) {
      error.value = err.message
    } else {
      error.value = '发生未知错误'
    }
  } finally {
    loading.value = false
  }
}

const formatDate = (timestamp: string | number) => {
  return new Date(timestamp).toLocaleString()
}

// 初始化加载
onMounted(loadUsers)

//点击处理函数
const handleView = (userId: number) => {
  console.log('查看用户记录:', userId)
  // 这里可以添加路由跳转逻辑或打开模态框
}


// 打开编辑表单逻辑
const showEditModal = ref(false)
const selectedUser = ref<User | null>(null)
  const handleEdit = (userId: number) => {
  const user = users.value.find(u => u.id === userId)
  if (user) {
    selectedUser.value = { ...user }
    showEditModal.value = true
  }
}
const handleUserUpdated = () => {
  loadUsers()
}
</script>

<style scoped>
.actions {
  min-width: 160px;
  text-align: center;
}

.actions button {
  padding: 6px 12px;
  margin: 2px;
  font-size: 12px;
  border-radius: 3px;
  transition: all 0.3s;
}

.view-btn {
  background: #409eff;
  color: white;
}

.edit-btn {
  background: #67c23a;
  color: white;
}

.view-btn:hover {
  background: #3375b9;
}

.edit-btn:hover {
  background: #529b2d;
}

.user-management {
  padding: 20px;
  width: 100%;
  /* 确保容器占满宽度 */
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

button {
  padding: 8px 16px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background: #a0cfff;
  cursor: not-allowed;
}

/* 调整表格列宽 */
table {
  width: 100%;
  table-layout: fixed;
  /* 启用固定布局 */
  border-collapse: collapse;
  margin-top: 15px;
}

th,
td {
  padding: 12px;
  border: 1px solid #ebeef5;
  text-align: left;
}

th {
  background-color: #f5f7fa;
}

tr:nth-child(even) {
  background-color: #fafafa;
}

.error {
  color: #f56c6c;
  padding: 10px;
  background: #fef0f0;
  margin: 15px 0;
  border-radius: 4px;
}

.empty {
  color: #909399;
  padding: 20px;
  text-align: center;
}

.admin {
  color: #67c23a;
}

.user {
  color: #909399;
}
</style>
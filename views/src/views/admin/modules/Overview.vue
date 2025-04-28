<template>
  <div class="dashboard">
    <h2>系统总览</h2>
    
    <div class="stats-container">
      <!-- 用户统计卡片 -->
      <div class="stat-card">
        <div class="card-icon user-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
          </svg>
        </div>
        <div class="card-content">
          <div class="stat-value">{{ loading ? '加载中...' : userCount.toLocaleString() }}</div>
          <div class="stat-title">总注册用户</div>
        </div>
        <div v-if="error" class="error-tip">
          <span>⚠️ 数据加载失败</span>
          <button @click="loadData" class="retry-btn">重试</button>
        </div>
      </div>

      <!-- 可扩展的其他统计卡片 -->
      <div class="stat-card coming-soon">
        <div class="card-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
        </div>
        <div class="card-content">
          <div class="stat-value">敬请期待</div>
          <div class="stat-title">更多统计指标</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchUserCount } from '@/api/admin'  // 导入真实接口

const userCount = ref(0)
const loading = ref(true)
const error = ref('')

const loadData = async () => {
  try {
    loading.value = true
    error.value = ''
    
    const { data, error: apiError } = await fetchUserCount()
    
    if (apiError) throw new Error(apiError)
    userCount.value = data
    
  } catch (err) {
    error.value = err instanceof Error ? err.message : '数据加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.dashboard {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

h2 {
  color: #2c3e50;
  margin-bottom: 2rem;
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  position: relative;
  min-height: 140px;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.card-icon {
  width: 48px;
  height: 48px;
  background: #f0f7ff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.card-icon svg {
  width: 24px;
  height: 24px;
  fill: #409eff;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
}

.stat-title {
  color: #7f8c8d;
  font-size: 14px;
}

.error-tip {
  position: absolute;
  bottom: 16px;
  color: #f56c6c;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.retry-btn {
  padding: 4px 8px;
  background: #fef0f0;
  border: 1px solid #f56c6c;
  color: #f56c6c;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: #f56c6c;
  color: white;
}

.coming-soon {
  opacity: 0.6;
  background: #f8f9fa;
}
</style>
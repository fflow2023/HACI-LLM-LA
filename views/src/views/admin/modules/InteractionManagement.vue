//views\src\views\admin\modules\InteractionManagement.vue
<template>
  <div class="interaction-management">
    <h2>交互记录管理</h2>

    <div class="filter-form">
      <div class="form-row">
        <div class="form-item">
          <label>姓名：</label>
          <input v-model="filterParams.name" type="text" placeholder="输入姓名">
        </div>
        <div class="form-item">
          <label>学号：</label>
          <input v-model="filterParams.username" type="text" placeholder="输入学号">
        </div>
        <div class="form-item">
          <label>角色模式：</label>
          <select v-model="filterParams.characterUsed">
            <option value="">全部</option>
            <option value="strict">严格型</option>
            <option value="encouraging">鼓励型</option>
            <option value="topStudent">学霸领学型</option>
            <option value="strugglingStudent">学渣共同进步型</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-item">
          <label>开始时间：</label>
          <input v-model="filterParams.startTime" type="datetime-local">
        </div>
        <div class="form-item">
          <label>结束时间：</label>
          <input v-model="filterParams.endTime" type="datetime-local">
        </div>
        <div class="form-actions">
          <button @click="handleSearch" :disabled="loading">搜索</button>
          <button class="reset" @click="handleReset">重置</button>
          <button class="export-btn" @click="exportToCSV" :disabled="exportLoading">
            {{ exportLoading ? '导出中...' : '导出' }}
          </button>
        </div>
      </div>
      <div class="stats-summary" v-if="!loading && records.length">
        <div class="stats-row">
          <div class="stat-item" v-for="(stat, key) in roleStats" :key="key">
            <span class="stat-label">{{ stat.name }}：</span>
            <span class="stat-value">{{ stat.count }}</span>
            <span class="stat-percent">({{ stat.percent }}%)</span>
          </div>
          <div class="stat-total">总计：{{ total }}</div>
        </div>
      </div>
    </div>

    <div v-if="error" class="error">
      {{ error }}
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <table v-if="!loading && records.length">
      <thead>
        <tr>
          <th>ID</th>
          <th>学号</th>
          <th>姓名</th>
          <th style="width: 25%">问题内容</th>
          <th style="width: 25%">回答内容</th>
          <th>角色模式</th>
          <th>时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="record in records" :key="record.id">
          <td>{{ record.id }}</td>
          <td>{{ record.username }}</td>
          <td>{{ record.name }}</td>
          <td class="content-cell" @click="showDetail(record.question)">
            <div class="content">
              {{ truncateText(record.question) }}
            </div>
          </td>
          <td class="content-cell" @click="showDetail(record.answer)">
            <div class="content">
              {{ truncateText(record.answer) }}
            </div>
          </td>
          <td>{{ getRoleName(record.characterUsed) }}</td>
          <td>{{ formatDate(record.created_at) }}</td>
        </tr>
      </tbody>
    </table>

    <div v-else-if="!loading" class="empty">
      未找到匹配的交互记录
    </div>

    <div class="pagination" v-if="total > 0">
      <button :disabled="currentPage === 1" @click="handlePageChange(currentPage - 1)">
        上一页
      </button>
      <span>第 {{ currentPage }} 页 / 共 {{ totalPages }} 页</span>
      <button :disabled="currentPage >= totalPages" @click="handlePageChange(currentPage + 1)">
        下一页
      </button>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="showDialog" class="dialog-mask" @click.self="showDialog = false">
      <div class="dialog-content">
        <div class="dialog-header">
          <h1>详情</h1>
          <button class="close-btn" @click="showDialog = false">&times;</button>
        </div>
        <div class="dialog-body">
          <pre>{{ currentContent }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, defineProps } from 'vue'
import { fetchChatRecords, fetchChatRecordCount, type ChatRecord, getCharacterStats,CharacterStats } from '@/api/admin'


const props = defineProps({
  searchUsername: {
    type: String,
    default: ''
  }
})


// 筛选参数
const filterParams = ref({
  name: '',
  username: props.searchUsername || '',
  characterUsed: '',
  startTime: '',
  endTime: ''
})

// 监听props变化
watch(() => props.searchUsername, (newUsername) => {
  if (newUsername) {
    filterParams.value.username = newUsername
    handleSearch()
  }
})
// 分页参数
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 数据状态
const records = ref<ChatRecord[]>([])
const loading = ref(false)
const error = ref('')

// 弹窗相关状态
const showDialog = ref(false)
const currentContent = ref('')

// 角色类型映射
const roleMap = {
  strict: '严格型',
  encouraging: '鼓励型',
  topStudent: '学霸领学型',
  strugglingStudent: '学渣共同进步型'
}

// 计算总页数
const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

// 日期格式化
const formatDate = (timestamp: string) => {
  return new Date(timestamp).toLocaleString()
}

// 获取角色中文名称
const getRoleName = (role: string) => {
  return roleMap[role as keyof typeof roleMap] || role
}

// 文本截断处理
const truncateText = (text: string, maxLength = 100) => {
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

// 显示详情弹窗
const showDetail = (content: string) => {
  currentContent.value = content
  showDialog.value = true
}


const characterStats = ref<CharacterStats>({
  strict: 0,
  encouraging: 0,
  topStudent: 0,
  strugglingStudent: 0,
  total: 0
})
// 加载数据
const loadData = async () => {
  try {
    loading.value = true
    error.value = ''

    // 获取统计数据
    const [countRes, statsRes] = await Promise.all([
      fetchChatRecordCount(filterParams.value),
      getCharacterStats(filterParams.value)
    ])
    
    if (countRes.error) throw new Error(countRes.error)
    if (statsRes.error) throw new Error(statsRes.error)
    
    total.value = countRes.data
    characterStats.value = statsRes.data

    // 获取分页数据
    const res = await fetchChatRecords({
      ...filterParams.value,
      page: currentPage.value - 1,
      pageSize: pageSize.value
    })
    if (res.error) throw new Error(res.error)
    records.value = res.data

  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : '加载数据失败'
  } finally {
    loading.value = false
  }
}


// 搜索处理
const handleSearch = () => {
  currentPage.value = 1
  loadData()
}

// 重置筛选
const handleReset = () => {
  filterParams.value = {
    name: '',
    username: '',
    characterUsed: '',
    startTime: '',
    endTime: ''
  }
  handleSearch()
}

// 分页变化
const handlePageChange = (page: number) => {
  currentPage.value = page
  loadData()
}
const roleStats = computed(() => {
  const { strict, encouraging, topStudent, strugglingStudent, total } = characterStats.value
  return [
    { 
      name: '严格型',
      count: strict,
      percent: total > 0 ? ((strict / total) * 100).toFixed(1) : '0.0'
    },
    { 
      name: '鼓励型',
      count: encouraging,
      percent: total > 0 ? ((encouraging / total) * 100).toFixed(1) : '0.0'
    },
    { 
      name: '学霸型',
      count: topStudent,
      percent: total > 0 ? ((topStudent / total) * 100).toFixed(1) : '0.0'
    },
    { 
      name: '学渣型',
      count: strugglingStudent,
      percent: total > 0 ? ((strugglingStudent / total) * 100).toFixed(1) : '0.0'
    }
  ]
})
// 初始加载
onMounted(loadData)

// 添加导出状态
const exportLoading = ref(false)

const exportToCSV = async () => {
  try {
    exportLoading.value = true
    error.value = ''

    // 获取所有数据
    const res = await fetchChatRecords(filterParams.value)
    if (res.error) throw new Error(res.error)
    const recordsToExport = res.data

    if (!recordsToExport.length) {
      error.value = '没有可导出的数据'
      return
    }


    // 添加UTF-8 BOM头
    const BOM = '\uFEFF';

    const headers = ['ID', '学号', '姓名', '问题内容', '回答内容', '角色模式', '时间'];
    const csvRows = [
      headers.join(','),
      ...recordsToExport.map(record => [
        record.id,
        record.username,
        escapeCsvField(record.name),
        escapeCsvField(record.question),
        escapeCsvField(record.answer),
        getRoleName(record.characterUsed),
        formatDate(record.created_at)
      ].join(','))
    ];

    // 使用带BOM的UTF-8编码
    const csvContent = BOM + csvRows.join('\r\n');
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `交互记录_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);

  } catch (err) {
    error.value = err instanceof Error ? err.message : '导出失败';
    console.error('导出失败:', err);
  } finally {
    exportLoading.value = false;
  }
};

// 专用CSV字段转义函数
const escapeCsvField = (value: string) => {
  if (value == null) return '""';
  // 转义双引号，并用双引号包裹整个字段
  return `"${String(value).replace(/"/g, '""')}"`;
};

</script>

<style scoped>
.interaction-management {
  padding: 20px;
  position: relative;
}

.filter-form {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  margin: 20px 0;
}

.form-row {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}

.form-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-item input,
.form-item select {
  padding: 6px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  min-width: 200px;
}

.form-actions {
  margin-left: auto;
  display: flex;
  gap: 10px;
}

button {
  padding: 8px 16px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.2s;
}

button:hover {
  opacity: 0.9;
}

button.reset {
  background: #909399;
}

button:disabled {
  background: #a0cfff;
  cursor: not-allowed;
}

table {
  width: 100%;
  margin: 20px 0;
  border-collapse: collapse;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

th,
td {
  padding: 12px;
  border: 1px solid #ebeef5;
  text-align: left;
}

th {
  background-color: #f5f7fa;
  font-weight: 600;
}

.content-cell {
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
  max-width: 400px;
}

.content-cell:hover {
  background: #f8f9fa;
}

.content {
  max-height: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  line-height: 1.5;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 20px;
}

.error {
  color: #f56c6c;
  padding: 10px;
  background: #fef0f0;
  border-radius: 4px;
  margin: 15px 0;
}

.empty,
.loading {
  text-align: center;
  padding: 20px;
  color: #909399;
}

/* 弹窗样式 */
.dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s;
}

.dialog-content {
  background: white;
  border-radius: 8px;
  width: 80%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s;
}

.dialog-header {
  padding: 16px 24px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.close-btn {
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  background: none;
  border: none;
  color: #909399;
  padding: 0 8px;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #606266;
}

.dialog-body {
  flex: 1;
  padding: 20px;
  overflow: auto;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.stats-summary {
  display: inline-block;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 12px;
  /* 调整间距 */
  white-space: nowrap;
  /* 防止换行 */
  overflow-x: auto;
  /* 如果内容过长，允许横向滚动 */
}

.stat-item {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.stat-label {
  color: #666;
}

.stat-value {
  font-weight: bold;
  margin: 0 2px;
}

.stat-percent {
  color: #888;
}

.stat-total {
  font-weight: bold;
  margin-left: 8px;
}

.stat-item:not(:last-child)::after {
  content: "|";
  color: #ddd;
  margin-left: 8px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.export-btn {
  padding: 8px 16px;
  background: #67c23a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.export-btn:hover {
  opacity: 0.9;
}

.export-btn:disabled {
  background: #b3e19d;
  cursor: not-allowed;
}
</style>
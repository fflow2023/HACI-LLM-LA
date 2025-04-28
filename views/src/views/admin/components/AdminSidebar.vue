//views\src\views\admin\components\AdminSidebar.vue
<template>
  <aside class="admin-sidebar">
    <nav>
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="menu-item"
        :class="{ active: modelValue === tab.id }"
        @click="$emit('update:modelValue', tab.id)"
      >
        {{ tab.label }}
      </button>
    </nav>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  tabs: Array<{ id: string; label: string }> // 接收来自父组件的配置
}>()
</script>

<style scoped>
.admin-sidebar {
  width: 220px;
  background-color: #34495e;
  color: white;
  padding: 20px 0;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 12px 20px;
  color: white;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s;
}

.menu-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.menu-item.active {
  background-color: #42b983;
}
</style>
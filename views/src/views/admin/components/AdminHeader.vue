<template>
    <header class="admin-header">
      <div class="header-left">
        <h1>Admin Dashboard</h1>
      </div>
      <div class="header-right">
        <span>Welcome, Admin</span>
        <!-- 可以添加用户头像、通知等 -->
      </div>
    </header>
  </template>
  
  <script setup lang="ts"></script>
  
  <style scoped>
  .admin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px;
    height: 60px;
    background-color: #2c3e50;
    color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  </style>
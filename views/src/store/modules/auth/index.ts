import { defineStore } from 'pinia'
import type { LoginParams } from './types'

interface RequestConfig {
  headers?: Record<string, string>
  timeout?: number
}

// 增强类型定义
interface UserInfo {
  username: string
  role: 'USER' | 'ADMIN' // 严格使用大写枚举
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: null as UserInfo | null, // 严格类型约束
  }),

  actions: {
    async login(credentials: LoginParams, config?: RequestConfig) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), config?.timeout || 5000)

        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...config?.headers
          },
          body: JSON.stringify(credentials),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || `登录失败 (HTTP ${response.status})`)
        }

        const data = await response.json()

        console.log('[AuthStore] 原始响应数据:', JSON.stringify(data, null, 2))

        // 严格校验数据结构
        if (!data.access_token || !data.user?.username || !data.user?.role) {
          throw new Error('无效的响应结构：缺少必要字段')
        }

        // 关键修复：标准化角色值为大写
        const normalizedUser = {
          username: data.user.username,
          role: data.user.role.toUpperCase() as UserInfo['role'] // 强制转换类型
        }

        // ✅ 新增类型校验
        if (!['USER', 'ADMIN'].includes(normalizedUser.role)) {
          throw new Error(`非法的角色值: ${normalizedUser.role}`)
        }

        // 更新状态
        this.token = data.access_token
        this.user = normalizedUser // 存储标准化后的用户数据
        localStorage.setItem('token', data.access_token)

        // 调试日志
        console.log('[AuthStore] 用户信息已更新:', this.user)

        return data
      } catch (error: any) {
        console.error('[AuthStore] 登录请求失败:', error)
        let message = error.message

        if (error.name === 'AbortError') {
          message = '请求超时，请检查网络'
        } else if (error.message.includes('Failed to fetch')) {
          message = '网络连接异常'
        }

        throw new Error(message)
      }
    },

    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('token')
    }
  },

  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'ADMIN' // 精确匹配
  }
})
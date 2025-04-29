import { defineStore } from 'pinia'
import type { LoginParams } from './types'
import type { RegisterParams } from './types'


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
    token: localStorage.getItem('access_token') || null,
    user: localStorage.getItem('userRole') || null,
  }),

  actions: {    
    initAuthState() {
      if (typeof window !== 'undefined') { // 安全判断
        this.token = localStorage.getItem('access_token') || '',
        this.user = localStorage.getItem('userRole') || 'USER'
      }
    },
    
    //登录请求
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
        this.user = normalizedUser.role // 存储标准化后的用户数据
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('userRole', normalizedUser.role)

        // 调试日志
        console.log('[AuthStore] 用户信息已更新:', this.user)
        console.log('[AuthStore] 当前用户token:', this.token)

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

    //注册请求
    async register(credentials: RegisterParams, config?: RequestConfig) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), config?.timeout || 5000)

        const response = await fetch('/api/auth/register', {
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
          throw new Error(errorData.message || `注册失败 (HTTP ${response.status})`)
        }

        const data = await response.json()

        // 注册成功后的通用处理（根据业务需求调整）
        console.log('[AuthStore] 注册成功:', data)

        return data // 返回原始响应数据
      } catch (error: any) {
        console.error('[AuthStore] 注册请求失败:', error)
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
      localStorage.removeItem('access_token')
      localStorage.removeItem('userRole') // 同步清理
    }
  },

  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user === 'ADMIN' // 精确匹配
  }
})
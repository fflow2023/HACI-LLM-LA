import { defineStore } from 'pinia'
import type { LoginParams } from './types'
import type { RegisterParams } from './types'
import axios from '@/utils/request/axios'


interface RequestConfig {
  headers?: Record<string, string>
  timeout?: number
}
// ... (UserInfo interface remains same)
export interface UserInfo {
  username: string
  name: string    // 新增姓名字段
  role: 'USER' | 'ADMIN'
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('access_token') || null,
    user: JSON.parse(localStorage.getItem('userInfo') || 'null') as UserInfo | null
  }),

  actions: {    
    initAuthState() {
      if (typeof window !== 'undefined') { // 安全判断
        this.token = localStorage.getItem('access_token') || ''
        const userInfo = localStorage.getItem('userInfo')
        this.user = userInfo ? JSON.parse(userInfo) : null
      }
    },
    
    //登录请求
    async login(credentials: LoginParams, config?: RequestConfig) {
      try {
        const response = await axios.post('auth/login', credentials, {
          headers: config?.headers,
          timeout: config?.timeout || 5000
        }) as any

        const data = response

        console.log('[AuthStore] 登录成功响应:', JSON.stringify(data, null, 2))

        // 验证响应数据（根据后端实际返回结构调整）
        if (!data.access_token || !data.user?.username || !data.user?.role || !data.user?.name) {
          throw new Error('登录响应数据不完整')
        }

        // 构造完整用户信息对象
        const normalizedUser: UserInfo = {
          username: data.user.username,
          name: data.user.name,
          role: data.user.role.toUpperCase() as UserInfo['role']
        }

        // 更新状态
        this.token = data.access_token
        this.user = normalizedUser
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('userInfo', JSON.stringify(normalizedUser))

        return data
      } catch (error: any) {
        console.error('[AuthStore] 登录失败:', error)
        const message = error.response?.data?.message || error.message || '登录失败'
        throw new Error(message)
      }
    },

    //注册请求
    async register(credentials: RegisterParams, config?: RequestConfig) {
      try {
        const response = await axios.post('auth/register', credentials, {
          headers: config?.headers,
          timeout: config?.timeout || 5000
        }) as any

        console.log('[AuthStore] 注册成功:', response)
        return response
      } catch (error: any) {
        console.error('[AuthStore] 注册失败:', error)
        const message = error.response?.data?.message || error.message || '注册失败'
        throw new Error(message)
      }
    },


    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('access_token')
      localStorage.removeItem('userInfo')  // 同步修改清理项
    }
  },

  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'ADMIN'
  }
})
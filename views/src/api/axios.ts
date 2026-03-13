//views\src\api\axios.ts
/* eslint-disable prefer-promise-reject-errors */
import type {  AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import axios from 'axios'

import { useMessage } from 'naive-ui'
const instance = axios.create({
  baseURL: import.meta.env.VITE_GLOB_API_URL || '/api',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  },
  // timeout: 5000,
})

instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
const message = useMessage()
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 返回 401 清除token信息并跳转到登录页面
          message.error('401')
          localStorage.removeItem('access_token')
          localStorage.removeItem('userInfo')
          break;
        case 403:
          message.error('403')
          break
        case 404:
          message.error('404')
          break
        case 500:
          message.error('500')
      }
    }
    return await Promise.reject()
  },
)

export default instance

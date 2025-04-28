import axios, {
  type AxiosInstance,
} from 'axios';
import { router } from '@/router'

// 创建强类型实例
const service: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 5000,
  withCredentials: false
});

// 请求拦截器
service.interceptors.request.use(config => {
  // ✅ 自动附加 Token（已登录用户后续请求需要）
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log('[AXIOS] 当前请求路径:', config.url)
  console.log('[AXIOS] 请求头:', config.headers)
  return config;
});

// 响应拦截器（关键修改）
service.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      router.push({
        path: '/login',
        query: {
          expired: '1',
          redirect: router.currentRoute.value.fullPath
        }
      })
    }
    return Promise.reject(error)
  }
);

export default service;
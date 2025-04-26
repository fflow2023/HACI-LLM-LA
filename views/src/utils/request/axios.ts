import axios, {
  type AxiosInstance,
} from 'axios';

// 创建强类型实例
const service: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 5000,
  withCredentials: true
});

// 请求拦截器
service.interceptors.request.use(config => {
  // ✅ 自动附加 Token（已登录用户后续请求需要）
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器（关键修改）
service.interceptors.response.use(
  response => {
    // ✅ 统一剥离响应包装层
    return response.data.data; 
  },
  error => {
    // ✅ 统一处理 HTTP 错误
    return Promise.reject(error.response?.data || error.message);
  }
);

export default service;
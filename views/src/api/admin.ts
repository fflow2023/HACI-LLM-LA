// src/api/admin.ts



// 类型定义
export interface User {
  id: string
  username: string
  email: string
  is_admin: boolean
  created_at: string
  last_login?: string
  avatar?: string
}

export interface InteractionLog {
  id: string
  user_id: string
  action_type: string
  content: string
  ip_address: string
  timestamp: string
}

export interface RAGFile {
  file_id: string
  file_name: string
  file_size: number
  file_type: string
  namespace: string
  uploader: string
  uploaded_at: string
  chunk_count: number
  status: 'processing' | 'completed' | 'failed'
}

// 请求参数类型
export interface PaginationParams {
  page: number
  page_size: number
}

export interface UserQueryParams extends PaginationParams {
  search?: string
  is_admin?: boolean
}

export interface LogQueryParams extends PaginationParams {
  user_id?: string
  action_type?: string
  start_time?: string
  end_time?: string
}

export interface FileQueryParams extends PaginationParams {
  namespace?: string
  status?: RAGFile['status']
}

// 响应类型
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  current_page: number
  total_pages: number
}

// API 方法
export const adminApi = {
  // 用户管理
  
  // 交互记录
  
  // 知识库管理
};


// 导出类型
export type {

}
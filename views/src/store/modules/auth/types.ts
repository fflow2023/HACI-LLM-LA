export interface LoginParams {
  username: string
  password: string
}

export interface RegisterParams {
  username: string
  name: string
  password: string
  confirmPassword?: string // 前端二次验证密码字段
}

export interface UserInfo {
  username: string
  role: 'USER' | 'ADMIN'
}
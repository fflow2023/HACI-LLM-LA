// src/api/admin.ts
export interface User {
    id: number
    username: string
    email: string
    role: 'ADMIN' | 'USER' 
    created_at: string
}

async function executeSQL(sql: string): Promise<{ data: any; error?: string }> {
    try {
        const response = await fetch(import.meta.env.VITE_VIEWS_ADDRESS + '/api/sql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sql })
        })

        if (!response.ok) {
            return {
                data: null,
                error: `HTTP错误: ${response.status} ${response.statusText}`
            }
        }

        const result = await response.json()
        return { data: result.data || result }

    } catch (error) {
        return {
            data: null,
            error: error instanceof Error ? error.message : '网络请求失败'
        }
    }
}
// 获取用户列表
export async function fetchUsers(): Promise<{ data: User[]; error?: string }> {
    const result = await executeSQL("SELECT id, username, email, role, created_at FROM users")
    return {
        data: result.data as User[],
        error: result.error
    }
}
export async function fetchUserCount(): Promise<{ data: number; error?: string }> {
    const result = await executeSQL("SELECT COUNT(*) as user_count FROM users")
    
    if (result.error) {
      return { data: 0, error: result.error }
    }
    
    const count = result.data?.[0]?.user_count || result.data?.[0]?.['COUNT(*)'] || 0
    return { data: Number(count) }
  }

export async function updateUser(
    userId: number, 
    updateData: { username: string; email: string; role: string }
): Promise<{ data?: User; error?: string }> {
    // 参数校验
    if (!['ADMIN', 'USER'].includes(updateData.role)) {
        return { error: '无效的用户角色' }
    }

    const sql = `
        UPDATE users
        SET 
            username = '${updateData.username.replace(/'/g, "''")}', 
            email = '${updateData.email.replace(/'/g, "''")}', 
            role = '${updateData.role}'
        WHERE id = ${userId};
        
        SELECT id, username, email, role, created_at 
        FROM users 
        WHERE id = ${userId};
    `

    const result = await executeSQL(sql)
    if (result.data?.length > 0) {
        return { data: result.data[0] as User }
    }
    return { error: result.error || '用户更新失败' }
}

// 重置用户密码
export async function resetPassword(
    userId: number
): Promise<{ error?: string }> {
    // 默认密码设为Ab123456
    const defaultPasswordHash = '$2a$10$8z7Yv0nOVdM5vD9aVlg06eeMDgqfr80xxgTkqzOI5SklAi.0oxrPa'
    
    const sql = `
        UPDATE users 
        SET password = '${defaultPasswordHash}' 
        WHERE id = ${userId}
    `

    const result = await executeSQL(sql)
    if (result.error) {
        return { error: result.error }
    }
    return {}
}
<template>
    <div class="register-container">
        <div class="register-card">
            <h1 class="register-title">注册新账户</h1>

            <form @submit.prevent="handleSubmit" class="register-form">
                <!-- 添加学号输入 -->
                <div class="form-group">
                    <label class="input-label">学号</label>
                    <input v-model="form.username" type="text" required placeholder="请输入9位学号" class="form-input"
                        @input="validateUsername" maxlength="9">
                    <div class="input-hint" :class="{ 'text-error': errors.username }">
                        {{ errors.username || '学号为9位数字' }}
                    </div>
                </div>

                <!-- 添加姓名输入 -->
                <div class="form-group">
                    <label class="input-label">姓名</label>
                    <input v-model="form.name" type="text" required placeholder="请输入真实姓名" class="form-input"
                        @input="validateName">
                    <div class="input-hint" :class="{ 'text-error': errors.name }">
                        {{ errors.name || '请输入中文姓名' }}
                    </div>
                </div>

                <!-- 密码输入 -->
                <div class="form-group">
                    <label class="input-label">密码</label>
                    <input v-model="form.password" type="password" required placeholder="8-16位，包含大小写字母和数字"
                        class="form-input" @input="validatePassword">
                    <div class="password-rules">
                        <span :class="{ 'rule-valid': hasLowerCase }">至少1个小写字母</span>
                        <span :class="{ 'rule-valid': hasUpperCase }">至少1个大写字母</span>
                        <span :class="{ 'rule-valid': hasNumber }">至少1个数字</span>
                        <span :class="{ 'rule-valid': hasValidLength }">8-16个字符</span>
                    </div>
                </div>

                <!-- 确认密码 -->
                <div class="form-group">
                    <label class="input-label">确认密码</label>
                    <input v-model="form.confirmPassword" type="password" required placeholder="再次输入密码"
                        class="form-input" @input="validateConfirmPassword">
                    <div class="text-error" v-if="errors.confirmPassword">
                        {{ errors.confirmPassword }}
                    </div>
                </div>

                <!-- 操作按钮 -->
                <div class="action-buttons">
                    <button type="submit" class="submit-btn" :disabled="isSubmitting || !formValid">
                        <span v-if="!isSubmitting">立即注册</span>
                        <span v-else class="loading">
                            <span class="loading-dot">●</span> 正在注册...
                        </span>
                    </button>
                    <button class="login-btn" @click="navigateToLogin">
                        已有账号？立即登录
                    </button>
                </div>
            </form>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/modules/auth'

const router = useRouter()
const authStore = useAuthStore()

// 表单数据
const form = ref({
    username: '',
    name: '',
    password: '',
    confirmPassword: ''
})

// 验证状态
const errors = ref({
    username: '',
    name: '',
    password: '',
    confirmPassword: ''
})

// 加载状态
const isSubmitting = ref(false)

// 密码规则验证
const hasLowerCase = computed(() => /[a-z]/.test(form.value.password))
const hasUpperCase = computed(() => /[A-Z]/.test(form.value.password))
const hasNumber = computed(() => /\d/.test(form.value.password))
const hasValidLength = computed(() =>
    form.value.password.length >= 8 &&
    form.value.password.length <= 16
)

// 整体表单验证
const formValid = computed(() => {
    return (
        form.value.username &&
        form.value.name &&
        form.value.password &&
        form.value.confirmPassword &&
        !errors.value.username &&
        !errors.value.name &&
        !errors.value.password &&
        !errors.value.confirmPassword &&
        hasLowerCase.value &&
        hasUpperCase.value &&
        hasNumber.value &&
        hasValidLength.value
    )
})

// 验证方法
const validateName = () => {
    const name = form.value.name
    errors.value.name =
    name.length >= 2 && name.length <= 10
            ? ''
            : '姓名需要2-10位字符'
}

// 修改学号验证
const validateUsername = () => {
    const isValid = /^\d{9}$/.test(form.value.username)
    errors.value.username = isValid
        ? ''
        : '学号必须为9位数字'
}

const validatePassword = () => {
    const pass = form.value.password
    errors.value.password =
        pass.length >= 8 &&
            /[a-z]/.test(pass) &&
            /[A-Z]/.test(pass) &&
            /\d/.test(pass)
            ? ''
            : '密码必须包含大小写字母和数字'
}

const validateConfirmPassword = () => {
    errors.value.confirmPassword =
        form.value.password === form.value.confirmPassword
            ? ''
            : '两次输入的密码不一致'
}

// 提交处理
const handleSubmit = async () => {
    validateUsername()
    validatePassword()
    validateConfirmPassword()

    if (!formValid.value) return

    try {
        isSubmitting.value = true
        await authStore.register({
            username: form.value.username,
            name: form.value.name,
            password: form.value.password
        })

        // 注册成功处理
        router.push({
            path: '/login',
            query: {
                registered: 'true',
                username: form.value.username
            }
        })
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message
        alert(`注册失败: ${errorMessage}`)
    } finally {
        isSubmitting.value = false
        form.value.password = ''
        form.value.confirmPassword = ''
    }
}

const navigateToLogin = () => {
    router.push('/login')
}
</script>

<style scoped>
.register-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background: #f8fafc;
}

.register-card {
    background: white;
    width: 100%;
    max-width: 480px;
    padding: 2.5rem;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.register-title {
    text-align: center;
    font-size: 1.75rem;
    color: #1e293b;
    margin-bottom: 2rem;
}

.form-group {
    margin-bottom: 1.5rem;
}

.input-label {
    display: block;
    margin-bottom: 0.5rem;
    color: #475569;
    font-weight: 500;
}

.form-input {
    width: 100%;
    padding: 0.875rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s;
}

.form-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.text-error {
    color: #ef4444;
    font-size: 0.875rem;
    margin-top: 0.5rem;
}

.password-rules {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    margin-top: 1rem;
    font-size: 0.875rem;
    color: #64748b;
}

.rule-valid {
    color: #10b981;
    position: relative;
    padding-left: 1.25rem;
}

.rule-valid::before {
    content: "✓";
    position: absolute;
    left: 0;
}

.action-buttons {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-top: 2rem;
}

.submit-btn {
    width: 100%;
    padding: 1rem;
    background-color: #3b82f6;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
}

.submit-btn:hover {
    background-color: #2563eb;
}

.submit-btn:disabled {
    background-color: #94a3b8;
    cursor: not-allowed;
}

.login-btn {
    background: none;
    color: #3b82f6;
    border: 1px solid #3b82f6;
    padding: 0.875rem;
    border-radius: 8px;
    transition: all 0.2s;
}

.login-btn:hover {
    background-color: #eff6ff;
}

.loading {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

.loading-dot {
    animation: pulse 1.5s infinite;
}

@keyframes pulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.5;
    }
}
</style>
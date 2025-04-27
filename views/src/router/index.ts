import type { App } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHashHistory } from 'vue-router'
import { ChatLayout } from '@/views/chat/layout'
import EditorView from '@/views/Editor/ContentEditor.vue'
import AdminPanelView from '@/views/admin/AdminPanel.vue'
import LoginView from "@/views/auth/login.vue" 
import { useAuthStore } from '@/store/modules/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/login' 
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresAuth: false } // 明确标记无需认证
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/register.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: AdminPanelView,
    meta: { 
      requiresAuth: true,
      allowedRoles: ['ADMIN'] // 仅允许管理员访问
    }
  },
  {
    path: '/editor', // 访问路径
    name: 'Editor',
    component: EditorView
  },
  {
    path: '/generator',
    name: 'Generator',
    component: () => import('@/views/Editor/Generator.vue')
  },
  {
    path: '/chat',
    name: 'chat',
    component: ChatLayout,
    children: [
      {
        path: '/chat/:uuid?',
        name: 'Chat',
        component: () => import('@/views/chat/index.vue'),
      },
    ],
  },

  {
    path: '/404',
    name: '404',
    component: () => import('@/views/exception/404/index.vue'),
  },

  {
    path: '/500',
    name: '500',
    component: () => import('@/views/exception/500/index.vue'),
  },

  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    redirect: '/404',
  },

]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ left: 0, top: 0 }),
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // 无需认证的路由直接放行
  if (!to.meta.requiresAuth) return next()

  // 未登录跳转登录页
  if (!authStore.isAuthenticated) {
    return next({
      name: 'Login',
      query: { redirect: to.fullPath }
    })
  }

  // 角色权限校验（添加类型保护）
  const requiredRoles = to.meta.allowedRoles as string[]
  if (requiredRoles) {
    const userRole = authStore.user?.role
    if (!userRole || !requiredRoles.includes(userRole)) {
      return next('/chat')
    }
  }

  next()
})


export async function setupRouter(app: App) {
  app.use(router)
  await router.isReady()
}


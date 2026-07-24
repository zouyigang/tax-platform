/* ============================================================
 * 路由 · 全部业务页作为 MainLayout 的子路由（共用侧栏）
 * 静态演示工程使用 hash 路由,便于任意静态服务器/文件直开。
 * ============================================================ */
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import DashboardView from '@/views/DashboardView.vue'
import PlaceholderView from '@/views/PlaceholderView.vue'
import { NAV_ITEMS } from '@/config/nav'

// 由导航配置生成占位路由（本轮未实现的页面）
const placeholderRoutes: RouteRecordRaw[] = NAV_ITEMS.filter((n) => !n.built).map((n) => ({
  path: n.to.replace(/^\//, '').split('?')[0],
  name: n.name,
  component: PlaceholderView,
  meta: { nav: n.name },
}))

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        name: '领导驾驶舱',
        component: DashboardView,
        meta: { nav: '领导驾驶舱' },
      },
      ...placeholderRoutes,
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router

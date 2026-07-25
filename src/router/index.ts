/* ============================================================
 * 路由 · 全部业务页作为 MainLayout 的子路由（共用侧栏）
 * 路由由 menu.ts 唯一菜单配置生成:
 *   - status='done'        映射到真实页面组件;
 *   - status='placeholder' 统一落 PlaceholderView 占位页。
 * 静态演示工程使用 hash 路由,便于任意静态服务器/文件直开。
 * ============================================================ */
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import type { Component } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import DashboardView from '@/views/DashboardView.vue'
import RiskPoolView from '@/views/RiskPoolView.vue'
import CluesView from '@/views/CluesView.vue'
import ArchiveView from '@/views/ArchiveView.vue'
import RuleConfigView from '@/views/RuleConfigView.vue'
import QaView from '@/views/QaView.vue'
import GraphView from '@/views/GraphView.vue'
import RevenueAnalysisView from '@/views/decision/RevenueAnalysisView.vue'
import TaxSourceAnalysisView from '@/views/decision/TaxSourceAnalysisView.vue'
import EffectivenessAnalysisView from '@/views/decision/EffectivenessAnalysisView.vue'
import TopicAnalysisView from '@/views/decision/TopicAnalysisView.vue'
import PlaceholderView from '@/views/PlaceholderView.vue'
import { MENU_LEAVES } from '@/config/menu'

// 已实现叶子 key → 真实组件(其余走占位页)
const DONE_VIEWS: Record<string, Component> = {
  dashboard: DashboardView,
  'risk-pool': RiskPoolView,
  clues: CluesView,
  archive: ArchiveView,
  'rules-config': RuleConfigView,
  'app-qa': QaView,
  'model-graph': GraphView,
  'decision-revenue': RevenueAnalysisView,
  'decision-tax-source': TaxSourceAnalysisView,
  'decision-effectiveness': EffectivenessAnalysisView,
  'decision-topic': TopicAnalysisView,
}

// 由菜单叶子生成子路由:去掉前导斜杠作为相对路径,meta.nav 供高亮/占位页取用
const menuRoutes: RouteRecordRaw[] = MENU_LEAVES.map((leaf) => ({
  path: leaf.path.replace(/^\//, ''),
  name: leaf.key,
  component: leaf.status === 'done' ? DONE_VIEWS[leaf.key] ?? PlaceholderView : PlaceholderView,
  meta: { nav: leaf.key, title: leaf.title },
}))

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', redirect: '/dashboard' },
      ...menuRoutes,
      // 核查处置工作台按线索逐条办理:/clues/:id 复用同一组件(菜单项 /clues 为引导空态)
      {
        path: 'clues/:id',
        name: 'clues-detail',
        component: CluesView,
        meta: { nav: 'clues', title: '核查处置工作台' },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router

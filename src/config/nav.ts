/* ============================================================
 * 全局导航配置 · 侧栏与路由共用
 * 依据《平台侧栏》组件的 9 个菜单项 + 《交互说明》1.1 的跳转关系。
 * built=false 的页面本轮尚未实现,统一指向占位页。
 * ============================================================ */

export interface NavItem {
  /** 菜单名称（同时作为路由 meta.nav,用于高亮匹配） */
  name: string
  /** 行首图标字符（与设计稿一致） */
  icon: string
  /** 路由路径 */
  to: string
  /** 红色角标数值（待处置数量等）,可空 */
  badge?: string
  /** 是否已实现:false 指向占位页 */
  built: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { name: '领导驾驶舱', icon: '▤', to: '/dashboard', built: true },
  // 角标数值应来自全局待处置线索数,本轮先沿用设计稿静态值 137
  { name: '风险线索工作台', icon: '▦', to: '/clues', badge: '137', built: false },
  { name: '风险规则配置', icon: '▧', to: '/rules', built: false },
  { name: '核查任务管理', icon: '▥', to: '/tasks', built: false },
  { name: '一户式档案', icon: '▤', to: '/archive', built: false },
  { name: '关联图谱分析', icon: '◈', to: '/graph', built: false },
  { name: '政策智能问答', icon: '✦', to: '/qa', built: false },
  { name: '统计报表', icon: '▧', to: '/reports', built: false },
  { name: '系统管理', icon: '⚙', to: '/system', built: false },
]

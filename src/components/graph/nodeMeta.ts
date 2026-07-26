/* ============================================================
 * 图谱节点类型 → 图标 / 名称
 * 属前端 UI 文本(后端只下发 type),颜色取 charts/palette 的 GRAPH_NODE_COLOR。
 * 关联图谱分析页与虚开团伙识别页共用,保证同一类型在两页长得一样。
 * ============================================================ */
import type { GraphNodeType } from '@/api/types'

/** 节点类型元信息 */
export const TYPE_META: Record<GraphNodeType, { name: string; icon: string }> = {
  ent: { name: '企业', icon: '企' },
  person: { name: '人员', icon: '人' },
  fund: { name: '资金账户', icon: '￥' },
  invoice: { name: '受票企业', icon: '票' },
}

/** 图例展示顺序 */
export const TYPE_ORDER: GraphNodeType[] = ['ent', 'person', 'fund', 'invoice']

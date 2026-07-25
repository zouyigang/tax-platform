/* ============================================================
 * 图表配色 · 前端设计令牌(后端不返回颜色)
 * 取值 1:1 对应《设计系统》「图表配色序列 · 8 色」与各页设计稿。
 * ============================================================ */

/** 图表配色序列 · 8 色(首色为政务蓝) */
export const CHART_SERIES = [
  '#1D5A99', // 1 政务蓝
  '#2E8DA6', // 2 青
  '#5FA8D3', // 3 浅蓝
  '#4E9D6B', // 4 绿
  '#C9A227', // 5 金
  '#D97B3F', // 6 橙
  '#B0574E', // 7 砖红
  '#7A6FA6', // 8 紫
]

/** 分税种环形配色(末项「其他税种」用紫,与设计稿一致) */
export const DONUT_COLORS = ['#1D5A99', '#2E8DA6', '#5FA8D3', '#4E9D6B', '#C9A227', '#7A6FA6']

/** 数据源增收贡献柱状配色 */
export const SOURCE_COLORS = ['#1D5A99', '#2E8DA6', '#5FA8D3', '#4E9D6B', '#C9A227', '#7A6FA6']

/** 风险任务闭环漏斗配色(自浅至深) */
export const FUNNEL_COLORS = ['#5FA8D3', '#3E7AAA', '#2E6B9E', '#215C90', '#16436F']

/** 分区县条形:按排名着色 —— 第 1 名最深,前 3 名主色,其余浅蓝 */
export function districtColor(rank: number): string {
  if (rank === 0) return '#16436F'
  if (rank < 3) return '#1D5A99'
  return '#5FA8D3'
}

/** 进销项对比配色(销项主色 / 进项浅蓝) */
export const INVOICE_IO = {
  /** 销项 */
  output: '#1D5A99',
  /** 进项 */
  input: '#5FA8D3',
}

/** 趋势图配色 */
export const TREND = {
  /** 实际入库(实线) */
  actual: '#1D5A99',
  /** 预测值(虚线) */
  forecast: '#97A3B0',
  /** 数据点圆心填充(白底描边圆点) */
  symbolFill: '#FFFFFF',
  /** 实际值下方面积填充透明度 */
  areaOpacity: 0.06,
  /** 网格线 */
  splitLine: '#EAEEF3',
  /** 坐标轴文字 */
  axisLabel: '#97A3B0',
  /** X 轴月份文字 */
  monthLabel: '#6E7C8B',
}

/** 规则效果监测·双轴折线配色(命中量=政务蓝 / 命中率=金) */
export const RULE_EFFECT = {
  /** 命中量(左轴,实线 + 面积) */
  count: '#1D5A99',
  /** 命中率(右轴,金色实线) */
  rate: '#C9A227',
  /** 数据点圆心填充 */
  symbolFill: '#FFFFFF',
  /** 命中量面积填充透明度 */
  areaOpacity: 0.06,
  /** 水平网格线 */
  splitLine: '#EAEEF3',
  /** 坐标轴刻度文字 */
  axisLabel: '#97A3B0',
  /** X 轴月份文字 */
  monthLabel: '#6E7C8B',
}

/** 关联图谱·节点类型配色(SVG 不能消费 CSS 变量,故与图表同置此处) */
export const GRAPH_NODE_COLOR: Record<'ent' | 'person' | 'fund' | 'invoice', string> = {
  ent: '#1D5A99', // 企业 · 政务蓝
  person: '#2E8DA6', // 人员 · 青
  fund: '#6E7C8B', // 资金账户 · 中性灰
  invoice: '#C9A227', // 受票企业 · 金
}

/** 关联图谱·连线与文字配色 */
export const GRAPH_EDGE = {
  /** 与选中节点相连的高亮线 */
  active: '#1D5A99',
  /** 强关联(实线) */
  strong: '#B7C2CE',
  /** 弱关联(虚线) */
  weak: '#DAE0E7',
  /** 选中节点外环 */
  selectedRing: '#1D5A99',
  /** 连线标签文字 */
  label: '#6E7C8B',
  /** 文字白色描边(避免压线) */
  halo: '#FFFFFF',
  /** 节点名称文字 */
  nodeLabel: '#1C2733',
  /** 节点内图标文字 */
  nodeIcon: '#FFFFFF',
}

// KPI 顶部色条与变化文案的取色已迁移:
//   色条 → tokens.css 的 --kpi-accent-*(由 MetricCard 直接引用)
//   文案 → components/common/tone.ts 的 DELTA_TONE(映射到 .tone-* 类)

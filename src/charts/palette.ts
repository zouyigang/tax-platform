/* ============================================================
 * 图表配色 · 前端设计令牌(后端不返回颜色)
 * 取值 1:1 对应《设计系统》「图表配色序列 · 8 色」与各页设计稿。
 * ============================================================ */
import type { DeltaTone, KpiAccent } from '@/api/types'

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

/** KPI 卡片顶部色条:语义 → 色值 */
export const KPI_ACCENT: Record<KpiAccent, string> = {
  primary: '#1D5A99',
  teal: '#2E7E93',
  green: '#4E9D6B',
  gold: '#C9A227',
  red: '#C0392B',
}

/** KPI 变化文案:语义 → 色值 */
export const DELTA_TONE: Record<DeltaTone, string> = {
  positive: '#2E8757',
  negative: '#C0392B',
  neutral: '#6E7C8B',
}

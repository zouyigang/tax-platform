/* ============================================================
 * 枚举 → 语气(tone) / 展示文案 映射
 * 颜色由 styles/tone.css 的 .tone-* 类承载,此处只做语义映射。
 * 展示文案属前端 UI 文本,不依赖后端下发。
 * ============================================================ */
import type {
  ClueStatus,
  DeltaTone,
  MatchStatus,
  RiskLevel,
  RuleStatus,
  SourceStatus,
  Tone,
} from '@/api/types'

/** 可用语气名(在 Tone 基础上增加「待派发」专用色) */
export type ToneName = Tone | 'pending'

/** 语气 → CSS 类名 */
export function toneClass(tone: ToneName): string {
  return `tone-${tone}`
}

/** 风险等级 → 语气 */
export const RISK_TONE: Record<RiskLevel, ToneName> = {
  high: 'danger',
  mid: 'warn',
  low: 'gold',
}

/** 风险等级 → 展示文案 */
export const RISK_LABEL: Record<RiskLevel, string> = {
  high: '高风险',
  mid: '中风险',
  low: '低风险',
}

/** 线索状态 → 语气 */
export const CLUE_STATUS_TONE: Record<ClueStatus, ToneName> = {
  pending: 'pending',
  processing: 'primary',
  done: 'success',
  returned: 'neutral',
}

/** 线索状态 → 展示文案 */
export const CLUE_STATUS_LABEL: Record<ClueStatus, string> = {
  pending: '待派发',
  processing: '处置中',
  done: '已办结',
  returned: '已退回',
}

/** 指标变化语义 → 语气 */
export const DELTA_TONE: Record<DeltaTone, ToneName> = {
  positive: 'success',
  negative: 'danger',
  neutral: 'neutral',
}

/** 规则状态 → 语气 */
export const RULE_STATUS_TONE: Record<RuleStatus, ToneName> = {
  enabled: 'success',
  testing: 'primary',
  disabled: 'neutral',
  draft: 'gold',
}

/** 规则状态 → 展示文案 */
export const RULE_STATUS_LABEL: Record<RuleStatus, string> = {
  enabled: '启用',
  testing: '试跑中',
  disabled: '停用',
  draft: '草稿',
}

/** 数据源接入状态 → 语气 */
export const SOURCE_STATUS_TONE: Record<SourceStatus, ToneName> = {
  normal: 'success',
  delayed: 'warn',
  interrupted: 'danger',
  offline: 'neutral',
}

/** 数据源接入状态 → 展示文案 */
export const SOURCE_STATUS_LABEL: Record<SourceStatus, string> = {
  normal: '正常',
  delayed: '延迟',
  interrupted: '中断',
  offline: '未接入',
}

/** 主体匹配状态 → 语气 */
export const MATCH_STATUS_TONE: Record<MatchStatus, ToneName> = {
  matched: 'success',
  pending: 'pending',
  conflict: 'danger',
  rejected: 'neutral',
}

/** 主体匹配状态 → 展示文案 */
export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  matched: '已匹配',
  pending: '待确认',
  conflict: '存在冲突',
  rejected: '已排除',
}

/* ============================================================
 * 枚举 → 语气(tone) / 展示文案 映射
 * 颜色由 styles/tone.css 的 .tone-* 类承载,此处只做语义映射。
 * 展示文案属前端 UI 文本,不依赖后端下发。
 * ============================================================ */
import type {
  BackfillStatus,
  ClueStatus,
  DeltaTone,
  GangPattern,
  GangStatus,
  KeySourceStatus,
  MatchStatus,
  RiskLevel,
  RuleStatus,
  RuleVerdict,
  SourceStatus,
  Tone,
  TrialStatus,
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

/** 结果回填状态 → 语气 */
export const BACKFILL_STATUS_TONE: Record<BackfillStatus, ToneName> = {
  pending: 'pending',
  draft: 'primary',
  submitted: 'success',
  returned: 'danger',
}

/** 结果回填状态 → 展示文案 */
export const BACKFILL_STATUS_LABEL: Record<BackfillStatus, string> = {
  pending: '待回填',
  draft: '草稿',
  submitted: '已提交',
  returned: '被退回',
}

/** 试跑任务状态 → 语气 */
export const TRIAL_STATUS_TONE: Record<TrialStatus, ToneName> = {
  queued: 'neutral',
  running: 'primary',
  done: 'success',
  failed: 'danger',
}

/** 试跑任务状态 → 展示文案 */
export const TRIAL_STATUS_LABEL: Record<TrialStatus, string> = {
  queued: '排队中',
  running: '运行中',
  done: '已完成',
  failed: '失败',
}

/** 规则评估结论 → 语气 */
export const VERDICT_TONE: Record<RuleVerdict, ToneName> = {
  effective: 'success',
  tuning: 'warn',
  retire: 'danger',
}

/** 规则评估结论 → 展示文案 */
export const VERDICT_LABEL: Record<RuleVerdict, string> = {
  effective: '有效',
  tuning: '待优化',
  retire: '建议下线',
}

/** 团伙结构模式 → 展示文案 */
export const GANG_PATTERN_LABEL: Record<GangPattern, string> = {
  ring: '环状',
  star: '星状',
  chain: '链状',
}

/** 团伙结构模式 → 说明(列表内二行小字) */
export const GANG_PATTERN_NOTE: Record<GangPattern, string> = {
  ring: '闭环互开',
  star: '一票多流',
  chain: '层层过票',
}

/** 团伙核查状态 → 语气 */
export const GANG_STATUS_TONE: Record<GangStatus, ToneName> = {
  new: 'pending',
  checking: 'primary',
  confirmed: 'danger',
  excluded: 'neutral',
}

/** 团伙核查状态 → 展示文案 */
export const GANG_STATUS_LABEL: Record<GangStatus, string> = {
  new: '待核查',
  checking: '核查中',
  confirmed: '已确认',
  excluded: '已排除',
}

/** 重点税源监控状态 → 语气 */
export const KEY_STATUS_TONE: Record<KeySourceStatus, ToneName> = {
  normal: 'success',
  watch: 'primary',
  declining: 'warn',
  alert: 'danger',
}

/** 重点税源监控状态 → 展示文案 */
export const KEY_STATUS_LABEL: Record<KeySourceStatus, string> = {
  normal: '正常',
  watch: '关注',
  declining: '下降',
  alert: '预警',
}

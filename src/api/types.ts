/* ============================================================
 * API 接口契约 · 唯一来源
 * ------------------------------------------------------------
 * 本文件可直接当后端接口文档使用:每个字段均带中文注释。
 * 约定:
 *   - 所有 client 方法返回 Promise<数据体>（已剥离 HTTP 包裹层）。
 *   - 颜色/图表色由前端依据设计令牌分配,后端只返回「语义 + 数值」,
 *     因此本契约里不出现具体 hex(个别语义枚举除外)。
 *   - 金额、占比等展示格式化在前端完成,后端返回原始数值/已约定字符串。
 *   - mock 与 http 两套适配器都实现 ApiClient 接口,签名完全一致。
 * 本轮接口按「领导驾驶舱」页面定义。
 * ============================================================ */

/* ========================================================================
 * 一、领导驾驶舱（Dashboard）
 * ====================================================================== */

/** 统计周期:本月 / 本季 / 本年 */
export type DashboardPeriod = 'month' | 'quarter' | 'year'

/** 领导驾驶舱全局查询参数（时间 + 区县,作用于所有图表区块） */
export interface DashboardQuery {
  /** 统计周期 */
  period: DashboardPeriod
  /** 区县代码;'all' 表示全市 */
  districtCode: string
}

/** 通用下拉/分段选项 */
export interface DashboardFilterOption {
  /** 选项值（周期枚举值 或 区县代码） */
  value: string
  /** 选项展示名 */
  label: string
}

/** 页面顶部筛选条 + 元信息 */
export interface DashboardFilters {
  /** 数据更新时间,格式 YYYY-MM-DD HH:mm */
  updatedAt: string
  /** 可选统计周期（本月/本季/本年） */
  periods: DashboardFilterOption[]
  /** 默认选中周期 */
  defaultPeriod: DashboardPeriod
  /** 可选区县（含「全市」,置于首位） */
  districts: DashboardFilterOption[]
  /** 默认区县代码（全市 = 'all'） */
  defaultDistrictCode: string
}

/** KPI 卡片顶部色条语义 */
export type KpiAccent = 'primary' | 'teal' | 'green' | 'gold' | 'red'
/** KPI 变化文案语义（决定文字颜色） */
export type DeltaTone = 'positive' | 'negative' | 'neutral'

/** 指标卡片（顶部指标区,共 5 张） */
export interface KpiCard {
  /** 指标键（稳定标识） */
  key: string
  /** 指标名称 */
  label: string
  /** 指标数值（已按展示格式化,如 "8.62" / "137" / "78.5"） */
  value: string
  /** 单位（亿元 / % / 户 / 万元） */
  unit: string
  /** 顶部色条语义色 */
  accent: KpiAccent
  /** 变化/补充文案（如 "▲ 6.4%" / "待处置 137 户"） */
  delta: string
  /** 变化文案语义（正向绿 / 负向红 / 中性灰） */
  deltaTone: DeltaTone
  /** 变化说明（同比 / 环比 / 较上季 / 超序时 / 剩余） */
  deltaNote: string
  /** 点击跳转的前端路由（见《交互说明》1.2）;空字符串表示不可点 */
  linkTo: string
}

/** 税收收入趋势 · 单个数据点 */
export interface RevenueTrendPoint {
  /** 月份标签（如 "8月"） */
  month: string
  /** 税收收入（亿元） */
  value: number
  /** 是否预测值:true=虚线灰,false=实线蓝 */
  isForecast: boolean
}

/** 税收收入趋势（近 12 个月） */
export interface RevenueTrend {
  /** 单位（亿元） */
  unit: string
  /** 序列（按时间升序,实际值在前、预测值在后,衔接点归属实际值） */
  points: RevenueTrendPoint[]
}

/** 分税种收入结构 · 单个税种 */
export interface TaxTypeShare {
  /** 税种名称 */
  name: string
  /** 占比（百分数,合计约 100） */
  pct: number
}

/** 分税种收入结构（环形图） */
export interface TaxTypeStructure {
  /** 环心文案（税收总额,如 "8.62亿"） */
  totalLabel: string
  /** 各税种占比（按占比降序,末项通常为「其他税种」） */
  segments: TaxTypeShare[]
}

/** 分区县收入完成情况 · 单个区县（已按完成率降序返回） */
export interface DistrictCompletion {
  /** 区县名称 */
  name: string
  /** 预算完成率（百分数） */
  pct: number
}

/** 综合治税成效 · 单个数据源增收贡献 */
export interface SourceContribution {
  /** 数据源名称（市场监管 / 社保 / 不动产 …） */
  name: string
  /** 增收贡献（万元） */
  value: number
}

/** 风险任务闭环 · 单个环节 */
export interface FunnelStage {
  /** 环节名称（推送 / 派发 / 处置 / 命中 / 入库） */
  name: string
  /** 该环节任务数量 */
  value: number
}

/** 风险任务闭环漏斗 */
export interface RiskTaskFunnel {
  /** 5 个环节（按流程顺序） */
  stages: FunnelStage[]
  /** 整体入库转化率（百分数 = 入库 / 推送） */
  overallConversion: number
}

/** 领导驾驶舱接口分组 */
export interface DashboardApi {
  /** 顶部筛选项 + 数据更新时间 */
  getDashboardFilters(): Promise<DashboardFilters>
  /** 顶部 5 张指标卡 */
  getRevenueKpis(query: DashboardQuery): Promise<KpiCard[]>
  /** 税收收入趋势（近 12 个月） */
  getRevenueTrend(query: DashboardQuery): Promise<RevenueTrend>
  /** 分税种收入结构（环形） */
  getTaxTypeStructure(query: DashboardQuery): Promise<TaxTypeStructure>
  /** 分区县收入完成情况（已按完成率降序） */
  getDistrictCompletion(query: DashboardQuery): Promise<DistrictCompletion[]>
  /** 综合治税成效 · 分数据源增收贡献 */
  getSourceContribution(query: DashboardQuery): Promise<SourceContribution[]>
  /** 风险任务闭环漏斗 */
  getRiskTaskFunnel(query: DashboardQuery): Promise<RiskTaskFunnel>
}

/* ========================================================================
 * 顶层 API 客户端
 * 后续页面（工作台 / 规则库 / 图谱 / 问答 …）在此追加各自的分组接口。
 * ====================================================================== */
export interface ApiClient {
  /** 领导驾驶舱 */
  dashboard: DashboardApi
}

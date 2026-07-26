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
 * 零、跨页共享类型
 * ====================================================================== */

/** 通用下拉 / 分段选项 */
export interface FilterOption {
  /** 选项值（枚举值 或 编码） */
  value: string
  /** 选项展示名 */
  label: string
}

/** 通用分页结果包裹 */
export interface PagedResult<T> {
  /** 当前页数据 */
  items: T[]
  /** 符合条件的总条数 */
  total: number
  /** 当前页码,从 1 开始 */
  page: number
  /** 每页条数 */
  pageSize: number
}

/** 键值对（档案 / 概览类信息展示） */
export interface KeyValue {
  /** 字段名 */
  key: string
  /** 字段值（已格式化为展示文本） */
  value: string
  /** 是否按数字等宽显示（识别号、日期、金额等） */
  numeric: boolean
}

/** 通用数值项（指标卡） */
export interface MetricItem {
  /** 指标名称 */
  label: string
  /** 指标值（已格式化） */
  value: string
  /** 单位,可空 */
  unit: string
}

/**
 * 语气(决定前端取色),后端只给语义,不给色值:
 * default 主文本 · primary 政务蓝 · neutral 中性灰 ·
 * danger 高风险红 · warn 警示橙 · gold 提示金 · success 良好绿
 */
export type Tone = 'default' | 'primary' | 'neutral' | 'danger' | 'warn' | 'gold' | 'success'

/** 风险等级:高 / 中 / 低 */
export type RiskLevel = 'high' | 'mid' | 'low'

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

/** 页面顶部筛选条 + 元信息 */
export interface DashboardFilters {
  /** 数据更新时间,格式 YYYY-MM-DD HH:mm */
  updatedAt: string
  /** 可选统计周期（本月/本季/本年） */
  periods: FilterOption[]
  /** 默认选中周期 */
  defaultPeriod: DashboardPeriod
  /** 可选区县（含「全市」,置于首位） */
  districts: FilterOption[]
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
 * 二、风险线索工作台（Clues）
 * ====================================================================== */

/** 线索处置状态:待派发 / 处置中 / 已办结 / 已退回 */
export type ClueStatus = 'pending' | 'processing' | 'done' | 'returned'

/** 线索列表查询参数（全部条件写入 URL query,可分享 / 可回退） */
export interface ClueQuery {
  /** 纳税人名称 或 识别号关键字,空串表示不限 */
  keyword: string
  /** 所属区县代码,'all' 表示全部区县 */
  districtCode: string
  /** 规则类别代码,'all' 表示全部类别 */
  categoryCode: string
  /** 预估税款下限（万元）,null 表示不限 */
  taxMin: number | null
  /** 预估税款上限（万元）,null 表示不限 */
  taxMax: number | null
  /** 勾选的风险等级;空数组表示不限 */
  riskLevels: RiskLevel[]
  /** 勾选的任务状态;空数组表示不限 */
  statuses: ClueStatus[]
  /** 页码,从 1 开始 */
  page: number
  /** 每页条数 */
  pageSize: number
}

/** 线索列表行 */
export interface ClueRow {
  /** 线索编号,如 XF2026-0731 */
  id: string
  /** 纳税人名称 */
  taxpayerName: string
  /** 纳税人识别号（脱敏） */
  taxId: string
  /** 风险等级 */
  riskLevel: RiskLevel
  /** 命中规则条数 */
  hitRuleCount: number
  /** 预估税款（万元） */
  estimatedTax: number
  /** 线索生成日期 YYYY-MM-DD */
  createdDate: string
  /** 处置状态 */
  status: ClueStatus
}

/** 工作台筛选条数据 */
export interface ClueFilters {
  /** 数据更新时间 */
  updatedAt: string
  /** 可选区县（含「全部区县」） */
  districts: FilterOption[]
  /** 可选规则类别（含「全部类别」） */
  categories: FilterOption[]
  /** 风险等级选项（附各等级线索数,用于芯片上的计数） */
  riskLevels: Array<FilterOption & { count: number }>
  /** 任务状态选项 */
  statuses: FilterOption[]
}

/** 抽屉·风险点明细:单条命中规则 */
export interface ClueRuleHit {
  /** 序号,从 1 开始 */
  no: number
  /** 规则名称 */
  name: string
  /** 判定依据说明 */
  basis: string
  /** 左侧对比项标签（通常为「申报数据」） */
  leftLabel: string
  /** 左侧对比项值 */
  leftValue: string
  /** 右侧对比项标签（第三方 / 测算口径） */
  rightLabel: string
  /** 右侧对比项值 */
  rightValue: string
  /** 差异结论描述 */
  diff: string
}

/** 抽屉·一户式概览:发票概况单项 */
export interface InvoiceStat {
  /** 名称（领用 / 已开 / 作废 / 红冲） */
  label: string
  /** 数值（已格式化） */
  value: string
  /** 取色语气 */
  tone: Tone
}

/** 抽屉·处置记录:核查过程时间轴节点状态 */
export type TimelineState = 'done' | 'active' | 'pending'

/** 抽屉·处置记录:时间轴节点 */
export interface TimelineEvent {
  /** 节点标题 */
  title: string
  /** 发生时间,未发生用 '—' */
  time: string
  /** 操作人 / 科室,未发生用 '—' */
  operator: string
  /** 说明 */
  note: string
  /** 节点状态:已完成 / 进行中 / 待办 */
  state: TimelineState
}

/** 抽屉·处置结果回填的已有草稿值 */
export interface ClueDisposalDraft {
  /** 核查结论 */
  conclusion: string
  /** 补缴税款（元,已格式化） */
  backTax: string
  /** 滞纳金（元,已格式化） */
  lateFee: string
  /** 处理意见 */
  opinion: string
}

/** 线索详情（抽屉三个标签页的全部数据） */
export interface ClueDetail {
  /** 线索编号 */
  id: string
  /** 纳税人名称 */
  taxpayerName: string
  /** 纳税人识别号（脱敏） */
  taxId: string
  /** 风险等级 */
  riskLevel: RiskLevel
  /** 命中规则条数 */
  hitRuleCount: number
  /** 预估税款（万元） */
  estimatedTax: number
  /** 处置状态（工作台顶部状态徽章） */
  status: ClueStatus
  /** 标签页一:命中的风险点明细 */
  rules: ClueRuleHit[]
  /** 标签页二:企业基本信息 */
  profileBasic: KeyValue[]
  /** 标签页二:申报缴纳概况 */
  profileDeclare: MetricItem[]
  /** 标签页二:发票概况 */
  profileInvoice: InvoiceStat[]
  /** 标签页三:核查过程时间轴 */
  timeline: TimelineEvent[]
  /** 标签页三:结果回填草稿 */
  disposal: ClueDisposalDraft
}

/**
 * 核查处置工作台·结果回填表单的选项集(《需求文档》7.4)。
 * 选项与业务无关、全表通用,单独一个接口下发,前端可缓存。
 */
export interface ClueDisposalOptions {
  /** 核查结论(三选一,单选) */
  conclusions: FilterOption[]
  /** 当核查结论取此值时,判定为「误报」,须填写误报原因 */
  falseConclusionValue: string
  /** 问题类型(多选) */
  problemTypes: FilterOption[]
  /** 分税种查补:税种列表(每个税种一行金额输入) */
  taxKinds: FilterOption[]
  /** 误报原因(七类,单选;结论为「误报」时必填) */
  falseReasons: FilterOption[]
}

/** 风险线索工作台接口分组 */
export interface CluesApi {
  /** 顶部筛选条选项 + 各风险等级计数 */
  getClueFilters(): Promise<ClueFilters>
  /** 线索列表（分页 + 全条件筛选） */
  getClues(query: ClueQuery): Promise<PagedResult<ClueRow>>
  /** 单条线索详情（核查处置工作台整页 / 风险点 + 时间线） */
  getClueDetail(id: string): Promise<ClueDetail>
  /** 结果回填表单的选项集（核查结论 / 问题类型 / 税种 / 误报原因） */
  getClueDisposalOptions(): Promise<ClueDisposalOptions>
}

/* ========================================================================
 * 三、一户式档案详情（Archive）
 * ====================================================================== */

/** 档案标签页:基础 / 登记 / 经营 / 申报缴纳 / 票流 / 征管评价 */
export type ArchiveTab = 'base' | 'reg' | 'biz' | 'declare' | 'invoice' | 'eval'

/** 档案概要卡的右侧指标 */
export interface ArchiveSummaryMetric {
  /** 指标名称 */
  label: string
  /** 指标值 */
  value: string
  /** 取色语气 */
  tone: Tone
}

/** 档案概要卡 */
export interface ArchiveSummary {
  /** 纳税人名称 */
  taxpayerName: string
  /** 纳税人识别号（脱敏） */
  taxId: string
  /** 统一社会信用代码（脱敏） */
  creditCode: string
  /** 主管税务所 */
  authority: string
  /** 头像占位字（取名称首字） */
  avatarText: string
  /** 风险等级 */
  riskLevel: RiskLevel
  /** 登记状态文案（在营 / 注销 …） */
  registrationStatus: string
  /** 右侧 4 项概要指标 */
  metrics: ArchiveSummaryMetric[]
}

/** 申报缴纳·分税种入库单行 */
export interface ArchiveTaxRow {
  /** 税种名称 */
  name: string
  /** 已入库金额（万元） */
  amount: number
  /** 同比文案,如 "+8.2%" */
  yoy: string
  /** 同比是否为正向增长（决定取色） */
  yoyPositive: boolean
}

/** 申报缴纳标签页 */
export interface ArchiveDeclare {
  /** 顶部 4 张指标卡 */
  kpis: Array<MetricItem & { accent: KpiAccent }>
  /** 分税种入库（本年累计,万元） */
  taxes: ArchiveTaxRow[]
}

/** 票流·近 6 月进销项 */
export interface InvoiceMonthly {
  /** 月份标签 */
  month: string
  /** 销项金额（万元） */
  output: number
  /** 进项金额（万元） */
  input: number
}

/** 票流·开票预警 */
export interface InvoiceWarning {
  /** 预警标题 */
  title: string
  /** 预警说明 */
  desc: string
  /** 预警级别（决定左侧色条与标题取色） */
  level: RiskLevel
}

/** 票流标签页 */
export interface ArchiveInvoice {
  /** 顶部 4 项发票统计 */
  stats: InvoiceStat[]
  /** 近 6 月进销项对比 */
  monthly: InvoiceMonthly[]
  /** 开票预警列表 */
  warnings: InvoiceWarning[]
}

/** 征管评价·历年信用等级 */
export interface CreditYear {
  /** 年度 */
  year: string
  /** 等级（A/B/M/C/D） */
  grade: string
  /** 取色语气 */
  tone: Tone
}

/** 征管评价·评价标签 */
export interface EvalTag {
  /** 标签名 */
  name: string
  /** 取色语气 */
  tone: Tone
}

/** 征管评价·风险与征管记录单行 */
export interface EvalRecord {
  /** 记录项名称 */
  label: string
  /** 记录值 */
  value: string
  /** 取色语气 */
  tone: Tone
}

/** 征管评价标签页 */
export interface ArchiveEvaluation {
  /** 近 4 年纳税信用等级 */
  creditHistory: CreditYear[]
  /** 评价标签 */
  tags: EvalTag[]
  /** 风险与征管记录 */
  records: EvalRecord[]
}

/** 一户式档案接口分组 */
export interface ArchiveApi {
  /** 档案概要卡 */
  getArchiveSummary(taxId: string): Promise<ArchiveSummary>
  /** 基础 / 登记 / 经营 三个键值类标签页 */
  getArchiveProfile(taxId: string, section: 'base' | 'reg' | 'biz'): Promise<KeyValue[]>
  /** 申报缴纳标签页 */
  getArchiveDeclare(taxId: string): Promise<ArchiveDeclare>
  /** 票流标签页 */
  getArchiveInvoice(taxId: string): Promise<ArchiveInvoice>
  /** 征管评价标签页 */
  getArchiveEvaluation(taxId: string): Promise<ArchiveEvaluation>
}

/* ========================================================================
 * 四、规则库管理 · 规则配置（Rules）
 * ------------------------------------------------------------------------
 * 参照《需求文档》3.1 规则管理、表 3-1 规则要素。
 * ====================================================================== */

/** 规则状态:启用 / 试跑中(灰度) / 停用 / 草稿 */
export type RuleStatus = 'enabled' | 'testing' | 'disabled' | 'draft'

/**
 * 比对范式(规则的判定方式,决定右侧详情如何解释命中):
 * threshold 单点阈值 · cross 双源交叉 · trend 趋势环比 ·
 * benchmark 同业基准 · list 名单匹配 · logic 逻辑关系校验
 */
export type ComparisonModel = 'threshold' | 'cross' | 'trend' | 'benchmark' | 'list' | 'logic'

/** 规则分类树节点(十大类,可含子类,自带规则计数) */
export interface RuleCategoryNode {
  /** 分类编码(顶级无点;子类形如 "invoice.io") */
  code: string
  /** 分类名称 */
  name: string
  /** 该分类(含子类)下的规则数量 */
  count: number
  /** 子分类;叶子节点不含此字段 */
  children?: RuleCategoryNode[]
}

/** 规则列表查询参数(全部条件写入 URL query,可分享 / 可回退) */
export interface RuleQuery {
  /** 规则名称 / 编号关键字,空串表示不限 */
  keyword: string
  /** 分类编码;'all' 表示全部分类。选中父类时匹配其全部子类 */
  categoryCode: string
  /** 规则状态;'all' 表示不限 */
  status: string
  /** 涉及税种编码;'all' 表示不限 */
  taxType: string
  /** 风险等级;'all' 表示不限 */
  riskLevel: string
  /** 比对范式;'all' 表示不限 */
  model: string
  /** 页码,从 1 开始 */
  page: number
  /** 每页条数 */
  pageSize: number
}

/** 规则列表行 */
export interface RuleRow {
  /** 规则编号,如 FP-VAT-014 */
  id: string
  /** 规则名称 */
  name: string
  /** 所属分类叶子编码 */
  categoryCode: string
  /** 所属分类名称(展示用,后端联表下发) */
  categoryName: string
  /** 涉及税种名称列表(展示用) */
  taxTypes: string[]
  /** 比对范式 */
  model: ComparisonModel
  /** 比对范式名称(展示用) */
  modelLabel: string
  /** 风险等级 */
  riskLevel: RiskLevel
  /** 规则状态 */
  status: RuleStatus
  /** 本月命中数(条) */
  monthHit: number
  /** 命中率(百分数,= 查实命中 / 命中) */
  hitRate: number
}

/** 规则配置页筛选条数据(下拉选项 + 左侧分类树) */
export interface RuleFilters {
  /** 数据更新时间 */
  updatedAt: string
  /** 左侧分类树(十大类) */
  categoryTree: RuleCategoryNode[]
  /** 规则状态选项(含「全部状态」) */
  statuses: FilterOption[]
  /** 涉及税种选项(含「全部税种」) */
  taxTypes: FilterOption[]
  /** 风险等级选项(含「全部等级」) */
  riskLevels: FilterOption[]
  /** 比对范式选项(含「全部范式」) */
  models: FilterOption[]
}

/**
 * 抽屉·规则定义:表 3-1 单个要素。
 * 十七项要素以有序数组下发,前端按序渲染,不写死字段名。
 */
export interface RuleDefField {
  /** 要素名称(如「判定逻辑」) */
  label: string
  /** 要素值(已格式化为展示文本) */
  value: string
  /** 是否整行通栏展示(长文本 / 表达式) */
  full: boolean
  /** 是否等宽显示(表达式 / 编号 / 日期) */
  mono: boolean
}

/** 抽屉·阈值参数:单个参数的定义(列头) */
export interface RuleParamDef {
  /** 参数键(与分档值对象的键一致) */
  key: string
  /** 参数名称 */
  label: string
  /** 单位,可空 */
  unit: string
}

/** 抽屉·阈值参数:一个「行业 × 规模」分档行 */
export interface RuleParamTier {
  /** 分档行标识 */
  id: string
  /** 适用行业(如「批发零售」;「通用」表示缺省档) */
  industry: string
  /** 适用纳税人规模(如「一般纳税人」/「小规模」/「不限」) */
  scale: string
  /** 各参数取值,键对应 RuleParamDef.key(已格式化为字符串,便于表单编辑) */
  values: Record<string, string>
}

/** 抽屉·阈值参数(可编辑,按行业/规模分档) */
export interface RuleThreshold {
  /** 参数定义(表格列) */
  params: RuleParamDef[]
  /** 分档配置(表格行) */
  tiers: RuleParamTier[]
}

/** 抽屉·效果监测:单月数据点 */
export interface RuleEffectPoint {
  /** 月份标签(如 "2月") */
  month: string
  /** 当月命中量(条) */
  hitCount: number
  /** 当月命中率(百分数) */
  hitRate: number
}

/** 抽屉·效果监测(近 6 个月双轴趋势) */
export interface RuleEffect {
  /** 顶部概览指标(本月命中 / 累计命中 / 平均命中率 / 查实率等) */
  summary: MetricItem[]
  /** 近 6 个月序列(按时间升序) */
  points: RuleEffectPoint[]
}

/** 规则详情(抽屉三个标签页的全部数据) */
export interface RuleDetail {
  /** 规则编号 */
  id: string
  /** 规则名称 */
  name: string
  /** 所属分类名称 */
  categoryName: string
  /** 风险等级 */
  riskLevel: RiskLevel
  /** 规则状态 */
  status: RuleStatus
  /** 标签页一:规则定义(表 3-1 十七要素,有序) */
  definition: RuleDefField[]
  /** 标签页二:阈值参数(可编辑,分档) */
  threshold: RuleThreshold
  /** 标签页三:效果监测(近 6 月双轴) */
  effect: RuleEffect
}

/** 规则库管理接口分组 */
export interface RulesApi {
  /** 筛选下拉选项 + 左侧分类树 + 数据更新时间 */
  getRuleFilters(): Promise<RuleFilters>
  /** 规则列表(分页 + 全条件筛选) */
  getRules(query: RuleQuery): Promise<PagedResult<RuleRow>>
  /** 单条规则详情(抽屉三标签页) */
  getRuleDetail(id: string): Promise<RuleDetail>
}

/* ========================================================================
 * 五、智能应用 · 政策智能问答（Qa）
 * ------------------------------------------------------------------------
 * 参照《需求文档》5.2 政策智能问答。演示环境返回固定示例问答 + 引用来源;
 * 前端负责「溯源芯片 ↔ 引用来源卡」的高亮联动(《交互说明》1.7)。
 * ====================================================================== */

/** 引用来源(右侧来源卡 与 答案下方溯源芯片共用一份数据) */
export interface PolicySource {
  /** 序号(展示为 [no],同时用于溯源联动定位) */
  no: number
  /** 文号(如「财税〔20XX〕XX号」) */
  docNo: string
  /** 政策标题 */
  title: string
  /** 引用条款(如「第一条」) */
  clause: string
  /** 条款摘录 */
  snippet: string
  /** 效力状态文案(如「现行有效」) */
  effect: string
  /** 效力取色语气(现行有效 → success) */
  effectTone: Tone
  /** 生效日期 */
  date: string
}

/** 对话消息角色:用户提问 / 助手回答 */
export type QaRole = 'user' | 'assistant'

/**
 * 对话消息(扁平结构,便于模板渲染):
 * user 用 text;assistant 用 paras + citeIndexes(指向 sources 下标)。
 */
export interface QaMessage {
  /** 角色 */
  role: QaRole
  /** 用户问题文本(assistant 为空串) */
  text: string
  /** 助手回答段落(user 为空数组) */
  paras: string[]
  /** 助手回答所引用的来源下标(user 为空数组) */
  citeIndexes: number[]
}

/** 政策问答会话 */
export interface QaSession {
  /** 知识库范围文案(如「增值税 · 综合治税」) */
  knowledgeScope: string
  /** 对话消息序列 */
  messages: QaMessage[]
  /** 引用来源(答案溯源与右侧来源栏共用) */
  sources: PolicySource[]
  /** 建议问题(输入区快捷芯片) */
  suggestions: string[]
}

/** 政策智能问答接口分组 */
export interface QaApi {
  /** 加载一段示例会话(消息 + 引用来源 + 建议问题) */
  getQaSession(): Promise<QaSession>
}

/* ========================================================================
 * 六、智能模型 · 关联图谱分析（Graph）
 * ------------------------------------------------------------------------
 * 参照《需求文档》3.9 / 4.3.2 关联关系分析。节点坐标由后端(或布局算法)给定,
 * 前端按坐标渲染 SVG;节点/连线颜色由前端按类型分配(后端只给语义 type)。
 * ====================================================================== */

/** 图谱节点类型:企业 / 人员 / 资金账户 / 受票企业 */
export type GraphNodeType = 'ent' | 'person' | 'fund' | 'invoice'

/** 图谱节点 */
export interface GraphNode {
  /** 节点 id */
  id: string
  /** 节点名称 */
  label: string
  /** 节点类型(决定前端取色与图标) */
  type: GraphNodeType
  /** 画布坐标 X(设计稿 920×620 视图坐标系) */
  x: number
  /** 画布坐标 Y */
  y: number
  /** 节点风险等级;null 表示无风险标记 */
  risk: RiskLevel | null
  /** 是否核心节点(半径更大) */
  core: boolean
}

/** 图谱连线 */
export interface GraphEdge {
  /** 起点节点 id */
  source: string
  /** 终点节点 id */
  target: string
  /** 关系标签(法定代表人 / 资金往来 / 开票 …) */
  label: string
  /** 强关联(实线粗)/ 弱关联(虚线细) */
  strong: boolean
}

/** 节点属性行 */
export interface GraphNodeAttr {
  /** 属性名 */
  key: string
  /** 属性值 */
  value: string
  /** 是否等宽数字显示 */
  numeric: boolean
}

/** 节点的一条关联关系(右侧面板,点击可跳转选中) */
export interface GraphRelation {
  /** 关联目标节点 id(点击跳转选中) */
  targetId: string
  /** 目标节点名称 */
  targetName: string
  /** 关系类型(法定代表人 / 资金往来 …) */
  rel: string
  /** 关系说明 */
  note: string
  /** 取色语气(异常关系用 danger / warn) */
  tone: Tone
}

/** 单个节点的详情(右侧面板) */
export interface GraphNodeDetail {
  /** 节点属性 */
  attrs: GraphNodeAttr[]
  /** 关联关系 */
  relations: GraphRelation[]
}

/** 关联图谱数据 */
export interface GraphData {
  /** 根主体名称(顶部检索框显示) */
  rootName: string
  /** 默认选中的节点 id */
  rootId: string
  /** 全部节点 */
  nodes: GraphNode[]
  /** 全部连线 */
  edges: GraphEdge[]
  /** 各节点详情,键为节点 id */
  details: Record<string, GraphNodeDetail>
}

/** 关联图谱接口分组 */
export interface GraphApi {
  /** 以某主体为根加载关联图谱(rootId 空则取演示默认主体) */
  getGraph(rootId: string): Promise<GraphData>
}

/* ========================================================================
 * 七、决策分析（Decision）· 收入 / 税源 / 治税成效 / 专题
 * ------------------------------------------------------------------------
 * 参照《需求文档》8.1。四页共用「看板」范式(参照领导驾驶舱):
 * 顶部周期/区县筛选 + KPI 行 + 若干图表面板。无设计稿,布局在设计系统内自绘。
 * ====================================================================== */

/** 折线 / 柱图单点(通用) */
export interface SeriesPoint {
  /** 分类标签(月份 / 行业 …) */
  label: string
  /** 数值 */
  value: number
}

/** 命名数值(柱状 / 排名条通用) */
export interface NamedValue {
  /** 名称 */
  name: string
  /** 数值 */
  value: number
}

/** 决策分析查询参数(周期 + 区县,作用于全页) */
export interface DecisionQuery {
  /** 统计周期 */
  period: DashboardPeriod
  /** 区县代码;'all' 表示全市 */
  districtCode: string
}

/** 决策分析·共享筛选项 */
export interface DecisionFilters {
  /** 可选周期 */
  periods: FilterOption[]
  /** 默认周期 */
  defaultPeriod: DashboardPeriod
  /** 可选区县(含「全市」) */
  districts: FilterOption[]
  /** 默认区县代码 */
  defaultDistrictCode: string
}

/** 收入分析·预算执行进度 */
export interface RevenueProgress {
  /** 周期文案(本年度…) */
  periodLabel: string
  /** 时间进度(百分数) */
  timeProgress: number
  /** 时间进度说明 */
  timeNote: string
  /** 收入进度(百分数) */
  revenueProgress: number
  /** 收入进度说明(入库/预算) */
  revenueNote: string
  /** 落后提示文案 */
  laggingNote: string
}

/** 收入分析·进度卡右侧内联指标 */
export interface RevenueHeadStat {
  /** 名称 */
  label: string
  /** 数值(已格式化,含正负号) */
  value: string
  /** 单位 */
  unit: string
  /** 补充说明 */
  note: string
  /** 数值取色语气 */
  tone: Tone
}

/** 瀑布图节点类型:基准柱 / 增减量 */
export type WaterfallKind = 'base' | 'delta'

/** 瀑布图单项 */
export interface WaterfallItem {
  /** 名称(去年同期 / 各税种 / 今年同期) */
  name: string
  /** 类型 */
  kind: WaterfallKind
  /** base:该柱绝对值;delta:同比增减量(亿元,带符号) */
  value: number
  /** 同比幅度文案(delta 用,base 为空串) */
  pct: string
}

/** 分级次月度收入数据 */
export interface RevenueLevelData {
  /** 级次名称(中央级/省级/市级/县区级,自下而上) */
  levelNames: string[]
  /** 月份标签 */
  months: string[]
  /** 各月合计(亿元) */
  monthTotals: number[]
  /** 各月各级次占比 shares[月][级次] */
  shares: number[][]
}

/** 收入预测数据 */
export interface RevenueForecast {
  /** 月份标签(1–12 月) */
  months: string[]
  /** 实际入库(前 7 月,亿元) */
  actual: number[]
  /** 模型预测(后 5 月,亿元) */
  predicted: number[]
  /** 各预测点 90% 区间半宽 */
  bandWidth: number[]
  /** 全年预测总额文案 */
  yearForecast: string
  /** 预测区间文案 */
  range: string
  /** 预算达成概率文案 */
  achieveProb: string
}

/** 明细表·区县下钻子行 */
export interface RevenueDistrictShare {
  /** 区县名 */
  name: string
  /** 占该税种入库比例(0–1) */
  share: number
  /** 同比文案 */
  yoy: string
}

/** 明细表·分税种行 */
export interface RevenueTaxRow {
  /** 税种名 */
  name: string
  /** 年度预算(亿元) */
  budget: number
  /** 累计入库(亿元) */
  actual: number
  /** 同比文案 */
  yoy: string
  /** 区县下钻子行 */
  districts: RevenueDistrictShare[]
}

/** 收入分析 */
export interface RevenueAnalysis {
  /** 预算执行进度 */
  progress: RevenueProgress
  /** 进度卡右侧内联指标 */
  headStats: RevenueHeadStat[]
  /** 同比增幅归因瀑布 */
  waterfall: WaterfallItem[]
  /** 分级次月度收入 */
  levelData: RevenueLevelData
  /** 全年收入预测 */
  forecast: RevenueForecast
  /** 分税种执行明细 */
  taxRows: RevenueTaxRow[]
}

/** 税源分析·顶部指标横条单项 */
export interface TaxSourceStat {
  /** 名称 */
  label: string
  /** 数值(已格式化) */
  value: string
  /** 补充说明 */
  note: string
  /** 取色语气 */
  tone: Tone
}

/** 帕累托·单个纳税户 */
export interface ParetoEntity {
  /** 脱敏名称 */
  name: string
  /** 本年入库(万元) */
  value: number
}

/** 集中度指标条 */
export interface ConcentrationBar {
  /** 名称(CR5/CR10/CR50) */
  name: string
  /** 占比(百分数) */
  pct: number
  /** 同比变动文案 */
  delta: string
}

/** 纳税规模梯队 */
export interface ScaleTier {
  /** 规模区间名 */
  name: string
  /** 户数 */
  count: number
}

/** 税源流动·单月 */
export interface FlowMonth {
  /** 月份 */
  month: string
  /** 新办(户) */
  add: number
  /** 迁入(户) */
  moveIn: number
  /** 注销(户) */
  cancel: number
  /** 迁出(户) */
  moveOut: number
}

/** 行业结构演变·单行业(8 季度占比) */
export interface IndustrySeries {
  /** 行业名 */
  name: string
  /** 各季度税收占比(百分数,len=8) */
  values: number[]
}

/** 区域气泡·单区县 */
export interface DistrictBubble {
  /** 区县名 */
  name: string
  /** 税源户数 */
  households: number
  /** 户均税额(万元) */
  avgTax: number
  /** 税收总量(亿元) */
  totalTax: number
}

/** 税源分析 */
export interface TaxSourceAnalysis {
  /** 顶部指标横条 */
  headStats: TaxSourceStat[]
  /** 帕累托·全市税收基数(万元,用于累计占比) */
  paretoTotal: number
  /** 帕累托·TOP 纳税户(已降序) */
  pareto: ParetoEntity[]
  /** 集中度指标条 */
  concentrationBars: ConcentrationBar[]
  /** 纳税规模梯队 */
  scaleTiers: ScaleTier[]
  /** HHI 指数值 + 结论 */
  hhi: string
  /** HHI 结论说明 */
  hhiNote: string
  /** 税源流动(月度) */
  flow: FlowMonth[]
  /** 税源流动说明 */
  flowNote: string
  /** 行业结构演变·季度标签(len=8) */
  quarters: string[]
  /** 行业结构演变·各行业序列(自下而上堆叠) */
  industries: IndustrySeries[]
  /** 行业结构演变说明 */
  industryNote: string
  /** 区域气泡矩阵 */
  bubbles: DistrictBubble[]
}

/** 闭环环节间的连接器(转化率 + 流失) */
export interface StageConnector {
  /** 转化率文案(如「转化 19.1%」) */
  rate: string
  /** 流失量文案 */
  loss: string
  /** 流失去向说明 */
  note: string
}

/** 治税闭环·单个环节 */
export interface EffectStage {
  /** 环节名 */
  name: string
  /** 数量 */
  count: number
  /** 单位(条/户) */
  unit: string
  /** 环节说明 */
  sub: string
  /** 平均耗时文案 */
  days: string
  /** 悬停明细 */
  tips: KeyValue[]
  /** 指向下一环节的连接器;末环节为 null */
  connector: StageConnector | null
}

/** 下钻明细·一列(一个维度) */
export interface DrillColumn {
  /** 维度标题 */
  title: string
  /** 该维度下的条目 */
  rows: NamedValue[]
}

/** 下钻明细·对应某个环节 */
export interface StageDrill {
  /** 口径说明 */
  note: string
  /** 3 列维度分解 */
  columns: DrillColumn[]
}

/** 分数据源增收贡献·单项 */
export interface SourceContributionRow {
  /** 数据源名 */
  name: string
  /** 入库税款(万元) */
  value: number
  /** 有效线索(条) */
  clues: number
  /** 查实率(百分数) */
  rate: number
}

/** 规则引擎 vs 智能模型·单个对比维度(tab) */
export interface CompareTab {
  /** 维度名(查实率对比/入库贡献/耗时对比) */
  name: string
  /** 数值单位 */
  unit: string
  /** 结论摘要 */
  summary: string
  /** 分类标签(税种) */
  categories: string[]
  /** 规则引擎各分类数值 */
  rule: number[]
  /** 智能模型各分类数值 */
  model: number[]
}

/** 分局治税成效排行·单行 */
export interface BureauRow {
  /** 分局名 */
  name: string
  /** 有效线索(条) */
  clues: number
  /** 已核查(户) */
  checked: number
  /** 查实率(百分数) */
  rate: number
  /** 入库税款(万元) */
  tax: number
  /** 户均耗时(天) */
  days: number
  /** 环比文案(带符号) */
  mom: string
}

/** 治税成效分析 */
export interface EffectivenessAnalysis {
  /** 闭环整体结论文案 */
  headline: string
  /** 闭环 5 个环节 */
  stages: EffectStage[]
  /** 各环节的下钻明细(与 stages 等长、同序) */
  drills: StageDrill[]
  /** 分数据源增收贡献 */
  sources: SourceContributionRow[]
  /** 数据源接入说明 */
  sourceNote: string
  /** 数据源合计文案 */
  sourceTotal: string
  /** 规则引擎在用条数说明 */
  ruleLegend: string
  /** 智能模型在用个数说明 */
  modelLegend: string
  /** 规则 vs 模型 三个对比维度 */
  compareTabs: CompareTab[]
  /** 分局排行 */
  bureaus: BureauRow[]
}

/** 专题 tab 项 */
export interface TopicTab {
  /** 专题标识 */
  key: string
  /** 专题名 */
  name: string
  /** 风险数(红色角标) */
  risk: number
}

/** 房地产·环节税种明细行 */
export interface REStageTaxRow {
  /** 税种名 */
  name: string
  /** 应征(万元) */
  due: number
  /** 已入库(万元) */
  paid: number
}

/** 房地产·环节风险提示 */
export interface RERisk {
  /** 风险等级 */
  level: RiskLevel
  /** 风险标题 */
  title: string
  /** 风险说明 */
  note: string
  /** 涉及户数 */
  count: number
}

/** 房地产·单个环节节点 */
export interface REStage {
  /** 环节名(拿地/开发建设/…) */
  name: string
  /** 环节税收(亿元,已格式化) */
  amount: string
  /** 涉及税种芯片 */
  taxes: string[]
  /** 风险数(右上角标);0 表示无角标 */
  riskCount: number
  /** 税种明细 */
  taxRows: REStageTaxRow[]
  /** 风险提示 */
  risks: RERisk[]
}

/** 房地产·重点项目监控行 */
export interface REProject {
  /** 项目名 */
  name: string
  /** 开发企业(脱敏) */
  developer: string
  /** 当前环节 */
  stage: string
  /** 累计网签(亿) */
  sale: string
  /** 土增清算进度(百分数) */
  progress: number
  /** 累计纳税(万元,已格式化) */
  tax: string
  /** 清算风险等级 */
  risk: RiskLevel
}

/** 房地产专题 */
export interface RealEstateTopic {
  /** 合计结论文案 */
  headline: string
  /** 六个环节 */
  stages: REStage[]
  /** 重点项目 */
  projects: REProject[]
}

/** 建筑安装·项目(用于象限散点与风险清单) */
export interface ConstructionProject {
  /** 项目名 */
  name: string
  /** 施工企业(脱敏) */
  corp: string
  /** 属地 */
  district: string
  /** 合同金额(亿元) */
  amount: number
  /** 开票进度(百分数) */
  invoiceProgress: number
  /** 预缴率(百分数) */
  prepayRate: number
}

/** 建筑安装·概览指标 */
export interface ConstructionStat {
  label: string
  value: string
  unit: string
  tone: Tone
}

/** 建筑安装专题 */
export interface ConstructionTopic {
  /** 项目全集 */
  projects: ConstructionProject[]
  /** 风险区判定:开票进度 > 此值 */
  riskInvoiceOver: number
  /** 风险区判定:预缴率 < 此值 */
  riskPrepayUnder: number
  /** 概览指标 */
  stats: ConstructionStat[]
  /** 说明文案 */
  note: string
}

/** 平台经济·商户销售额分档 */
export interface PlatformBin {
  /** 区间标签 */
  label: string
  /** 平台报送商户数 */
  reported: number
  /** 已申报商户数 */
  declared: number
}

/** 平台经济·单个平台 */
export interface PlatformItem {
  /** 平台名(脱敏) */
  name: string
  /** 平台类型 */
  type: string
  /** 入驻商户数 */
  merchants: number
  /** 风险商户数 */
  riskCount: number
  /** 商户申报率(百分数) */
  rate: number
  /** 商户销售额分布 */
  bins: PlatformBin[]
  /** 未申报商户数 */
  gapCount: number
  /** 预估税款(万元) */
  gapTax: number
}

/** 平台经济·未申报商户 */
export interface PlatformMerchant {
  /** 商户名(脱敏) */
  name: string
  /** 经营类目 */
  category: string
  /** 平台报送销售额(万元) */
  sale: number
  /** 风险等级 */
  level: RiskLevel
}

/** 平台经济专题 */
export interface PlatformTopic {
  /** 监测概况文案 */
  headline: string
  /** 平台列表 */
  platforms: PlatformItem[]
  /** 未申报商户 TOP */
  topMerchants: PlatformMerchant[]
}

/** 专题分析(三个专题一次性下发,切换 tab 替换整个内容区) */
export interface TopicAnalysis {
  /** 专题 tab */
  tabs: TopicTab[]
  /** 专题口径说明 */
  scopeNote: string
  /** 房地产专题 */
  realEstate: RealEstateTopic
  /** 建筑安装专题 */
  construction: ConstructionTopic
  /** 平台经济专题 */
  platform: PlatformTopic
}

/** 决策分析接口分组 */
export interface DecisionApi {
  /** 共享筛选项(周期 / 区县 / 专题) */
  getDecisionFilters(): Promise<DecisionFilters>
  /** 收入分析 */
  getRevenueAnalysis(query: DecisionQuery): Promise<RevenueAnalysis>
  /** 税源分析 */
  getTaxSourceAnalysis(query: DecisionQuery): Promise<TaxSourceAnalysis>
  /** 治税成效分析 */
  getEffectivenessAnalysis(query: DecisionQuery): Promise<EffectivenessAnalysis>
  /** 专题分析(三个专题一次下发,前端 tab 切换) */
  getTopicAnalysis(query: DecisionQuery): Promise<TopicAnalysis>
}

/* ========================================================================
 * 八、数据治理（DataGov）· 数据源接入监控 / 数据质量看板 / 主体识别与匹配
 * ------------------------------------------------------------------------
 * 参照《需求文档》2.2 数据接入、2.5 数据质量管理、2.3 主体识别与关联。
 * 无设计稿,布局在既有设计系统内自绘(看板 + 列表范式)。
 * ====================================================================== */

/** 数据源接入状态:正常 / 延迟 / 中断 / 未接入 */
export type SourceStatus = 'normal' | 'delayed' | 'interrupted' | 'offline'

/** 数据源接入监控·单个数据源 */
export interface DataSourceRow {
  /** 数据源编码 */
  id: string
  /** 数据源名称 */
  name: string
  /** 提供部门 */
  dept: string
  /** 数据类别(如「登记类」「资金类」) */
  category: string
  /** 接入状态 */
  status: SourceStatus
  /** 接入频率(实时 / 日 / 周 / 月) */
  frequency: string
  /** 最近到达时间 */
  lastArrival: string
  /** 批次到达率(百分数) */
  arrivalRate: number
  /** 当前延迟(小时);0 表示无延迟 */
  delayHours: number
  /** 今日接入记录数 */
  todayRecords: number
}

/** 接入告警 */
export interface SourceAlert {
  /** 告警标题 */
  title: string
  /** 告警说明 */
  desc: string
  /** 告警级别 */
  level: RiskLevel
  /** 发生时间 */
  time: string
}

/** 数据源接入监控 */
export interface DataSourceMonitor {
  /** 顶部指标(接入总数/正常/异常/今日接入量) */
  kpis: Array<MetricItem & { accent: KpiAccent }>
  /** 近 7 日接入量趋势(万条) */
  trend: SeriesPoint[]
  /** 数据源清单 */
  rows: DataSourceRow[]
  /** 接入告警 */
  alerts: SourceAlert[]
}

/** 数据质量·单个评估维度 */
export interface QualityDimension {
  /** 维度名(完整性/准确性/一致性/及时性/唯一性) */
  name: string
  /** 得分(0–100) */
  score: number
  /** 权重(百分数) */
  weight: number
  /** 问题条目数 */
  issues: number
}

/** 数据质量·问题清单行 */
export interface QualityIssueRow {
  /** 问题编号 */
  id: string
  /** 来源数据源 */
  source: string
  /** 涉及数据表 */
  table: string
  /** 命中的质量规则 */
  rule: string
  /** 严重程度 */
  level: RiskLevel
  /** 问题记录数 */
  count: number
  /** 发现时间 */
  foundAt: string
}

/** 数据质量看板 */
export interface QualityDashboard {
  /** 综合质量得分(0–100) */
  overallScore: number
  /** 得分结论文案 */
  scoreNote: string
  /** 各维度得分 */
  dimensions: QualityDimension[]
  /** 近 6 期质量得分趋势 */
  trend: SeriesPoint[]
  /** 各数据源质量得分(降序) */
  sourceScores: NamedValue[]
  /** 问题数据清单 */
  issues: QualityIssueRow[]
}

/** 主体匹配状态:已匹配 / 待确认 / 存在冲突 / 已排除 */
export type MatchStatus = 'matched' | 'pending' | 'conflict' | 'rejected'

/** 主体识别·列表查询参数 */
export interface EntityMatchQuery {
  /** 名称 / 识别号关键字 */
  keyword: string
  /** 匹配状态;'all' 表示不限 */
  status: string
  /** 页码,从 1 开始 */
  page: number
  /** 每页条数 */
  pageSize: number
}

/** 主体识别·列表行 */
export interface EntityMatchRow {
  /** 主体归并 id */
  id: string
  /** 主体名称 */
  name: string
  /** 纳税人识别号(脱敏) */
  taxId: string
  /** 涉及数据源数量 */
  sourceCount: number
  /** 关联标识数量 */
  identifierCount: number
  /** 匹配状态 */
  status: MatchStatus
  /** 匹配置信度(百分数) */
  confidence: number
  /** 最近更新时间 */
  updatedAt: string
}

/** 主体识别·单条来源标识 */
export interface EntityIdentifier {
  /** 来源数据源 */
  source: string
  /** 标识类型(统一社会信用代码 / 工商注册号 / 组织机构代码…) */
  idType: string
  /** 标识值(脱敏) */
  idValue: string
  /** 该源登记的主体名称 */
  name: string
  /** 是否已归并到主档 */
  merged: boolean
}

/** 主体识别·冲突项 */
export interface EntityConflict {
  /** 冲突字段 */
  field: string
  /** 主档值 */
  masterValue: string
  /** 来源值 */
  sourceValue: string
  /** 来源数据源 */
  source: string
}

/** 主体识别·详情 */
export interface EntityMatchDetail {
  /** 主体归并 id */
  id: string
  /** 主体名称 */
  name: string
  /** 纳税人识别号(脱敏) */
  taxId: string
  /** 匹配状态 */
  status: MatchStatus
  /** 匹配置信度(百分数) */
  confidence: number
  /** 匹配依据说明 */
  basis: string[]
  /** 各来源标识 */
  identifiers: EntityIdentifier[]
  /** 字段冲突 */
  conflicts: EntityConflict[]
}

/** 主体识别·筛选项 */
export interface EntityMatchFilters {
  /** 数据更新时间 */
  updatedAt: string
  /** 状态选项(含「全部状态」,附计数) */
  statuses: Array<FilterOption & { count: number }>
}

/** 数据治理接口分组 */
export interface DataGovApi {
  /** 数据源接入监控 */
  getDataSourceMonitor(): Promise<DataSourceMonitor>
  /** 数据质量看板 */
  getQualityDashboard(): Promise<QualityDashboard>
  /** 主体识别·筛选项 */
  getEntityMatchFilters(): Promise<EntityMatchFilters>
  /** 主体识别·列表(分页) */
  getEntityMatches(query: EntityMatchQuery): Promise<PagedResult<EntityMatchRow>>
  /** 主体识别·详情 */
  getEntityMatchDetail(id: string): Promise<EntityMatchDetail>
}

/* ========================================================================
 * 九、风险管理（RiskMgmt）· 任务派发 / 结果回填 / 处置绩效统计
 * ------------------------------------------------------------------------
 * 参照《需求文档》7.2 任务派发、7.4 核查结果反馈、7.5 处置绩效统计。
 * 无设计稿,沿用既有列表 / 看板范式。
 * ====================================================================== */

/** 任务派发·人员负荷行 */
export interface WorkloadRow {
  /** 核查人员姓名 */
  name: string
  /** 所属分局 / 科室 */
  dept: string
  /** 在办任务数 */
  processing: number
  /** 本月已办结 */
  done: number
  /** 承载上限 */
  capacity: number
  /** 负荷率(百分数 = 在办 / 上限) */
  loadRate: number
}

/** 任务派发·待派发线索行 */
export interface DispatchRow {
  /** 线索编号 */
  id: string
  /** 纳税人名称 */
  taxpayerName: string
  /** 风险等级 */
  riskLevel: RiskLevel
  /** 预估税款(万元) */
  estimatedTax: number
  /** 规则类别 */
  category: string
  /** 所属区县 */
  district: string
  /** 生成日期 */
  createdDate: string
  /** 系统建议承办人 */
  suggested: string
}

/** 任务派发·查询参数 */
export interface DispatchQuery {
  /** 名称 / 编号关键字 */
  keyword: string
  /** 区县代码;'all' 不限 */
  districtCode: string
  /** 风险等级;'all' 不限 */
  riskLevel: string
  /** 页码,从 1 开始 */
  page: number
  /** 每页条数 */
  pageSize: number
}

/** 任务派发·筛选项 */
export interface DispatchFilters {
  /** 数据更新时间 */
  updatedAt: string
  /** 区县选项(含「全部区县」) */
  districts: FilterOption[]
  /** 风险等级选项(含「全部等级」) */
  riskLevels: FilterOption[]
  /** 可选承办人(派发弹窗用) */
  assignees: FilterOption[]
}

/** 任务派发·概览 */
export interface DispatchBoard {
  /** 顶部指标 */
  kpis: Array<MetricItem & { accent: KpiAccent }>
  /** 人员负荷 */
  workloads: WorkloadRow[]
}

/** 回填状态:待回填 / 草稿 / 已提交 / 被退回 */
export type BackfillStatus = 'pending' | 'draft' | 'submitted' | 'returned'

/** 结果回填·任务行 */
export interface BackfillRow {
  /** 任务编号 */
  id: string
  /** 关联线索编号 */
  clueId: string
  /** 纳税人名称 */
  taxpayerName: string
  /** 风险等级 */
  riskLevel: RiskLevel
  /** 承办人 */
  assignee: string
  /** 要求回填期限 */
  dueDate: string
  /** 剩余天数;负数表示已逾期 */
  daysLeft: number
  /** 回填状态 */
  status: BackfillStatus
}

/** 结果回填·查询参数 */
export interface BackfillQuery {
  /** 名称 / 编号关键字 */
  keyword: string
  /** 回填状态;'all' 不限 */
  status: string
  /** 页码,从 1 开始 */
  page: number
  /** 每页条数 */
  pageSize: number
}

/** 结果回填·筛选项与概览 */
export interface BackfillFilters {
  /** 数据更新时间 */
  updatedAt: string
  /** 状态选项(附计数) */
  statuses: Array<FilterOption & { count: number }>
  /** 顶部指标 */
  kpis: Array<MetricItem & { accent: KpiAccent }>
}

/** 处置绩效·人员绩效行 */
export interface PerfPersonRow {
  /** 姓名 */
  name: string
  /** 所属分局 */
  dept: string
  /** 承办任务数 */
  assigned: number
  /** 已办结 */
  completed: number
  /** 查实率(百分数) */
  rate: number
  /** 入库税款(万元) */
  tax: number
  /** 户均耗时(天) */
  avgDays: number
  /** 环比文案(带符号) */
  mom: string
}

/** 处置绩效统计 */
export interface PerformanceStats {
  /** 顶部指标 */
  kpis: Array<MetricItem & { accent: KpiAccent }>
  /** 月度办结量趋势 */
  trend: SeriesPoint[]
  /** 分局入库税款排名(万元) */
  deptRank: NamedValue[]
  /** 处置时长分布(各区间任务数) */
  durationDist: NamedValue[]
  /** 人员绩效明细 */
  persons: PerfPersonRow[]
}

/** 风险管理接口分组 */
export interface RiskMgmtApi {
  /** 任务派发·筛选项 */
  getDispatchFilters(): Promise<DispatchFilters>
  /** 任务派发·概览(指标 + 人员负荷) */
  getDispatchBoard(): Promise<DispatchBoard>
  /** 任务派发·待派发线索列表 */
  getDispatchList(query: DispatchQuery): Promise<PagedResult<DispatchRow>>
  /** 结果回填·筛选项与概览 */
  getBackfillFilters(): Promise<BackfillFilters>
  /** 结果回填·任务列表 */
  getBackfillList(query: BackfillQuery): Promise<PagedResult<BackfillRow>>
  /** 处置绩效统计 */
  getPerformanceStats(): Promise<PerformanceStats>
}

/* ========================================================================
 * 十、规则库管理扩展（RuleOps）· 试跑与灰度 / 阈值参数 / 效果监测
 * ------------------------------------------------------------------------
 * 参照《需求文档》3.1.6 规则试运行、3.1.4 阈值参数、3.12.3 规则效果评估。
 * 与「规则配置」页的区别:配置页是单规则视角(定义/阈值/效果三标签),
 * 本组三页是跨规则视角(试跑队列 / 全库参数审计 / 全库效果横向对比)。
 * ====================================================================== */

/** 试跑任务状态:排队中 / 运行中 / 已完成 / 失败 */
export type TrialStatus = 'queued' | 'running' | 'done' | 'failed'

/** 灰度阶段:未灰度 / 灰度中 / 已全量 */
export type GrayStage = 'none' | 'gray' | 'full'

/** 试跑任务行 */
export interface TrialRow {
  /** 试跑任务编号 */
  id: string
  /** 规则编号 */
  ruleId: string
  /** 规则名称 */
  ruleName: string
  /** 样本范围(如「全市 · 近 12 个月」) */
  scope: string
  /** 任务状态 */
  status: TrialStatus
  /** 进度(百分数;运行中有效) */
  progress: number
  /** 命中量(完成后有效) */
  hitCount: number
  /** 预估误报率(百分数) */
  falseRate: number
  /** 影响面(涉及纳税人户数) */
  coverage: number
  /** 与现行版本对比的命中量变化文案(带符号) */
  hitDelta: string
  /** 灰度阶段 */
  gray: GrayStage
  /** 灰度比例(百分数;gray 阶段有效) */
  grayPercent: number
  /** 发起人 */
  operator: string
  /** 发起时间 */
  createdAt: string
}

/** 试跑筛选项与概览 */
export interface TrialFilters {
  /** 数据更新时间 */
  updatedAt: string
  /** 状态选项(附计数) */
  statuses: Array<FilterOption & { count: number }>
  /** 顶部指标 */
  kpis: Array<MetricItem & { accent: KpiAccent }>
}

/** 阈值参数·一条分档取值(跨规则集中管理视角) */
export interface ThresholdRow {
  /** 参数记录 id */
  id: string
  /** 所属规则编号 */
  ruleId: string
  /** 所属规则名称 */
  ruleName: string
  /** 参数名 */
  paramName: string
  /** 适用行业 */
  industry: string
  /** 适用纳税人规模 */
  scale: string
  /** 当前取值(字符串,便于表单编辑) */
  value: string
  /** 单位 */
  unit: string
  /** 最近修改时间 */
  updatedAt: string
  /** 最近修改人 */
  updatedBy: string
}

/** 阈值参数·变更记录 */
export interface ThresholdChangeLog {
  /** 变更时间 */
  time: string
  /** 规则名称 */
  ruleName: string
  /** 参数名 */
  paramName: string
  /** 变更前 */
  from: string
  /** 变更后 */
  to: string
  /** 操作人 */
  operator: string
  /** 变更事由 */
  reason: string
}

/** 阈值参数·查询参数 */
export interface ThresholdQuery {
  /** 规则名 / 参数名关键字 */
  keyword: string
  /** 适用行业;'all' 不限 */
  industry: string
  /** 页码,从 1 开始 */
  page: number
  /** 每页条数 */
  pageSize: number
}

/** 阈值参数·筛选项 */
export interface ThresholdFilters {
  /** 数据更新时间 */
  updatedAt: string
  /** 行业选项(含「全部行业」) */
  industries: FilterOption[]
  /** 变更记录(近期) */
  changeLogs: ThresholdChangeLog[]
}

/** 效果监测·规则结论:有效 / 待优化 / 建议下线 */
export type RuleVerdict = 'effective' | 'tuning' | 'retire'

/** 效果监测·规则横向对比行 */
export interface EffectRuleRow {
  /** 规则编号 */
  id: string
  /** 规则名称 */
  name: string
  /** 所属分类 */
  category: string
  /** 本月命中量 */
  monthHit: number
  /** 查实率(百分数) */
  hitRate: number
  /** 误报率(百分数) */
  falseRate: number
  /** 环比命中变化文案(带符号) */
  mom: string
  /** 近 6 月命中量(用于迷你趋势) */
  spark: number[]
  /** 评估结论 */
  verdict: RuleVerdict
}

/** 效果监测·优化建议 */
export interface EffectSuggestion {
  /** 建议标题 */
  title: string
  /** 涉及规则 */
  ruleName: string
  /** 建议说明 */
  note: string
  /** 紧要程度 */
  level: RiskLevel
}

/** 规则效果监测 */
export interface EffectMonitor {
  /** 顶部指标 */
  kpis: Array<MetricItem & { accent: KpiAccent }>
  /** 全库命中量趋势 */
  trend: SeriesPoint[]
  /** 分类命中占比 */
  categoryDist: NamedValue[]
  /** 规则横向对比 */
  rules: EffectRuleRow[]
  /** 优化建议 */
  suggestions: EffectSuggestion[]
}

/** 规则库管理扩展接口分组 */
export interface RuleOpsApi {
  /** 试跑筛选项与概览 */
  getTrialFilters(): Promise<TrialFilters>
  /** 试跑任务列表 */
  getTrials(status: string): Promise<TrialRow[]>
  /** 阈值参数筛选项与变更记录 */
  getThresholdFilters(): Promise<ThresholdFilters>
  /** 阈值参数列表(分页) */
  getThresholds(query: ThresholdQuery): Promise<PagedResult<ThresholdRow>>
  /** 规则效果监测 */
  getEffectMonitor(): Promise<EffectMonitor>
}

/* ========================================================================
 * 十一、智能模型（Model）· 风险评分模型
 * ------------------------------------------------------------------------
 * 参照《需求文档》4.3.1 风险评分模型。
 * 页面分「模型态」与「结果态」两层:
 *   模型态 —— 版本、训练信息、Lift 曲线、特征重要性(可解释性的全局视角);
 *   结果态 —— 纳税人评分排序清单 + 单户 SHAP 归因(可解释性的个体视角)。
 * 注:关联图谱分析虽同属「智能模型」菜单,但接口历史上单列在 graph 分组。
 * 重要约束:模型输出仅用于风险提示与线索排序,不作为税务定性依据,
 *          故所有结果类接口都必须能配套返回归因(getScoreAttribution)。
 * ====================================================================== */

/** 评分模型版本与训练信息 */
export interface ScoreModelInfo {
  /** 模型名称 */
  name: string
  /** 版本号 */
  version: string
  /** 算法 */
  algorithm: string
  /** 训练完成时间 */
  trainedAt: string
  /** 上线时间 */
  publishedAt: string
  /** 训练样本量(户) */
  sampleCount: number
  /** 正样本(历史查实户)占比,百分数 */
  positiveRate: number
  /** 入模特征总数 */
  featureCount: number
  /** 下次计划重训时间 */
  nextTrainAt: string
  /** 评分基准分(全样本平均分,SHAP 归因的基线) */
  baseScore: number
  /** 模型效果指标(Precision@200 / AUC / KS 等) */
  metrics: Array<MetricItem & { accent: KpiAccent; note: string }>
}

/** Lift 曲线上的一个分位点 */
export interface LiftPoint {
  /** 按风险分降序的累计覆盖分位,百分数(如 10 = 前 10%) */
  percentile: number
  /** 该分位的累计提升度(倍数;1.0 为随机基准) */
  lift: number
  /** 该分位的累计查实率,百分数 */
  precision: number
}

/** 特征重要性(全局解释) */
export interface FeatureImportance {
  /** 特征名称 */
  name: string
  /** 特征所属维度(发票 / 申报 / 税负 …) */
  dimension: string
  /** 归一化重要性,百分数(全部特征合计 100) */
  weight: number
}

/** 风险评分模型·模型态 */
export interface ScoreModelState {
  /** 版本与训练信息 */
  info: ScoreModelInfo
  /** Lift 曲线(按分位升序) */
  lift: LiftPoint[]
  /** 特征重要性 TOP20(按重要性降序) */
  features: FeatureImportance[]
}

/** 风险评分结果行 */
export interface ScoreRow {
  /** 全局排名(按风险分降序,与当前排序方式无关) */
  rank: number
  /** 纳税人识别号 */
  taxId: string
  /** 纳税人名称 */
  taxpayerName: string
  /** 所属区县 */
  district: string
  /** 所属行业 */
  industry: string
  /** 风险分(0–100) */
  score: number
  /** 风险等级(由分值分档) */
  level: RiskLevel
  /** 所处分位,百分数(如 1.2 = 前 1.2%) */
  percentile: number
  /** 较上期分值变化(带符号,如 "+6.4") */
  delta: string
  /** 分值变化语义(升高=风险恶化,故 negative 表示分值上升) */
  deltaTone: DeltaTone
  /** 主要驱动因子(SHAP 绝对值最大的前 2 项特征名) */
  topFactors: string[]
  /** 是否已生成风险线索 */
  hasClue: boolean
}

/** 风险评分结果·查询参数 */
export interface ScoreQuery {
  /** 纳税人名称 / 识别号关键字 */
  keyword: string
  /** 区县编码;'all' 不限 */
  districtCode: string
  /** 行业编码;'all' 不限 */
  industryCode: string
  /** 风险等级多选;空数组不限 */
  levels: RiskLevel[]
  /** 风险分下限;null 不限 */
  scoreMin: number | null
  /** 风险分上限;null 不限 */
  scoreMax: number | null
  /** 排序字段(score / percentile / delta) */
  sortKey: string
  /** 排序方向:1 升序 / -1 降序 */
  sortDir: 1 | -1
  /** 页码,从 1 开始 */
  page: number
  /** 每页条数 */
  pageSize: number
}

/** 风险评分结果·筛选项与概览 */
export interface ScoreFilters {
  /** 评分批次时间 */
  updatedAt: string
  /** 区县选项(含「全部区县」) */
  districts: FilterOption[]
  /** 行业选项(含「全部行业」) */
  industries: FilterOption[]
  /** 风险等级选项(附计数) */
  levels: Array<FilterOption & { count: number }>
  /** 结果态概览指标 */
  kpis: Array<MetricItem & { accent: KpiAccent }>
}

/** SHAP 单项贡献(个体解释) */
export interface ShapItem {
  /** 特征名称 */
  feature: string
  /** 该纳税人在此特征上的取值(已格式化,含单位) */
  value: string
  /** 同行业中位数参考值(已格式化,含单位) */
  benchmark: string
  /** SHAP 贡献值:正=推高风险分,负=压低风险分 */
  contribution: number
}

/** 风险评分归因(单户) */
export interface ScoreAttribution {
  /** 纳税人识别号 */
  taxId: string
  /** 纳税人名称 */
  taxpayerName: string
  /** 风险分 */
  score: number
  /** 风险等级 */
  level: RiskLevel
  /** 所处分位,百分数 */
  percentile: number
  /** 模型基准分(SHAP 基线) */
  baseScore: number
  /** 推高项贡献合计 */
  positiveSum: number
  /** 压低项贡献合计(负数) */
  negativeSum: number
  /** 贡献最大的 10 项(按绝对值降序) */
  items: ShapItem[]
  /** 归因结论(一句话) */
  summary: string
  /** 建议动作 */
  suggestion: string
}

/* ------------------------------------------------------------------------
 * 智能模型 · 虚开团伙识别(《需求文档》3.7 / 4.3.2)
 * 与风险评分模型的区别:评分模型的单位是「户」,本模型的单位是「团伙」,
 * 判定依据不是单户特征而是群体拓扑结构(环状 / 星状 / 链状)与群体行为证据。
 * 因此归因形态也不同:评分模型给 SHAP 贡献值,本模型给「认定依据」证据清单。
 * ---------------------------------------------------------------------- */

/** 团伙结构模式:环状(闭环互开)/ 星状(一票多流)/ 链状(层层过票) */
export type GangPattern = 'ring' | 'star' | 'chain'

/** 团伙核查状态 */
export type GangStatus = 'new' | 'checking' | 'confirmed' | 'excluded'

/** 团伙列表行 */
export interface GangRow {
  /** 团伙编号 */
  id: string
  /** 结构模式 */
  pattern: GangPattern
  /** 成员数(户) */
  memberCount: number
  /** 涉票金额(万元) */
  invoiceAmount: number
  /** 核心节点名称 */
  coreName: string
  /** 核心节点所在区县 */
  district: string
  /** 可疑度评分(0–100) */
  suspicion: number
  /** 可疑度等级(由评分分档) */
  level: RiskLevel
  /** 识别时间 */
  discoveredAt: string
  /** 核查状态 */
  status: GangStatus
}

/** 团伙列表·查询参数 */
export interface GangQuery {
  /** 团伙编号 / 核心节点名称关键字 */
  keyword: string
  /** 区县编码;'all' 不限 */
  districtCode: string
  /** 结构模式多选;空数组不限 */
  patterns: GangPattern[]
  /** 排序字段(suspicion / memberCount / invoiceAmount) */
  sortKey: string
  /** 排序方向:1 升序 / -1 降序 */
  sortDir: 1 | -1
  /** 页码,从 1 开始 */
  page: number
  /** 每页条数 */
  pageSize: number
}

/** 团伙列表·筛选项与概览 */
export interface GangFilters {
  /** 识别批次时间 */
  updatedAt: string
  /** 结构模式选项(附计数) */
  patterns: Array<FilterOption & { count: number }>
  /** 区县选项(含「全部区县」) */
  districts: FilterOption[]
  /** 概览指标 */
  kpis: Array<MetricItem & { accent: KpiAccent }>
}

/** 团伙成员 */
export interface GangMember {
  /** 对应子图节点 id(点击可在画布中选中) */
  nodeId: string
  /** 纳税人名称 */
  name: string
  /** 在团伙中的角色(开票方 / 受票方 / 过账中间户 / 实际控制人) */
  role: string
  /** 纳税人识别号 */
  taxId: string
  /** 该成员风险分(与风险评分模型同一口径) */
  score: number
  /** 风险等级 */
  level: RiskLevel
  /** 该成员涉票金额(万元) */
  invoiceAmount: number
  /** 行为说明 */
  note: string
}

/** 团伙认定依据(归因:说明可疑度分从何而来) */
export interface GangEvidence {
  /** 证据项名称 */
  name: string
  /** 实测表现 */
  detail: string
  /** 对可疑度评分的贡献(分) */
  weight: number
  /** 是否命中(未命中项也展示,便于人工判断结论是否可靠) */
  hit: boolean
}

/** 团伙下钻详情 */
export interface GangDetail {
  /** 团伙编号 */
  id: string
  /** 结构模式 */
  pattern: GangPattern
  /** 可疑度评分 */
  suspicion: number
  /** 一句话结论 */
  summary: string
  /** 子图节点(复用关联图谱的节点结构与画布坐标系) */
  nodes: GraphNode[]
  /** 子图连线 */
  edges: GraphEdge[]
  /** 默认选中的节点 id(核心节点) */
  coreId: string
  /** 成员清单(按风险分降序) */
  members: GangMember[]
  /** 认定依据 */
  evidences: GangEvidence[]
}

/* ------------------------------------------------------------------------
 * 智能模型 · 异常申报检测(《需求文档》4.3.3)
 * 与风险评分模型的本质区别:这是**无监督离群检测**,不使用历史查实标签训练,
 * 表达的是「该户在同行群体中的位置有多偏」,而不是「该户有多像历史问题户」。
 * 因此:
 *   - 对比基准是行业(切换行业即换一套样本分布),跨行业比较无意义;
 *   - 主可视化是平行坐标(多维同时看偏离),不是分值排序;
 *   - 归因是「各维度所处分位与偏离倍数」,不是特征贡献值。
 * ---------------------------------------------------------------------- */

/** 偏离方向:高于同业 / 低于同业 / 处于正常区间 */
export type DeviationDirection = 'high' | 'low' | 'normal'

/** 平行坐标的一个维度(纵轴) */
export interface ParallelDimension {
  /** 维度键 */
  key: string
  /** 维度名称 */
  name: string
  /** 单位 */
  unit: string
  /** 轴下端取值(同行业样本最小值) */
  min: number
  /** 轴上端取值(同行业样本最大值) */
  max: number
  /** 同行业中位数(画基准虚线) */
  median: number
  /** 小数位数(展示用) */
  decimals: number
}

/** 平行坐标的一条样本线 */
export interface ParallelSample {
  /** 纳税人识别号;背景样本为脱敏占位 */
  taxId: string
  /** 展示名称;背景样本已脱敏 */
  name: string
  /** 各维度取值,键为 ParallelDimension.key */
  values: Record<string, number>
  /** 是否被判定为离群样本(加深显示) */
  outlier: boolean
  /** 异常度评分(0–100) */
  score: number
}

/** 异常申报检测·平行坐标数据 */
export interface AbnormalChart {
  /** 行业名称(对比基准) */
  industryName: string
  /** 参与对比的同行业样本数 */
  sampleCount: number
  /** 检测方法说明(注明为无监督,不依赖历史查实标签) */
  method: string
  /** 维度定义(纵轴,自左向右) */
  dimensions: ParallelDimension[]
  /** 样本线 */
  samples: ParallelSample[]
}

/** 异常申报·列表行 */
export interface AbnormalRow {
  /** 行业内异常度排名 */
  rank: number
  /** 纳税人识别号 */
  taxId: string
  /** 纳税人名称 */
  taxpayerName: string
  /** 所属行业 */
  industry: string
  /** 异常度评分(0–100) */
  score: number
  /** 异常等级(由评分分档) */
  level: RiskLevel
  /** 申报所属期 */
  period: string
  /** 偏离最大的三个维度 */
  topDeviations: Array<{
    /** 维度名称 */
    name: string
    /** 偏离描述(如 "高于同业 2.8 倍标准差") */
    deviation: string
    /** 偏离方向 */
    direction: DeviationDirection
  }>
}

/** 异常申报·查询参数 */
export interface AbnormalQuery {
  /** 纳税人名称 / 识别号关键字 */
  keyword: string
  /** 行业编码(对比基准,不可为 all —— 跨行业比较无意义) */
  industryCode: string
  /** 排序字段(score) */
  sortKey: string
  /** 排序方向:1 升序 / -1 降序 */
  sortDir: 1 | -1
  /** 页码,从 1 开始 */
  page: number
  /** 每页条数 */
  pageSize: number
}

/** 异常申报·筛选项与概览 */
export interface AbnormalFilters {
  /** 检测批次时间 */
  updatedAt: string
  /** 行业选项(对比基准,无「全部行业」项) */
  industries: FilterOption[]
  /** 默认行业编码 */
  defaultIndustryCode: string
  /** 概览指标 */
  kpis: Array<MetricItem & { accent: KpiAccent }>
}

/** 单维度偏离明细 */
export interface DeviationItem {
  /** 维度键(与平行坐标维度对应) */
  key: string
  /** 维度名称 */
  name: string
  /** 本企业取值(已格式化,含单位) */
  value: string
  /** 同行业中位数(已格式化,含单位) */
  median: string
  /** 在同行业中所处分位(百分数,50 为中位) */
  percentile: number
  /** 偏离倍数(标准差倍数,带符号) */
  z: number
  /** 偏离方向 */
  direction: DeviationDirection
  /** 该维度的业务解读 */
  note: string
}

/** 异常申报·单户归因 */
export interface AbnormalDetail {
  /** 纳税人识别号 */
  taxId: string
  /** 纳税人名称 */
  taxpayerName: string
  /** 所属行业 */
  industry: string
  /** 异常度评分 */
  score: number
  /** 异常等级 */
  level: RiskLevel
  /** 申报所属期 */
  period: string
  /** 一句话结论 */
  summary: string
  /** 各维度偏离明细(按偏离绝对值降序) */
  items: DeviationItem[]
  /** 建议动作 */
  suggestion: string
}

/** 智能模型接口分组 */
export interface ModelApi {
  /** 风险评分模型·模型态(版本 / Lift / 特征重要性) */
  getScoreModelState(): Promise<ScoreModelState>
  /** 风险评分结果·筛选项与概览 */
  getScoreFilters(): Promise<ScoreFilters>
  /** 风险评分结果·列表(服务端排序 + 分页) */
  getScores(query: ScoreQuery): Promise<PagedResult<ScoreRow>>
  /** 风险评分归因·单户 SHAP 明细 */
  getScoreAttribution(taxId: string): Promise<ScoreAttribution>
  /** 虚开团伙·筛选项与概览 */
  getGangFilters(): Promise<GangFilters>
  /** 虚开团伙·列表(服务端排序 + 分页) */
  getGangs(query: GangQuery): Promise<PagedResult<GangRow>>
  /** 虚开团伙·下钻详情(子图 + 成员 + 认定依据) */
  getGangDetail(id: string): Promise<GangDetail>
  /** 异常申报·筛选项与概览 */
  getAbnormalFilters(): Promise<AbnormalFilters>
  /** 异常申报·某行业的平行坐标样本分布 */
  getAbnormalChart(industryCode: string): Promise<AbnormalChart>
  /** 异常申报·离群企业列表(服务端排序 + 分页) */
  getAbnormals(query: AbnormalQuery): Promise<PagedResult<AbnormalRow>>
  /** 异常申报·单户维度偏离归因 */
  getAbnormalDetail(taxId: string): Promise<AbnormalDetail>
}

/* ========================================================================
 * 顶层 API 客户端
 * ====================================================================== */
export interface ApiClient {
  /** 领导驾驶舱 */
  dashboard: DashboardApi
  /** 风险线索工作台 */
  clues: CluesApi
  /** 一户式档案详情 */
  archive: ArchiveApi
  /** 规则库管理 · 规则配置 */
  rules: RulesApi
  /** 智能应用 · 政策智能问答 */
  qa: QaApi
  /** 智能模型 · 关联图谱分析 */
  graph: GraphApi
  /** 智能模型 · 风险评分模型 */
  model: ModelApi
  /** 决策分析 · 收入 / 税源 / 成效 / 专题 */
  decision: DecisionApi
  /** 数据治理 · 接入监控 / 质量看板 / 主体识别 */
  datagov: DataGovApi
  /** 风险管理 · 任务派发 / 结果回填 / 处置绩效 */
  riskmgmt: RiskMgmtApi
  /** 规则库管理扩展 · 试跑灰度 / 阈值参数 / 效果监测 */
  ruleops: RuleOpsApi
}

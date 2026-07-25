/* ============================================================
 * Mock 适配器（VITE_API_MODE=mock）
 * 数据 1:1 取自《领导驾驶舱》设计稿。签名与 http 适配器完全一致。
 * 说明:mock 忽略 query（周期/区县切换返回同一份演示数据）,
 *       但仍模拟网络延迟以呈现四态中的「加载中」。
 * 禁止被页面组件直接引用,只能经由 src/api/client.ts。
 * ============================================================ */
import type {
  ApiClient,
  ArchiveDeclare,
  ArchiveEvaluation,
  ArchiveInvoice,
  ArchiveSummary,
  ClueDetail,
  ClueDisposalOptions,
  ClueFilters,
  ClueQuery,
  ClueRow,
  ClueRuleHit,
  ClueStatus,
  ComparisonModel,
  DashboardFilters,
  DashboardQuery,
  DistrictCompletion,
  GraphData,
  GraphNodeDetail,
  KeyValue,
  KpiCard,
  PagedResult,
  QaSession,
  RevenueTrend,
  RiskLevel,
  RiskTaskFunnel,
  RuleCategoryNode,
  RuleDetail,
  RuleFilters,
  RuleQuery,
  RuleRow,
  RuleStatus,
  SourceContribution,
  TaxTypeStructure,
} from '../types'

/** 模拟网络延迟（毫秒）:让加载态可见,又不至于拖慢演示 */
const LATENCY = 320
function delay<T>(data: T, ms = LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

/* ---------------- 风险线索:演示数据集 ---------------- */
// 设计稿给出 9 条样例;此处扩充至 24 条,以便演示高密度列表与分页。
interface RawClue {
  id: string
  taxpayerName: string
  taxId: string
  riskLevel: RiskLevel
  hitRuleCount: number
  estimatedTax: number
  createdDate: string
  status: ClueStatus
  districtCode: string
  categoryCode: string
}

const CLUE_DATA: RawClue[] = [
  { id: 'XF2026-0731', taxpayerName: '城东区某建材经营部', taxId: '91....MA2Q7X', riskLevel: 'high', hitRuleCount: 5, estimatedTax: 128.65, createdDate: '2026-07-21', status: 'pending', districtCode: 'chengdong', categoryCode: 'invoice' },
  { id: 'XF2026-0730', taxpayerName: '高新区某智能装备公司', taxId: '91....MA8P4V', riskLevel: 'high', hitRuleCount: 6, estimatedTax: 316.80, createdDate: '2026-07-21', status: 'pending', districtCode: 'gaoxin', categoryCode: 'income' },
  { id: 'XF2026-0728', taxpayerName: '城西区某商贸有限公司', taxId: '91....MA2K3P', riskLevel: 'high', hitRuleCount: 4, estimatedTax: 96.42, createdDate: '2026-07-20', status: 'processing', districtCode: 'chengxi', categoryCode: 'invoice' },
  { id: 'XF2026-0727', taxpayerName: '江北新区某钢结构公司', taxId: '91....MA9L6W', riskLevel: 'high', hitRuleCount: 5, estimatedTax: 254.10, createdDate: '2026-07-20', status: 'pending', districtCode: 'jiangbei', categoryCode: 'income' },
  { id: 'XF2026-0725', taxpayerName: '临江县某科技有限公司', taxId: '91....MA2B9L', riskLevel: 'mid', hitRuleCount: 3, estimatedTax: 64.23, createdDate: '2026-07-19', status: 'pending', districtCode: 'linjiang', categoryCode: 'income' },
  { id: 'XF2026-0724', taxpayerName: '城东区某物流仓储公司', taxId: '91....MA3D8F', riskLevel: 'mid', hitRuleCount: 3, estimatedTax: 58.94, createdDate: '2026-07-19', status: 'processing', districtCode: 'chengdong', categoryCode: 'register' },
  { id: 'XF2026-0722', taxpayerName: '高新区某餐饮管理公司', taxId: '91....MA2M6D', riskLevel: 'mid', hitRuleCount: 3, estimatedTax: 41.08, createdDate: '2026-07-18', status: 'processing', districtCode: 'gaoxin', categoryCode: 'income' },
  { id: 'XF2026-0721', taxpayerName: '云岭县某矿业开发公司', taxId: '91....MA7Q2J', riskLevel: 'high', hitRuleCount: 4, estimatedTax: 182.36, createdDate: '2026-07-18', status: 'returned', districtCode: 'yunling', categoryCode: 'invoice' },
  { id: 'XF2026-0719', taxpayerName: '云岭县某运输有限公司', taxId: '91....MA4R5N', riskLevel: 'low', hitRuleCount: 2, estimatedTax: 18.76, createdDate: '2026-07-17', status: 'done', districtCode: 'yunling', categoryCode: 'register' },
  { id: 'XF2026-0718', taxpayerName: '城西区某装饰工程公司', taxId: '91....MA5W9G', riskLevel: 'mid', hitRuleCount: 4, estimatedTax: 87.52, createdDate: '2026-07-17', status: 'processing', districtCode: 'chengxi', categoryCode: 'invoice' },
  { id: 'XF2026-0716', taxpayerName: '江北新区某建筑劳务公司', taxId: '91....MA5T2K', riskLevel: 'high', hitRuleCount: 6, estimatedTax: 210.30, createdDate: '2026-07-16', status: 'pending', districtCode: 'jiangbei', categoryCode: 'income' },
  { id: 'XF2026-0715', taxpayerName: '高新区某软件服务公司', taxId: '91....MA1X7B', riskLevel: 'low', hitRuleCount: 2, estimatedTax: 22.41, createdDate: '2026-07-16', status: 'done', districtCode: 'gaoxin', categoryCode: 'benefit' },
  { id: 'XF2026-0713', taxpayerName: '城东区某医药零售店', taxId: '91....MA3Y8H', riskLevel: 'mid', hitRuleCount: 2, estimatedTax: 33.50, createdDate: '2026-07-15', status: 'returned', districtCode: 'chengdong', categoryCode: 'invoice' },
  { id: 'XF2026-0712', taxpayerName: '临江县某食品加工厂', taxId: '91....MA6H4S', riskLevel: 'mid', hitRuleCount: 3, estimatedTax: 46.18, createdDate: '2026-07-15', status: 'processing', districtCode: 'linjiang', categoryCode: 'income' },
  { id: 'XF2026-0710', taxpayerName: '临江县某农资经营部', taxId: '91....MA6Z3Q', riskLevel: 'low', hitRuleCount: 1, estimatedTax: 9.64, createdDate: '2026-07-14', status: 'done', districtCode: 'linjiang', categoryCode: 'benefit' },
  { id: 'XF2026-0709', taxpayerName: '城西区某汽车销售公司', taxId: '91....MA8N5R', riskLevel: 'high', hitRuleCount: 5, estimatedTax: 165.72, createdDate: '2026-07-14', status: 'pending', districtCode: 'chengxi', categoryCode: 'invoice' },
  { id: 'XF2026-0707', taxpayerName: '城西区某电子商务公司', taxId: '91....MA7E1C', riskLevel: 'mid', hitRuleCount: 4, estimatedTax: 72.90, createdDate: '2026-07-13', status: 'processing', districtCode: 'chengxi', categoryCode: 'register' },
  { id: 'XF2026-0706', taxpayerName: '江北新区某纺织有限公司', taxId: '91....MA2V6T', riskLevel: 'mid', hitRuleCount: 3, estimatedTax: 53.27, createdDate: '2026-07-13', status: 'pending', districtCode: 'jiangbei', categoryCode: 'income' },
  { id: 'XF2026-0704', taxpayerName: '云岭县某建筑安装公司', taxId: '91....MA4C8K', riskLevel: 'low', hitRuleCount: 2, estimatedTax: 27.35, createdDate: '2026-07-12', status: 'done', districtCode: 'yunling', categoryCode: 'register' },
  { id: 'XF2026-0703', taxpayerName: '城东区某文化传媒公司', taxId: '91....MA9G3D', riskLevel: 'mid', hitRuleCount: 2, estimatedTax: 38.61, createdDate: '2026-07-12', status: 'returned', districtCode: 'chengdong', categoryCode: 'benefit' },
  { id: 'XF2026-0702', taxpayerName: '高新区某新材料公司', taxId: '91....MA5B2Y', riskLevel: 'high', hitRuleCount: 4, estimatedTax: 143.09, createdDate: '2026-07-11', status: 'processing', districtCode: 'gaoxin', categoryCode: 'income' },
  { id: 'XF2026-0701', taxpayerName: '临江县某酒店管理公司', taxId: '91....MA3K9M', riskLevel: 'low', hitRuleCount: 1, estimatedTax: 14.28, createdDate: '2026-07-11', status: 'done', districtCode: 'linjiang', categoryCode: 'invoice' },
  { id: 'XF2026-0629', taxpayerName: '江北新区某五金制造厂', taxId: '91....MA7T4P', riskLevel: 'mid', hitRuleCount: 3, estimatedTax: 61.83, createdDate: '2026-07-10', status: 'pending', districtCode: 'jiangbei', categoryCode: 'register' },
  { id: 'XF2026-0628', taxpayerName: '云岭县某茶业专业合作社', taxId: '91....MA1D6X', riskLevel: 'low', hitRuleCount: 1, estimatedTax: 7.92, createdDate: '2026-07-10', status: 'done', districtCode: 'yunling', categoryCode: 'benefit' },
]

/** 抽屉·风险点明细的规则池（按命中条数截取） */
const RULE_POOL: Omit<ClueRuleHit, 'no'>[] = [
  { name: '增值税申报收入与开票金额比对异常', basis: '当期申报销售额低于增值税发票开具金额', leftLabel: '申报数据', leftValue: '申报销售额 ￥862.4万', rightLabel: '金税发票开具额', rightValue: '￥1,046.8万', diff: '开票额高于申报 21.4%' },
  { name: '发票用量与经营规模不匹配', basis: '月度发票领用量环比激增且远超同行', leftLabel: '申报数据', leftValue: '上期领用 120 份', rightLabel: '本期领用', rightValue: '480 份', diff: '环比增长 300%' },
  { name: '企业所得税贡献率显著偏低', basis: '所得税贡献率低于行业预警下限', leftLabel: '申报数据', leftValue: '本企业贡献率 0.32%', rightLabel: '行业预警下限', rightValue: '1.10%', diff: '低于下限 0.78pct' },
  { name: '用电量与申报产值背离', basis: '供电数据显示实际产能高于申报产值', leftLabel: '申报数据', leftValue: '申报产值 ￥1,200万', rightLabel: '按用电量测算', rightValue: '￥2,050万', diff: '测算高出 70.8%' },
  { name: '社保参保人数与申报薪金倒挂', basis: '社保参保人数多于个税申报人数', leftLabel: '申报数据', leftValue: '个税申报 18 人', rightLabel: '社保参保', rightValue: '46 人', diff: '差额 28 人未申报' },
  { name: '不动产交易未申报', basis: '不动产登记过户无对应纳税申报', leftLabel: '申报数据', leftValue: '申报交易 0 笔', rightLabel: '不动产过户', rightValue: '2 笔 ￥680万', diff: '2 笔未申报' },
]

/** 千分位整数格式化 */
const money = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })

/* ==================== 规则库:演示数据集 ==================== */

/** 比对范式 → 展示名 */
const MODEL_LABEL: Record<ComparisonModel, string> = {
  threshold: '单点阈值比对',
  cross: '双源交叉比对',
  trend: '趋势环比分析',
  benchmark: '同业基准比对',
  list: '名单匹配',
  logic: '逻辑关系校验',
}

/** 税种编码 → 展示名 */
const TAX_LABEL: Record<string, string> = {
  vat: '增值税',
  eit: '企业所得税',
  iit: '个人所得税',
  consume: '消费税',
  stamp: '印花税',
}

/** 风险等级 → 中文(适配器内部使用,不依赖前端 UI 文案) */
const RISK_CN: Record<RiskLevel, string> = { high: '高风险', mid: '中风险', low: '低风险' }
/** 规则状态 → 中文 */
const STATUS_CN: Record<RuleStatus, string> = {
  enabled: '启用',
  testing: '试跑中',
  disabled: '停用',
  draft: '草稿',
}

/** 分类叶子编码 → 名称 */
const CAT_LABEL: Record<string, string> = {
  'invoice.io': '进销项比对',
  'invoice.abnormal': '开票异常',
  'invoice.limit': '顶额开票',
  'income.declare': '申报收入比对',
  'income.hidden': '隐匿收入',
  'cost.abnormal': '成本异常',
  'cost.expense': '费用列支',
  'burden.rate': '税负率预警',
  'burden.change': '税负异动',
  'benefit.qualify': '优惠资格',
  'benefit.reduction': '减免核查',
  'register.info': '登记信息异常',
  'register.lost': '走逃失联',
  'declare.zero': '零负申报',
  'declare.logic': '申报逻辑校验',
  'related.pricing': '转让定价',
  'related.fund': '关联资金',
  'fund.bank': '银行流水异常',
  'fund.large': '大额往来',
  'other.comprehensive': '综合风险',
}

/** 十大类分类树骨架(计数由 RULE_DATA 动态汇总) */
const CATEGORY_SKELETON: Array<{ code: string; name: string; leaves: string[] }> = [
  { code: 'invoice', name: '发票类', leaves: ['invoice.io', 'invoice.abnormal', 'invoice.limit'] },
  { code: 'income', name: '收入类', leaves: ['income.declare', 'income.hidden'] },
  { code: 'cost', name: '成本费用类', leaves: ['cost.abnormal', 'cost.expense'] },
  { code: 'burden', name: '税负类', leaves: ['burden.rate', 'burden.change'] },
  { code: 'benefit', name: '优惠类', leaves: ['benefit.qualify', 'benefit.reduction'] },
  { code: 'register', name: '登记类', leaves: ['register.info', 'register.lost'] },
  { code: 'declare', name: '申报类', leaves: ['declare.zero', 'declare.logic'] },
  { code: 'related', name: '关联交易类', leaves: ['related.pricing', 'related.fund'] },
  { code: 'fund', name: '资金类', leaves: ['fund.bank', 'fund.large'] },
  { code: 'other', name: '其他类', leaves: ['other.comprehensive'] },
]

interface RawRule {
  id: string
  name: string
  categoryCode: string
  taxTypes: string[]
  model: ComparisonModel
  riskLevel: RiskLevel
  status: RuleStatus
  monthHit: number
  hitRate: number
}

const RULE_DATA: RawRule[] = [
  { id: 'FP-VAT-014', name: '增值税进销项金额比对异常', categoryCode: 'invoice.io', taxTypes: ['vat'], model: 'cross', riskLevel: 'high', status: 'enabled', monthHit: 128, hitRate: 61.2 },
  { id: 'FP-VAT-021', name: '发票开具额超申报销售额', categoryCode: 'invoice.io', taxTypes: ['vat'], model: 'cross', riskLevel: 'high', status: 'enabled', monthHit: 96, hitRate: 58.4 },
  { id: 'FP-GP-007', name: '发票领用量环比激增', categoryCode: 'invoice.abnormal', taxTypes: ['vat'], model: 'trend', riskLevel: 'mid', status: 'enabled', monthHit: 74, hitRate: 44.0 },
  { id: 'FP-GP-033', name: '作废红冲比例异常偏高', categoryCode: 'invoice.abnormal', taxTypes: ['vat'], model: 'threshold', riskLevel: 'mid', status: 'testing', monthHit: 41, hitRate: 39.5 },
  { id: 'FP-VAT-028', name: '农产品收购发票虚增进项', categoryCode: 'invoice.abnormal', taxTypes: ['vat'], model: 'cross', riskLevel: 'high', status: 'enabled', monthHit: 77, hitRate: 50.3 },
  { id: 'FP-DE-002', name: '顶额顶格开票预警', categoryCode: 'invoice.limit', taxTypes: ['vat'], model: 'threshold', riskLevel: 'high', status: 'enabled', monthHit: 63, hitRate: 52.1 },
  { id: 'SR-VAT-011', name: '申报收入与开票收入背离', categoryCode: 'income.declare', taxTypes: ['vat', 'eit'], model: 'cross', riskLevel: 'high', status: 'enabled', monthHit: 88, hitRate: 55.7 },
  { id: 'SR-EIT-004', name: '营业收入与用电量背离', categoryCode: 'income.declare', taxTypes: ['eit'], model: 'trend', riskLevel: 'mid', status: 'enabled', monthHit: 52, hitRate: 41.3 },
  { id: 'SR-XF-002', name: '应税消费品收入比对异常', categoryCode: 'income.declare', taxTypes: ['consume'], model: 'cross', riskLevel: 'mid', status: 'disabled', monthHit: 18, hitRate: 22.1 },
  { id: 'SR-YN-009', name: '隐匿现金收入疑点', categoryCode: 'income.hidden', taxTypes: ['vat'], model: 'logic', riskLevel: 'mid', status: 'testing', monthHit: 37, hitRate: 33.8 },
  { id: 'CB-EIT-015', name: '成本费用率显著高于同业', categoryCode: 'cost.abnormal', taxTypes: ['eit'], model: 'benchmark', riskLevel: 'mid', status: 'enabled', monthHit: 45, hitRate: 40.6 },
  { id: 'CB-EIT-030', name: '主营成本与产能测算背离', categoryCode: 'cost.abnormal', taxTypes: ['eit'], model: 'trend', riskLevel: 'mid', status: 'enabled', monthHit: 44, hitRate: 38.2 },
  { id: 'CB-EIT-022', name: '期间费用异常列支', categoryCode: 'cost.expense', taxTypes: ['eit'], model: 'threshold', riskLevel: 'low', status: 'enabled', monthHit: 29, hitRate: 26.4 },
  { id: 'SF-EIT-001', name: '企业所得税贡献率偏低', categoryCode: 'burden.rate', taxTypes: ['eit'], model: 'benchmark', riskLevel: 'high', status: 'enabled', monthHit: 110, hitRate: 57.9 },
  { id: 'SF-VAT-006', name: '增值税税负率低于预警下限', categoryCode: 'burden.rate', taxTypes: ['vat'], model: 'benchmark', riskLevel: 'high', status: 'enabled', monthHit: 97, hitRate: 54.2 },
  { id: 'SF-BD-018', name: '税负率环比骤降', categoryCode: 'burden.change', taxTypes: ['vat', 'eit'], model: 'trend', riskLevel: 'mid', status: 'enabled', monthHit: 58, hitRate: 43.1 },
  { id: 'YH-JM-003', name: '小微优惠资格疑点', categoryCode: 'benefit.qualify', taxTypes: ['eit'], model: 'logic', riskLevel: 'mid', status: 'enabled', monthHit: 34, hitRate: 30.5 },
  { id: 'YH-JM-012', name: '减免税额超限核查', categoryCode: 'benefit.reduction', taxTypes: ['eit', 'vat'], model: 'threshold', riskLevel: 'mid', status: 'testing', monthHit: 26, hitRate: 28.7 },
  { id: 'DJ-XX-005', name: '登记信息与工商不一致', categoryCode: 'register.info', taxTypes: ['stamp'], model: 'cross', riskLevel: 'low', status: 'enabled', monthHit: 22, hitRate: 19.8 },
  { id: 'DJ-ZT-001', name: '走逃失联疑似企业', categoryCode: 'register.lost', taxTypes: ['vat'], model: 'list', riskLevel: 'high', status: 'enabled', monthHit: 71, hitRate: 63.4 },
  { id: 'SB-LF-008', name: '长期零负申报预警', categoryCode: 'declare.zero', taxTypes: ['vat', 'eit'], model: 'threshold', riskLevel: 'mid', status: 'enabled', monthHit: 66, hitRate: 42.7 },
  { id: 'SB-LJ-014', name: '申报表勾稽关系异常', categoryCode: 'declare.logic', taxTypes: ['eit'], model: 'logic', riskLevel: 'low', status: 'enabled', monthHit: 31, hitRate: 24.9 },
  { id: 'SB-YH-020', name: '印花税应税合同漏申报', categoryCode: 'declare.logic', taxTypes: ['stamp'], model: 'logic', riskLevel: 'low', status: 'draft', monthHit: 0, hitRate: 0 },
  { id: 'GL-DJ-002', name: '关联企业转让定价偏离', categoryCode: 'related.pricing', taxTypes: ['eit'], model: 'benchmark', riskLevel: 'high', status: 'testing', monthHit: 48, hitRate: 46.2 },
  { id: 'GL-ZJ-007', name: '关联方资金占用异常', categoryCode: 'related.fund', taxTypes: ['eit'], model: 'logic', riskLevel: 'mid', status: 'enabled', monthHit: 39, hitRate: 35.1 },
  { id: 'ZJ-YH-011', name: '银行流水与申报收入不符', categoryCode: 'fund.bank', taxTypes: ['vat'], model: 'cross', riskLevel: 'high', status: 'enabled', monthHit: 84, hitRate: 51.5 },
  { id: 'ZJ-DE-004', name: '法人个人账户大额往来', categoryCode: 'fund.large', taxTypes: ['iit'], model: 'threshold', riskLevel: 'mid', status: 'testing', monthHit: 43, hitRate: 37.9 },
  { id: 'QT-ZH-001', name: '多维度综合高风险', categoryCode: 'other.comprehensive', taxTypes: ['vat', 'eit', 'iit'], model: 'logic', riskLevel: 'high', status: 'enabled', monthHit: 102, hitRate: 59.6 },
]

/** 判定逻辑表达式 / 数据来源(按比对范式给出模板) */
const MODEL_LOGIC: Record<ComparisonModel, { logic: string; source: string; threshold: string }> = {
  threshold: { logic: '指标值 > 预警阈值(按行业/规模分档取值)', source: '申报征管数据', threshold: '超过分档上限即命中' },
  cross: { logic: 'ABS(数据源A − 数据源B) / 数据源B × 100% > 偏离阈值', source: '增值税申报表 + 金税发票数据', threshold: '偏离度 ≥ 20%' },
  trend: { logic: '(本期指标 / 上期指标 − 1) 超出正常波动区间', source: '近 12 期历史申报数据', threshold: '环比波动 ≥ ±30%' },
  benchmark: { logic: '本企业指标 < 同行业同规模基准下限', source: '行业税负基准库 + 申报数据', threshold: '低于基准下限 1 个标准差' },
  list: { logic: '纳税主体命中外部风险名单', source: '外部委办共享名单 + 登记信息', threshold: '命中任一名单即预警' },
  logic: { logic: '申报表主附表勾稽关系不成立', source: '申报表逻辑校验引擎', threshold: '勾稽差额 ≠ 0' },
}

/** 由行数据构造规则详情(三标签页) */
function buildRuleDetail(r: RawRule): RuleDetail {
  const m = MODEL_LOGIC[r.model]
  const taxNames = r.taxTypes.map((t) => TAX_LABEL[t] || t).join('、')
  const definition = [
    { label: '规则编号', value: r.id, full: false, mono: true },
    { label: '规则名称', value: r.name, full: false, mono: false },
    { label: '规则类别', value: CAT_LABEL[r.categoryCode] || r.categoryCode, full: false, mono: false },
    { label: '风险等级', value: RISK_CN[r.riskLevel], full: false, mono: false },
    { label: '涉及税种', value: taxNames, full: false, mono: false },
    { label: '比对范式', value: MODEL_LABEL[r.model], full: false, mono: false },
    { label: '规则状态', value: STATUS_CN[r.status], full: false, mono: false },
    { label: '适用行业', value: '通用(批发零售、建筑安装、制造业优先)', full: false, mono: false },
    { label: '适用纳税人规模', value: '一般纳税人', full: false, mono: false },
    { label: '数据来源', value: m.source, full: false, mono: false },
    { label: '判定逻辑', value: m.logic, full: true, mono: true },
    { label: '预警阈值', value: m.threshold, full: false, mono: false },
    { label: '命中处理方式', value: '自动生成风险线索并推送线索池,由主管税务所派发核查', full: false, mono: false },
    { label: '预警提示语', value: `${r.name},请核实相关申报数据的真实性与完整性。`, full: true, mono: false },
    { label: '处置建议', value: '调取纳税人账簿、合同及第三方比对数据,核实差异原因;确属少缴的依法追缴并加收滞纳金。', full: true, mono: false },
    { label: '政策依据', value: '《中华人民共和国税收征收管理法》第三十五条;《增值税暂行条例》及相关征管规范。', full: true, mono: false },
    { label: '规则版本', value: 'v2.3(2026-06-01 生效)', full: false, mono: true },
  ]

  const months = ['2月', '3月', '4月', '5月', '6月', '7月']
  // 近 6 月命中量向本月值爬升,命中率在规则命中率上下小幅波动
  const factors = [0.62, 0.71, 0.68, 0.83, 0.92, 1]
  const rateDelta = [-6.2, -3.1, -4.4, 1.2, -0.6, 0]
  const points = months.map((month, i) => ({
    month,
    hitCount: Math.round(r.monthHit * factors[i]),
    hitRate: r.hitRate === 0 ? 0 : +Math.max(0, r.hitRate + rateDelta[i]).toFixed(1),
  }))
  const cum = points.reduce((s, p) => s + p.hitCount, 0)
  const avgRate = r.hitRate === 0 ? 0 : +(points.reduce((s, p) => s + p.hitRate, 0) / points.length).toFixed(1)

  return {
    id: r.id,
    name: r.name,
    categoryName: CAT_LABEL[r.categoryCode] || r.categoryCode,
    riskLevel: r.riskLevel,
    status: r.status,
    definition,
    threshold: {
      params: [
        { key: 'upper', label: '预警上限', unit: '%' },
        { key: 'lower', label: '预警下限', unit: '%' },
        { key: 'window', label: '观察周期', unit: '月' },
      ],
      tiers: [
        { id: 't1', industry: '批发零售', scale: '一般纳税人', values: { upper: '20', lower: '3', window: '12' } },
        { id: 't2', industry: '建筑安装', scale: '一般纳税人', values: { upper: '25', lower: '5', window: '12' } },
        { id: 't3', industry: '通用', scale: '小规模', values: { upper: '30', lower: '8', window: '6' } },
      ],
    },
    effect: {
      summary: [
        { label: '本月命中', value: String(r.monthHit), unit: '条' },
        { label: '近半年累计', value: String(cum), unit: '条' },
        { label: '平均命中率', value: avgRate.toFixed(1), unit: '%' },
        { label: '查实率', value: r.hitRate.toFixed(1), unit: '%' },
      ],
      points,
    },
  }
}

export const mockClient: ApiClient = {
  dashboard: {
    getDashboardFilters(): Promise<DashboardFilters> {
      return delay({
        updatedAt: '2026-07-24 08:00',
        periods: [
          { value: 'month', label: '本月' },
          { value: 'quarter', label: '本季' },
          { value: 'year', label: '本年' },
        ],
        defaultPeriod: 'quarter',
        districts: [
          { value: 'all', label: '全市' },
          { value: 'chengdong', label: '城东区' },
          { value: 'gaoxin', label: '高新区' },
          { value: 'linjiang', label: '临江县' },
          { value: 'chengxi', label: '城西区' },
          { value: 'yunling', label: '云岭县' },
          { value: 'jiangbei', label: '江北新区' },
        ],
        defaultDistrictCode: 'all',
      })
    },

    getRevenueKpis(_query: DashboardQuery): Promise<KpiCard[]> {
      return delay([
        { key: 'revenue', label: '税收收入累计', value: '8.62', unit: '亿元', accent: 'primary', delta: '▲ 6.4%', deltaTone: 'positive', deltaNote: '同比', linkTo: '' },
        { key: 'yoy', label: '同比增幅', value: '6.4', unit: '%', accent: 'teal', delta: '▲ 1.2pct', deltaTone: 'positive', deltaNote: '较上季', linkTo: '' },
        { key: 'budget', label: '预算完成进度', value: '78.5', unit: '%', accent: 'green', delta: '时序进度 75.0%', deltaTone: 'positive', deltaNote: '超序时', linkTo: '' },
        { key: 'govAdd', label: '综合治税增收', value: '1.28', unit: '亿元', accent: 'gold', delta: '▲ 21.3%', deltaTone: 'positive', deltaNote: '同比', linkTo: '/rules/config' },
        { key: 'riskRate', label: '风险任务处置率', value: '86.3', unit: '%', accent: 'red', delta: '待处置 137 户', deltaTone: 'negative', deltaNote: '剩余', linkTo: '/risk-pool?status=pending' },
      ])
    },

    getRevenueTrend(_query: DashboardQuery): Promise<RevenueTrend> {
      const months = ['8月', '9月', '10月', '11月', '12月', '1月', '2月', '3月', '4月', '5月', '6月', '7月']
      const values = [6.2, 6.6, 7.0, 6.8, 7.3, 7.7, 8.0, 7.9, 8.4, 8.6, 8.9, 9.1]
      const splitIdx = 8 // 索引 0..8 为实际,9..11 为预测（衔接点 8 归属实际）
      return delay({
        unit: '亿元',
        points: months.map((month, i) => ({ month, value: values[i], isForecast: i > splitIdx })),
      })
    },

    getTaxTypeStructure(_query: DashboardQuery): Promise<TaxTypeStructure> {
      return delay({
        totalLabel: '8.62亿',
        segments: [
          { name: '增值税', pct: 42 },
          { name: '企业所得税', pct: 21 },
          { name: '个人所得税', pct: 12 },
          { name: '消费税', pct: 9 },
          { name: '城建税及附加', pct: 7 },
          { name: '其他税种', pct: 9 },
        ],
      })
    },

    getDistrictCompletion(_query: DashboardQuery): Promise<DistrictCompletion[]> {
      // 已按完成率降序
      return delay([
        { name: '城东区', pct: 92 },
        { name: '高新区', pct: 88 },
        { name: '临江县', pct: 84 },
        { name: '城西区', pct: 79 },
        { name: '云岭县', pct: 73 },
        { name: '江北新区', pct: 68 },
      ])
    },

    getSourceContribution(_query: DashboardQuery): Promise<SourceContribution[]> {
      return delay([
        { name: '市场监管', value: 1280 },
        { name: '社保', value: 960 },
        { name: '不动产', value: 740 },
        { name: '供电', value: 520 },
        { name: '公共资源交易', value: 430 },
        { name: '其他', value: 260 },
      ])
    },

    getRiskTaskFunnel(_query: DashboardQuery): Promise<RiskTaskFunnel> {
      const stages = [
        { name: '推送', value: 4200 },
        { name: '派发', value: 3600 },
        { name: '处置', value: 3100 },
        { name: '命中', value: 2400 },
        { name: '入库', value: 1850 },
      ]
      return delay({
        stages,
        overallConversion: +((stages[4].value / stages[0].value) * 100).toFixed(1), // 44.0
      })
    },
  },

  /* ==================== 风险线索工作台 ==================== */
  clues: {
    getClueFilters(): Promise<ClueFilters> {
      const countBy = (lv: RiskLevel) => CLUE_DATA.filter((c) => c.riskLevel === lv).length
      return delay({
        updatedAt: '2026-07-24 08:00',
        districts: [
          { value: 'all', label: '全部区县' },
          { value: 'chengdong', label: '城东区' },
          { value: 'gaoxin', label: '高新区' },
          { value: 'linjiang', label: '临江县' },
          { value: 'chengxi', label: '城西区' },
          { value: 'yunling', label: '云岭县' },
          { value: 'jiangbei', label: '江北新区' },
        ],
        categories: [
          { value: 'all', label: '全部类别' },
          { value: 'invoice', label: '发票类' },
          { value: 'income', label: '收入类' },
          { value: 'register', label: '登记类' },
          { value: 'benefit', label: '优惠类' },
        ],
        riskLevels: [
          { value: 'high', label: '高风险', count: countBy('high') },
          { value: 'mid', label: '中风险', count: countBy('mid') },
          { value: 'low', label: '低风险', count: countBy('low') },
        ],
        statuses: [
          { value: 'pending', label: '待派发' },
          { value: 'processing', label: '处置中' },
          { value: 'done', label: '已办结' },
          { value: 'returned', label: '已退回' },
        ],
      })
    },

    getClues(query: ClueQuery): Promise<PagedResult<ClueRow>> {
      const kw = query.keyword.trim()
      const filtered = CLUE_DATA.filter((c) => {
        if (kw && c.taxpayerName.indexOf(kw) < 0 && c.taxId.indexOf(kw) < 0 && c.id.indexOf(kw) < 0) return false
        if (query.districtCode !== 'all' && c.districtCode !== query.districtCode) return false
        if (query.categoryCode !== 'all' && c.categoryCode !== query.categoryCode) return false
        if (query.taxMin !== null && c.estimatedTax < query.taxMin) return false
        if (query.taxMax !== null && c.estimatedTax > query.taxMax) return false
        if (query.riskLevels.length > 0 && query.riskLevels.indexOf(c.riskLevel) < 0) return false
        if (query.statuses.length > 0 && query.statuses.indexOf(c.status) < 0) return false
        return true
      })
      const start = (query.page - 1) * query.pageSize
      const items: ClueRow[] = filtered.slice(start, start + query.pageSize).map((c) => ({
        id: c.id,
        taxpayerName: c.taxpayerName,
        taxId: c.taxId,
        riskLevel: c.riskLevel,
        hitRuleCount: c.hitRuleCount,
        estimatedTax: c.estimatedTax,
        createdDate: c.createdDate,
        status: c.status,
      }))
      return delay({ items, total: filtered.length, page: query.page, pageSize: query.pageSize })
    },

    getClueDisposalOptions(): Promise<ClueDisposalOptions> {
      return delay({
        conclusions: [
          { value: 'due', label: '需补缴税款' },
          { value: 'transfer', label: '移送稽查处理' },
          { value: 'none', label: '未发现问题(误报)' },
        ],
        falseConclusionValue: 'none',
        problemTypes: [
          { value: 'hidden-income', label: '隐匿销售收入' },
          { value: 'fake-cost', label: '虚增成本费用' },
          { value: 'fake-invoice', label: '虚开发票' },
          { value: 'wrong-rate', label: '适用税率错误' },
          { value: 'benefit-abuse', label: '税收优惠不当' },
          { value: 'related-transfer', label: '关联交易转移利润' },
          { value: 'other', label: '其他' },
        ],
        taxKinds: [
          { value: 'vat', label: '增值税' },
          { value: 'eit', label: '企业所得税' },
          { value: 'iit', label: '个人所得税' },
          { value: 'consume', label: '消费税' },
          { value: 'urban', label: '城建税及附加' },
          { value: 'stamp', label: '印花税' },
        ],
        falseReasons: [
          { value: 'data-lag', label: '数据未及时更新' },
          { value: 'caliber', label: '统计口径差异' },
          { value: 'policy', label: '政策适用差异' },
          { value: 'self-fixed', label: '纳税人已自行更正' },
          { value: 'third-party', label: '第三方数据有误' },
          { value: 'threshold', label: '规则阈值偏严' },
          { value: 'other', label: '其他' },
        ],
      })
    },

    getClueDetail(id: string): Promise<ClueDetail> {
      const c = CLUE_DATA.filter((x) => x.id === id)[0] || CLUE_DATA[0]
      const backTax = c.estimatedTax * 10000 * 0.86
      return delay({
        id: c.id,
        taxpayerName: c.taxpayerName,
        taxId: c.taxId,
        riskLevel: c.riskLevel,
        hitRuleCount: c.hitRuleCount,
        estimatedTax: c.estimatedTax,
        status: c.status,
        rules: RULE_POOL.slice(0, c.hitRuleCount).map((r, i) => ({ ...r, no: i + 1 })),
        profileBasic: [
          { key: '纳税人名称', value: c.taxpayerName, numeric: false },
          { key: '纳税人识别号', value: c.taxId, numeric: true },
          { key: '登记注册类型', value: '有限责任公司', numeric: false },
          { key: '所属行业', value: '批发和零售业', numeric: false },
          { key: '主管税务所', value: '城东区税务所', numeric: false },
          { key: '登记状态', value: '正常', numeric: false },
        ],
        profileDeclare: [
          { label: '近12月申报户次', value: '12', unit: '次' },
          { label: '累计已入库(万)', value: c.estimatedTax.toFixed(1), unit: '' },
          { label: '欠税余额(万)', value: '0.00', unit: '' },
          { label: '纳税信用等级', value: 'B', unit: '级' },
        ],
        profileInvoice: [
          { label: '领用', value: '480', tone: 'default' },
          { label: '已开', value: '452', tone: 'default' },
          { label: '作废', value: '21', tone: 'warn' },
          { label: '红冲', value: '7', tone: 'danger' },
        ],
        timeline: [
          { title: '系统生成风险线索', time: `${c.createdDate} 08:00`, operator: '风险模型', note: `命中 ${c.hitRuleCount} 条规则,风险评分较高`, state: 'done' },
          { title: '线索派发至主管税务所', time: '2026-07-22 09:20', operator: '风险管理科', note: '指派核查人员 2 名', state: 'done' },
          { title: '实地核查进行中', time: '2026-07-23 14:30', operator: '核查人员 王××', note: '已调取账簿及发票,核对第三方比对数据', state: 'active' },
          { title: '待结果回填', time: '—', operator: '—', note: '核查结论待录入', state: 'pending' },
        ],
        disposal: {
          conclusion: '存在少缴税款,需补缴',
          backTax: money(backTax),
          lateFee: money(backTax * 0.06),
          opinion: '',
        },
      })
    },
  },

  /* ==================== 一户式档案详情 ==================== */
  archive: {
    getArchiveSummary(_taxId: string): Promise<ArchiveSummary> {
      return delay({
        taxpayerName: '城东区某建材经营部',
        taxId: '91330100MA2****Q7X',
        creditCode: '91330100MA2****Q7X',
        authority: '城东区税务所',
        avatarText: '城',
        riskLevel: 'high',
        registrationStatus: '在营',
        metrics: [
          { label: '风险评分', value: '82', tone: 'danger' },
          { label: '未办结线索', value: '2', tone: 'warn' },
          { label: '年入库(万)', value: '128.6', tone: 'default' },
          { label: '信用等级', value: 'B', tone: 'gold' },
        ],
      })
    },

    getArchiveProfile(_taxId: string, section: 'base' | 'reg' | 'biz'): Promise<KeyValue[]> {
      const map: Record<'base' | 'reg' | 'biz', KeyValue[]> = {
        base: [
          { key: '纳税人名称', value: '城东区某建材经营部', numeric: false },
          { key: '统一社会信用代码', value: '91330100MA2****Q7X', numeric: true },
          { key: '纳税人识别号', value: '91330100MA2****Q7X', numeric: true },
          { key: '法定代表人', value: '张××', numeric: false },
          { key: '注册资本', value: '500 万元', numeric: false },
          { key: '成立日期', value: '2016-03-18', numeric: true },
          { key: '联系电话', value: '0000-8888****', numeric: true },
          { key: '注册地址', value: '城东区工业大道 XX 号', numeric: false },
          { key: '经营地址', value: '城东区工业大道 XX 号', numeric: false },
        ],
        reg: [
          { key: '登记注册类型', value: '有限责任公司', numeric: false },
          { key: '所属行业', value: '批发和零售业 / 建材', numeric: false },
          { key: '主管税务所', value: '城东区税务所', numeric: false },
          { key: '税务登记日期', value: '2016-03-25', numeric: true },
          { key: '登记状态', value: '正常', numeric: false },
          { key: '一般纳税人资格', value: '是', numeric: false },
          { key: '资格认定日期', value: '2016-06-01', numeric: true },
          { key: '财务负责人', value: '李××', numeric: false },
          { key: '办税人员', value: '王××', numeric: false },
        ],
        biz: [
          { key: '经营范围', value: '建筑材料批发、零售', numeric: false },
          { key: '从业人数', value: '46 人', numeric: true },
          { key: '社保参保人数', value: '46 人', numeric: true },
          { key: '年用电量', value: '82.4 万度', numeric: true },
          { key: '主要供应商', value: '12 家', numeric: true },
          { key: '主要客户', value: '38 家', numeric: true },
          { key: '关联企业', value: '3 家', numeric: true },
          { key: '不动产', value: '2 处', numeric: true },
          { key: '车辆', value: '6 辆', numeric: true },
        ],
      }
      return delay(map[section])
    },

    getArchiveDeclare(_taxId: string): Promise<ArchiveDeclare> {
      return delay({
        kpis: [
          { label: '近12月申报户次', value: '12', unit: '次', accent: 'primary' },
          { label: '累计已入库', value: '128.6', unit: '万', accent: 'teal' },
          { label: '欠税余额', value: '0.00', unit: '万', accent: 'green' },
          { label: '纳税信用等级', value: 'B', unit: '级', accent: 'gold' },
        ],
        taxes: [
          { name: '增值税', amount: 72.4, yoy: '+8.2%', yoyPositive: true },
          { name: '企业所得税', amount: 31.6, yoy: '-4.1%', yoyPositive: false },
          { name: '个人所得税', amount: 12.3, yoy: '+2.6%', yoyPositive: true },
          { name: '城建税及附加', amount: 7.8, yoy: '+8.0%', yoyPositive: true },
          { name: '印花税', amount: 4.5, yoy: '+1.2%', yoyPositive: true },
        ],
      })
    },

    getArchiveInvoice(_taxId: string): Promise<ArchiveInvoice> {
      return delay({
        stats: [
          { label: '领用', value: '480', tone: 'default' },
          { label: '已开', value: '452', tone: 'default' },
          { label: '作废', value: '21', tone: 'warn' },
          { label: '红冲', value: '7', tone: 'danger' },
        ],
        monthly: [
          { month: '2月', output: 86, input: 70 },
          { month: '3月', output: 92, input: 74 },
          { month: '4月', output: 78, input: 66 },
          { month: '5月', output: 110, input: 88 },
          { month: '6月', output: 124, input: 96 },
          { month: '7月', output: 138, input: 104 },
        ],
        warnings: [
          { title: '发票领用量环比激增', desc: '本期领用 480 份,较上期增长 300%', level: 'high' },
          { title: '开票额高于申报销售额', desc: '开票 1,046.8 万 · 申报 862.4 万,差异 21.4%', level: 'mid' },
          { title: '进项税额抵扣占比偏高', desc: '进项/销项 比值 0.83,高于同行均值', level: 'low' },
        ],
      })
    },

    getArchiveEvaluation(_taxId: string): Promise<ArchiveEvaluation> {
      return delay({
        creditHistory: [
          { year: '2023', grade: 'A', tone: 'success' },
          { year: '2024', grade: 'B', tone: 'gold' },
          { year: '2025', grade: 'B', tone: 'gold' },
          { year: '2026', grade: 'M', tone: 'default' },
        ],
        tags: [
          { name: '重点税源', tone: 'primary' },
          { name: '高风险', tone: 'danger' },
          { name: '发票异常', tone: 'warn' },
          { name: '一般纳税人', tone: 'neutral' },
          { name: '首违不罚适用', tone: 'success' },
        ],
        records: [
          { label: '当前风险评分', value: '82 / 100', tone: 'danger' },
          { label: '未办结风险线索', value: '2 条', tone: 'warn' },
          { label: '历史核查次数', value: '3 次', tone: 'default' },
          { label: '查实并补缴', value: '1 次', tone: 'default' },
          { label: '行政处罚记录', value: '0 次', tone: 'success' },
          { label: '欠税/滞纳记录', value: '无', tone: 'success' },
        ],
      })
    },
  },

  /* ==================== 规则库管理 · 规则配置 ==================== */
  rules: {
    getRuleFilters(): Promise<RuleFilters> {
      // 计数:叶子 = 该叶子规则数;父类 = 各叶子之和;树根不单列
      const leafCount = (leaf: string) => RULE_DATA.filter((r) => r.categoryCode === leaf).length
      const categoryTree: RuleCategoryNode[] = CATEGORY_SKELETON.map((c) => {
        const children = c.leaves.map((leaf) => ({
          code: leaf,
          name: CAT_LABEL[leaf],
          count: leafCount(leaf),
        }))
        return {
          code: c.code,
          name: c.name,
          count: children.reduce((s, ch) => s + ch.count, 0),
          children,
        }
      })
      return delay({
        updatedAt: '2026-07-24 08:00',
        categoryTree,
        statuses: [
          { value: 'all', label: '全部状态' },
          { value: 'enabled', label: '启用' },
          { value: 'testing', label: '试跑中' },
          { value: 'disabled', label: '停用' },
          { value: 'draft', label: '草稿' },
        ],
        taxTypes: [
          { value: 'all', label: '全部税种' },
          { value: 'vat', label: '增值税' },
          { value: 'eit', label: '企业所得税' },
          { value: 'iit', label: '个人所得税' },
          { value: 'consume', label: '消费税' },
          { value: 'stamp', label: '印花税' },
        ],
        riskLevels: [
          { value: 'all', label: '全部等级' },
          { value: 'high', label: '高风险' },
          { value: 'mid', label: '中风险' },
          { value: 'low', label: '低风险' },
        ],
        models: [
          { value: 'all', label: '全部范式' },
          { value: 'threshold', label: '单点阈值比对' },
          { value: 'cross', label: '双源交叉比对' },
          { value: 'trend', label: '趋势环比分析' },
          { value: 'benchmark', label: '同业基准比对' },
          { value: 'list', label: '名单匹配' },
          { value: 'logic', label: '逻辑关系校验' },
        ],
      })
    },

    getRules(query: RuleQuery): Promise<PagedResult<RuleRow>> {
      const kw = query.keyword.trim()
      // 选中父类(编码不含点)时匹配其全部子类;选中叶子时精确匹配
      const inCategory = (code: string) => {
        if (query.categoryCode === 'all') return true
        if (query.categoryCode.indexOf('.') >= 0) return code === query.categoryCode
        return code === query.categoryCode || code.indexOf(`${query.categoryCode}.`) === 0
      }
      const filtered = RULE_DATA.filter((r) => {
        if (kw && r.name.indexOf(kw) < 0 && r.id.toUpperCase().indexOf(kw.toUpperCase()) < 0) return false
        if (!inCategory(r.categoryCode)) return false
        if (query.status !== 'all' && r.status !== query.status) return false
        if (query.taxType !== 'all' && r.taxTypes.indexOf(query.taxType) < 0) return false
        if (query.riskLevel !== 'all' && r.riskLevel !== query.riskLevel) return false
        if (query.model !== 'all' && r.model !== query.model) return false
        return true
      })
      const start = (query.page - 1) * query.pageSize
      const items: RuleRow[] = filtered.slice(start, start + query.pageSize).map((r) => ({
        id: r.id,
        name: r.name,
        categoryCode: r.categoryCode,
        categoryName: CAT_LABEL[r.categoryCode] || r.categoryCode,
        taxTypes: r.taxTypes.map((t) => TAX_LABEL[t] || t),
        model: r.model,
        modelLabel: MODEL_LABEL[r.model],
        riskLevel: r.riskLevel,
        status: r.status,
        monthHit: r.monthHit,
        hitRate: r.hitRate,
      }))
      return delay({ items, total: filtered.length, page: query.page, pageSize: query.pageSize })
    },

    getRuleDetail(id: string): Promise<RuleDetail> {
      const r = RULE_DATA.filter((x) => x.id === id)[0] || RULE_DATA[0]
      return delay(buildRuleDetail(r))
    },
  },

  /* ==================== 智能模型 · 关联图谱分析 ==================== */
  graph: {
    getGraph(_rootId: string): Promise<GraphData> {
      const nodes: GraphData['nodes'] = [
        { id: 'n1', label: '城东区某建材经营部', type: 'ent', x: 440, y: 310, risk: 'high', core: true },
        { id: 'n2', label: '张××', type: 'person', x: 230, y: 170, risk: null, core: false },
        { id: 'n3', label: '城西区某商贸公司', type: 'ent', x: 210, y: 400, risk: 'high', core: false },
        { id: 'n4', label: '临江县某科技公司', type: 'ent', x: 120, y: 280, risk: 'mid', core: false },
        { id: 'n5', label: '李××', type: 'person', x: 470, y: 120, risk: null, core: false },
        { id: 'n6', label: '王××', type: 'person', x: 660, y: 150, risk: null, core: false },
        { id: 'n7', label: '某对公账户', type: 'fund', x: 700, y: 330, risk: null, core: false },
        { id: 'n8', label: '受票方 A 公司', type: 'invoice', x: 640, y: 470, risk: null, core: false },
        { id: 'n9', label: '受票方 B 公司', type: 'invoice', x: 420, y: 520, risk: null, core: false },
        { id: 'n10', label: '高新区某餐饮公司', type: 'ent', x: 180, y: 520, risk: 'mid', core: false },
      ]
      const edges: GraphData['edges'] = [
        { source: 'n1', target: 'n2', label: '法定代表人', strong: true },
        { source: 'n1', target: 'n5', label: '财务负责人', strong: false },
        { source: 'n1', target: 'n6', label: '股东', strong: false },
        { source: 'n2', target: 'n3', label: '兼任法人', strong: true },
        { source: 'n1', target: 'n3', label: '资金往来', strong: true },
        { source: 'n1', target: 'n7', label: '对公账户', strong: false },
        { source: 'n1', target: 'n8', label: '开票', strong: true },
        { source: 'n1', target: 'n9', label: '开票', strong: true },
        { source: 'n6', target: 'n4', label: '投资控股', strong: false },
        { source: 'n3', target: 'n10', label: '资金往来', strong: true },
        { source: 'n7', target: 'n8', label: '资金流向', strong: false },
      ]
      const name = (id: string) => nodes.filter((n) => n.id === id)[0].label
      // 显式详情(n1/n2/n3);其余节点用通用兜底
      const explicit: Record<string, GraphNodeDetail> = {
        n1: {
          attrs: [
            { key: '纳税人识别号', value: '91....Q7X', numeric: true },
            { key: '风险评分', value: '82 / 100', numeric: true },
            { key: '成立日期', value: '2016-03-18', numeric: true },
            { key: '注册资本', value: '500 万元', numeric: false },
            { key: '关联层级', value: '核心节点', numeric: false },
          ],
          relations: [
            { targetId: 'n2', targetName: name('n2'), rel: '法定代表人', note: '张××同时为城西区某商贸公司法人', tone: 'danger' },
            { targetId: 'n3', targetName: name('n3'), rel: '资金往来', note: '近12月往来 1,240 万元,金额异常', tone: 'danger' },
            { targetId: 'n8', targetName: name('n8'), rel: '开票', note: '向受票方A开票 620 万元', tone: 'warn' },
            { targetId: 'n7', targetName: name('n7'), rel: '对公账户', note: '大额资金当日转出', tone: 'neutral' },
          ],
        },
        n2: {
          attrs: [
            { key: '身份证号', value: '3301****1234', numeric: true },
            { key: '关联企业数', value: '2 家', numeric: true },
            { key: '任职', value: '法定代表人', numeric: false },
            { key: '风险标签', value: '一人多企', numeric: false },
          ],
          relations: [
            { targetId: 'n1', targetName: name('n1'), rel: '法定代表人', note: '城东区某建材经营部', tone: 'primary' },
            { targetId: 'n3', targetName: name('n3'), rel: '兼任法人', note: '城西区某商贸公司,两企业间资金往来密集', tone: 'danger' },
          ],
        },
        n3: {
          attrs: [
            { key: '纳税人识别号', value: '91....K3P', numeric: true },
            { key: '风险评分', value: '76 / 100', numeric: true },
            { key: '与核心关系', value: '共同法人 + 资金往来', numeric: false },
            { key: '信用等级', value: 'C 级', numeric: false },
          ],
          relations: [
            { targetId: 'n2', targetName: name('n2'), rel: '法定代表人', note: '张××(与核心企业同一法人)', tone: 'danger' },
            { targetId: 'n1', targetName: name('n1'), rel: '资金往来', note: '双向往来 1,240 万元', tone: 'danger' },
            { targetId: 'n10', targetName: name('n10'), rel: '资金往来', note: '转入 480 万元', tone: 'warn' },
          ],
        },
      }
      const TYPE_CN: Record<string, string> = { ent: '企业', person: '人员', fund: '资金账户', invoice: '受票企业' }
      const details: Record<string, GraphNodeDetail> = {}
      nodes.forEach((n) => {
        details[n.id] =
          explicit[n.id] || {
            attrs: [
              { key: '类型', value: TYPE_CN[n.type], numeric: false },
              { key: '关联层级', value: '2 层', numeric: true },
              { key: '关联对象数', value: '—', numeric: false },
            ],
            relations: [
              { targetId: 'n1', targetName: name('n1'), rel: '关联', note: '与核心企业存在关联', tone: 'primary' },
            ],
          }
      })

      return delay({ rootName: '城东区某建材经营部', rootId: 'n1', nodes, edges, details })
    },
  },

  /* ==================== 智能应用 · 政策智能问答 ==================== */
  qa: {
    getQaSession(): Promise<QaSession> {
      return delay({
        knowledgeScope: '增值税 · 综合治税',
        sources: [
          {
            no: 1,
            docNo: '财税〔20XX〕XX号',
            title: '关于小规模纳税人减免增值税政策的公告(示例)',
            clause: '第一条',
            snippet: '对月销售额未超过规定标准的小规模纳税人,免征增值税;具体标准以当期公告为准。',
            effect: '现行有效',
            effectTone: 'success',
            date: '20XX-01-01',
          },
          {
            no: 2,
            docNo: '税务总局公告20XX年第XX号',
            title: '关于减免增值税政策征管问题的公告(示例)',
            clause: '第二条、第四条',
            snippet: '明确销售额的合并计算口径、开具专用发票的处理及申报表填写要求。',
            effect: '现行有效',
            effectTone: 'success',
            date: '20XX-01-01',
          },
          {
            no: 3,
            docNo: '府办发〔20XX〕XX号',
            title: '综合治税信息共享管理办法(示例)',
            clause: '第八条',
            snippet: '市场监管、社保、不动产、供电等部门应按周期向税务机关推送涉税信息,用于税源监控与风险分析。',
            effect: '现行有效',
            effectTone: 'success',
            date: '20XX-06-01',
          },
          {
            no: 4,
            docNo: 'XX税发〔20XX〕XX号',
            title: '综合治税第三方数据涉税应用指引(示例)',
            clause: '第三章 第十二条',
            snippet: '第三方数据可用于登记比对、收入核实、发票风险识别及欠税追踪等涉税分析场景。',
            effect: '现行有效',
            effectTone: 'success',
            date: '20XX-09-01',
          },
        ],
        messages: [
          {
            role: 'user',
            text: '小规模纳税人月销售额未超标准免征增值税的政策依据是什么?',
            paras: [],
            citeIndexes: [],
          },
          {
            role: 'assistant',
            text: '',
            paras: [
              '根据现行政策,小规模纳税人发生增值税应税销售行为,合计月销售额未超过规定标准的,免征增值税;按季申报的以季度销售额为判断口径。',
              '需注意:销售额应按规定合并计算;若已就免税销售额开具增值税专用发票,相应部分不适用免税,应按规定申报缴纳。具体适用标准与征管口径以当期公告为准。',
            ],
            citeIndexes: [0, 1],
          },
          {
            role: 'user',
            text: '综合治税中,市场监管等第三方数据可以用于哪些涉税分析?',
            paras: [],
            citeIndexes: [],
          },
          {
            role: 'assistant',
            text: '',
            paras: [
              '按照综合治税信息共享机制,市场监管、社保、不动产、供电、公共资源交易等部门数据由相关部门定期推送至税务机关,纳入统一的涉税数据资源池。',
              '这些数据主要用于:登记状态比对(在营与登记一致性)、经营收入核实、发票风险识别、社保与薪金倒挂分析,以及欠税与资产线索追踪等风险分析场景。',
            ],
            citeIndexes: [2, 3],
          },
        ],
        suggestions: ['小微企业所得税优惠适用条件', '增值税加计抵减政策', '发票风险线索如何核查'],
      })
    },
  },
}

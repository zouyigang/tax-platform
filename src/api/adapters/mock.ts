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
  BackfillFilters,
  BackfillQuery,
  BackfillRow,
  BackfillStatus,
  DashboardFilters,
  DashboardQuery,
  DataSourceMonitor,
  DispatchBoard,
  DispatchFilters,
  DispatchQuery,
  DispatchRow,
  EffectMonitor,
  PerformanceStats,
  ThresholdFilters,
  ThresholdQuery,
  ThresholdRow,
  TrialFilters,
  TrialRow,
  DecisionFilters,
  DecisionQuery,
  DistrictCompletion,
  EntityMatchDetail,
  EntityMatchFilters,
  EntityMatchQuery,
  EntityMatchRow,
  MatchStatus,
  QualityDashboard,
  EffectivenessAnalysis,
  GraphData,
  GraphNodeDetail,
  RevenueAnalysis,
  TaxSourceAnalysis,
  TopicAnalysis,
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

/* ==================== 数据治理:主体识别演示数据 ==================== */
interface RawEntity {
  id: string
  name: string
  taxId: string
  sourceCount: number
  identifierCount: number
  status: MatchStatus
  confidence: number
  updatedAt: string
}

const ENTITY_DATA: RawEntity[] = [
  { id: 'EM2026-0412', name: '城东区某建材经营部', taxId: '91....MA2Q7X', sourceCount: 6, identifierCount: 9, status: 'matched', confidence: 98.6, updatedAt: '2026-07-24 06:10' },
  { id: 'EM2026-0411', name: '高新区某智能装备公司', taxId: '91....MA8P4V', sourceCount: 5, identifierCount: 7, status: 'matched', confidence: 96.2, updatedAt: '2026-07-24 06:10' },
  { id: 'EM2026-0409', name: '城西区某商贸有限公司', taxId: '91....MA2K3P', sourceCount: 4, identifierCount: 6, status: 'conflict', confidence: 72.4, updatedAt: '2026-07-24 06:08' },
  { id: 'EM2026-0407', name: '江北新区某钢结构公司', taxId: '91....MA9L6W', sourceCount: 5, identifierCount: 8, status: 'pending', confidence: 81.5, updatedAt: '2026-07-24 06:08' },
  { id: 'EM2026-0405', name: '临江县某科技有限公司', taxId: '91....MA2B9L', sourceCount: 3, identifierCount: 4, status: 'matched', confidence: 94.8, updatedAt: '2026-07-24 06:05' },
  { id: 'EM2026-0403', name: '城东区某物流仓储公司', taxId: '91....MA3D8F', sourceCount: 4, identifierCount: 5, status: 'pending', confidence: 78.9, updatedAt: '2026-07-24 06:05' },
  { id: 'EM2026-0401', name: '高新区某餐饮管理公司', taxId: '91....MA2M6D', sourceCount: 3, identifierCount: 5, status: 'conflict', confidence: 68.3, updatedAt: '2026-07-24 06:02' },
  { id: 'EM2026-0398', name: '云岭县某矿业开发公司', taxId: '91....MA7Q2J', sourceCount: 6, identifierCount: 10, status: 'matched', confidence: 97.1, updatedAt: '2026-07-24 06:02' },
  { id: 'EM2026-0396', name: '云岭县某运输有限公司', taxId: '91....MA4R5N', sourceCount: 2, identifierCount: 3, status: 'rejected', confidence: 42.6, updatedAt: '2026-07-24 05:58' },
  { id: 'EM2026-0394', name: '城西区某装饰工程公司', taxId: '91....MA5W9G', sourceCount: 4, identifierCount: 6, status: 'matched', confidence: 93.4, updatedAt: '2026-07-24 05:58' },
  { id: 'EM2026-0392', name: '江北新区某建筑劳务公司', taxId: '91....MA5T2K', sourceCount: 5, identifierCount: 7, status: 'pending', confidence: 84.2, updatedAt: '2026-07-24 05:55' },
  { id: 'EM2026-0390', name: '高新区某软件服务公司', taxId: '91....MA1X7B', sourceCount: 3, identifierCount: 4, status: 'matched', confidence: 95.6, updatedAt: '2026-07-24 05:55' },
  { id: 'EM2026-0388', name: '城东区某医药零售店', taxId: '91....MA3Y8H', sourceCount: 3, identifierCount: 4, status: 'conflict', confidence: 70.8, updatedAt: '2026-07-24 05:52' },
  { id: 'EM2026-0386', name: '临江县某食品加工厂', taxId: '91....MA6H4S', sourceCount: 4, identifierCount: 6, status: 'matched', confidence: 92.3, updatedAt: '2026-07-24 05:52' },
  { id: 'EM2026-0384', name: '临江县某农资经营部', taxId: '91....MA6Z3Q', sourceCount: 2, identifierCount: 3, status: 'rejected', confidence: 38.4, updatedAt: '2026-07-24 05:48' },
  { id: 'EM2026-0382', name: '城西区某汽车销售公司', taxId: '91....MA8N5R', sourceCount: 5, identifierCount: 8, status: 'matched', confidence: 96.9, updatedAt: '2026-07-24 05:48' },
  { id: 'EM2026-0380', name: '城西区某电子商务公司', taxId: '91....MA7E1C', sourceCount: 4, identifierCount: 6, status: 'pending', confidence: 79.6, updatedAt: '2026-07-24 05:45' },
  { id: 'EM2026-0378', name: '江北新区某纺织有限公司', taxId: '91....MA2V6T', sourceCount: 3, identifierCount: 5, status: 'matched', confidence: 91.7, updatedAt: '2026-07-24 05:45' },
]

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

  /* ==================== 规则库管理扩展 ==================== */
  ruleops: {
    getTrialFilters(): Promise<TrialFilters> {
      return delay({
        updatedAt: '2026-07-24 08:00',
        statuses: [
          { value: 'all', label: '全部状态', count: 8 },
          { value: 'running', label: '运行中', count: 2 },
          { value: 'queued', label: '排队中', count: 1 },
          { value: 'done', label: '已完成', count: 4 },
          { value: 'failed', label: '失败', count: 1 },
        ],
        kpis: [
          { label: '本月试跑', value: '26', unit: '次', accent: 'primary' },
          { label: '进行中', value: '3', unit: '个', accent: 'teal' },
          { label: '灰度发布中', value: '4', unit: '条规则', accent: 'gold' },
          { label: '试跑转全量率', value: '62.5', unit: '%', accent: 'green' },
        ],
      })
    },

    getTrials(status: string): Promise<TrialRow[]> {
      // 取规则库前 8 条构造试跑任务,保持与规则配置页数据一致
      const OPS = ['王××', '李××', '张××', '陈××']
      const STATUS_CYCLE: TrialRow['status'][] = ['running', 'done', 'done', 'queued', 'done', 'failed', 'running', 'done']
      const GRAY_CYCLE: TrialRow['gray'][] = ['gray', 'full', 'gray', 'none', 'full', 'none', 'gray', 'gray']
      const all: TrialRow[] = RULE_DATA.slice(0, 8).map((r, i) => {
        const st = STATUS_CYCLE[i]
        const done = st === 'done'
        return {
          id: `TR2026-${(3100 + i).toString()}`,
          ruleId: r.id,
          ruleName: r.name,
          scope: i % 2 === 0 ? '全市 · 近 12 个月' : '城东区 · 近 6 个月',
          status: st,
          progress: st === 'running' ? [64, 0, 0, 0, 0, 0, 38, 0][i] : done ? 100 : 0,
          hitCount: done || st === 'running' ? Math.round(r.monthHit * 11.4) : 0,
          falseRate: done ? +(100 - r.hitRate).toFixed(1) : 0,
          coverage: done || st === 'running' ? Math.round(r.monthHit * 8.6) : 0,
          hitDelta: done ? (i % 3 === 0 ? '+18.2%' : i % 3 === 1 ? '-6.4%' : '+9.1%') : '—',
          gray: GRAY_CYCLE[i],
          grayPercent: GRAY_CYCLE[i] === 'gray' ? [20, 0, 50, 0, 0, 0, 10, 30][i] : 0,
          operator: OPS[i % OPS.length],
          createdAt: `2026-07-${String(24 - i).padStart(2, '0')} 09:${String(10 + i * 6).padStart(2, '0')}`,
        }
      })
      return delay(status === 'all' ? all : all.filter((t) => t.status === status))
    },

    getThresholdFilters(): Promise<ThresholdFilters> {
      return delay({
        updatedAt: '2026-07-24 08:00',
        industries: [
          { value: 'all', label: '全部行业' },
          { value: '通用', label: '通用' },
          { value: '批发零售', label: '批发零售' },
          { value: '建筑安装', label: '建筑安装' },
          { value: '制造业', label: '制造业' },
          { value: '房地产', label: '房地产' },
        ],
        changeLogs: [
          { time: '2026-07-22 15:20', ruleName: '增值税税负率低于预警下限', paramName: '预警下限', from: '2.5', to: '2.2', operator: '李××', reason: '按上级口径下调,减少低风险误报' },
          { time: '2026-07-18 10:05', ruleName: '发票领用量环比激增', paramName: '环比倍数', from: '2.0', to: '2.5', operator: '王××', reason: '试跑显示 2.0 倍误报率偏高' },
          { time: '2026-07-15 16:40', ruleName: '企业所得税贡献率偏低', paramName: '观察周期', from: '6', to: '12', operator: '张××', reason: '拉长周期以平抑季节性波动' },
          { time: '2026-07-09 09:30', ruleName: '关联企业转让定价偏离', paramName: '偏离阈值', from: '15', to: '20', operator: '陈××', reason: '与稽查口径对齐' },
        ],
      })
    },

    getThresholds(query: ThresholdQuery): Promise<PagedResult<ThresholdRow>> {
      const TIERS: Array<[string, string]> = [
        ['通用', '一般纳税人'],
        ['批发零售', '一般纳税人'],
        ['建筑安装', '一般纳税人'],
        ['制造业', '一般纳税人'],
        ['通用', '小规模'],
      ]
      const PARAMS: Array<[string, string, string]> = [
        ['预警上限', '%', '20'],
        ['预警下限', '%', '3'],
        ['观察周期', '月', '12'],
      ]
      const all: ThresholdRow[] = []
      RULE_DATA.slice(0, 8).forEach((r, ri) => {
        PARAMS.forEach((p, pi) => {
          const tier = TIERS[(ri + pi) % TIERS.length]
          all.push({
            id: `TH-${r.id}-${pi}`,
            ruleId: r.id,
            ruleName: r.name,
            paramName: p[0],
            industry: tier[0],
            scale: tier[1],
            value: String(Number(p[2]) + (ri % 3) * (pi === 2 ? 0 : 2)),
            unit: p[1],
            updatedAt: `2026-07-${String(10 + ri).padStart(2, '0')}`,
            updatedBy: ['王××', '李××', '张××', '陈××'][ri % 4],
          })
        })
      })
      const kw = query.keyword.trim()
      const filtered = all.filter((t) => {
        if (kw && t.ruleName.indexOf(kw) < 0 && t.paramName.indexOf(kw) < 0 && t.ruleId.toUpperCase().indexOf(kw.toUpperCase()) < 0) return false
        if (query.industry !== 'all' && t.industry !== query.industry) return false
        return true
      })
      const start = (query.page - 1) * query.pageSize
      return delay({
        items: filtered.slice(start, start + query.pageSize),
        total: filtered.length,
        page: query.page,
        pageSize: query.pageSize,
      })
    },

    getEffectMonitor(): Promise<EffectMonitor> {
      const CAT_CN: Record<string, string> = {
        invoice: '发票类', income: '收入类', cost: '成本费用类', burden: '税负类',
        benefit: '优惠类', register: '登记类', declare: '申报类', related: '关联交易类',
        fund: '资金类', other: '其他类',
      }
      const factors = [0.62, 0.71, 0.68, 0.83, 0.92, 1]
      // 结论:查实率 ≥50 有效 / ≥30 待优化 / 其余建议下线(停用与草稿规则不参与)
      const rules = RULE_DATA.filter((r) => r.status === 'enabled' || r.status === 'testing').map((r) => ({
        id: r.id,
        name: r.name,
        category: CAT_CN[r.categoryCode.split('.')[0]] || r.categoryCode,
        monthHit: r.monthHit,
        hitRate: r.hitRate,
        falseRate: +(100 - r.hitRate).toFixed(1),
        mom: r.hitRate >= 50 ? '+8.4%' : r.hitRate >= 35 ? '-3.2%' : '-12.6%',
        spark: factors.map((f) => Math.round(r.monthHit * f)),
        verdict: (r.hitRate >= 50 ? 'effective' : r.hitRate >= 30 ? 'tuning' : 'retire') as EffectMonitor['rules'][number]['verdict'],
      }))
      const byCat: Record<string, number> = {}
      rules.forEach((r) => {
        byCat[r.category] = (byCat[r.category] || 0) + r.monthHit
      })
      const categoryDist = Object.keys(byCat)
        .map((name) => ({ name, value: byCat[name] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6)
      const totalHit = rules.reduce((s, r) => s + r.monthHit, 0)
      const avgRate = rules.length ? rules.reduce((s, r) => s + r.hitRate, 0) / rules.length : 0
      return delay({
        kpis: [
          { label: '在用规则', value: String(rules.length), unit: '条', accent: 'primary' },
          { label: '本月命中', value: totalHit.toLocaleString('en-US'), unit: '条', accent: 'teal' },
          { label: '平均查实率', value: avgRate.toFixed(1), unit: '%', accent: 'green' },
          { label: '建议下线', value: String(rules.filter((r) => r.verdict === 'retire').length), unit: '条', accent: 'red' },
        ],
        trend: [
          { label: '2月', value: 780 },
          { label: '3月', value: 892 },
          { label: '4月', value: 856 },
          { label: '5月', value: 1042 },
          { label: '6月', value: 1156 },
          { label: '7月', value: 1248 },
        ],
        categoryDist,
        rules,
        suggestions: [
          { title: '误报率持续偏高,建议收紧阈值', ruleName: '登记信息与工商不一致', note: '近 3 个月误报率均高于 78%,建议将比对容差由 5% 收紧至 2%,或增加"变更 30 日内不预警"的排除条件', level: 'high' },
          { title: '命中量骤降,疑似规则失效', ruleName: '申报表勾稽关系异常', note: '环比下降 12.6%,同期申报量无明显变化,建议核查取数口径是否随申报表改版失效', level: 'mid' },
          { title: '查实率优秀,建议扩大适用范围', ruleName: '走逃失联疑似企业', note: '查实率 63.4% 居全库首位,建议由重点行业扩展至全行业适用', level: 'low' },
        ],
      })
    },
  },

  /* ==================== 风险管理 ==================== */
  riskmgmt: {
    getDispatchFilters(): Promise<DispatchFilters> {
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
        riskLevels: [
          { value: 'all', label: '全部等级' },
          { value: 'high', label: '高风险' },
          { value: 'mid', label: '中风险' },
          { value: 'low', label: '低风险' },
        ],
        assignees: [
          { value: 'auto', label: '按负荷自动分配' },
          { value: 'wang', label: '王×× · 城东分局' },
          { value: 'li', label: '李×× · 高新区分局' },
          { value: 'zhang', label: '张×× · 城西分局' },
          { value: 'chen', label: '陈×× · 经开区分局' },
          { value: 'zhao', label: '赵×× · 城南分局' },
        ],
      })
    },

    getDispatchBoard(): Promise<DispatchBoard> {
      const pending = CLUE_DATA.filter((c) => c.status === 'pending').length
      return delay({
        kpis: [
          { label: '待派发线索', value: String(pending), unit: '条', accent: 'red' },
          { label: '本月已派发', value: '486', unit: '条', accent: 'primary' },
          { label: '平均派发时长', value: '4.2', unit: '小时', accent: 'teal' },
          { label: '人员平均负荷', value: '68.4', unit: '%', accent: 'gold' },
        ],
        workloads: [
          { name: '王××', dept: '城东分局', processing: 18, done: 42, capacity: 25, loadRate: 72 },
          { name: '李××', dept: '高新区分局', processing: 22, done: 38, capacity: 25, loadRate: 88 },
          { name: '张××', dept: '城西分局', processing: 12, done: 31, capacity: 25, loadRate: 48 },
          { name: '陈××', dept: '经开区分局', processing: 16, done: 29, capacity: 25, loadRate: 64 },
          { name: '赵××', dept: '城南分局', processing: 24, done: 26, capacity: 25, loadRate: 96 },
          { name: '孙××', dept: '城北分局', processing: 9, done: 22, capacity: 25, loadRate: 36 },
        ],
      })
    },

    getDispatchList(query: DispatchQuery): Promise<PagedResult<DispatchRow>> {
      const DISTRICT_CN: Record<string, string> = {
        chengdong: '城东区', gaoxin: '高新区', linjiang: '临江县',
        chengxi: '城西区', yunling: '云岭县', jiangbei: '江北新区',
      }
      const CAT_CN: Record<string, string> = {
        invoice: '发票类', income: '收入类', register: '登记类', benefit: '优惠类',
      }
      const SUGGEST = ['王×× · 城东分局', '李×× · 高新区分局', '张×× · 城西分局', '陈×× · 经开区分局', '孙×× · 城北分局']
      const kw = query.keyword.trim()
      // 仅「待派发」线索进入派发池
      const pool = CLUE_DATA.filter((c) => c.status === 'pending')
      const filtered = pool.filter((c) => {
        if (kw && c.taxpayerName.indexOf(kw) < 0 && c.id.indexOf(kw) < 0) return false
        if (query.districtCode !== 'all' && c.districtCode !== query.districtCode) return false
        if (query.riskLevel !== 'all' && c.riskLevel !== query.riskLevel) return false
        return true
      })
      const start = (query.page - 1) * query.pageSize
      const items: DispatchRow[] = filtered.slice(start, start + query.pageSize).map((c, i) => ({
        id: c.id,
        taxpayerName: c.taxpayerName,
        riskLevel: c.riskLevel,
        estimatedTax: c.estimatedTax,
        category: CAT_CN[c.categoryCode] || c.categoryCode,
        district: DISTRICT_CN[c.districtCode] || c.districtCode,
        createdDate: c.createdDate,
        suggested: SUGGEST[i % SUGGEST.length],
      }))
      return delay({ items, total: filtered.length, page: query.page, pageSize: query.pageSize })
    },

    getBackfillFilters(): Promise<BackfillFilters> {
      return delay({
        updatedAt: '2026-07-24 08:00',
        statuses: [
          { value: 'all', label: '全部状态', count: 12 },
          { value: 'pending', label: '待回填', count: 5 },
          { value: 'draft', label: '草稿', count: 3 },
          { value: 'submitted', label: '已提交', count: 3 },
          { value: 'returned', label: '被退回', count: 1 },
        ],
        kpis: [
          { label: '待回填任务', value: '5', unit: '项', accent: 'red' },
          { label: '已逾期', value: '2', unit: '项', accent: 'gold' },
          { label: '本月已回填', value: '38', unit: '项', accent: 'primary' },
          { label: '按期回填率', value: '91.2', unit: '%', accent: 'green' },
        ],
      })
    },

    getBackfillList(query: BackfillQuery): Promise<PagedResult<BackfillRow>> {
      const ASSIGNEE = ['王××', '李××', '张××', '陈××', '赵××']
      const STATUS_CYCLE: BackfillStatus[] = ['pending', 'draft', 'submitted', 'pending', 'returned', 'submitted', 'draft', 'pending', 'submitted', 'draft', 'pending', 'pending']
      // 处置中/已退回的线索进入回填队列
      const pool = CLUE_DATA.filter((c) => c.status === 'processing' || c.status === 'returned').slice(0, 12)
      const all: BackfillRow[] = pool.map((c, i) => {
        const daysLeft = [3, 1, -2, 5, -1, 7, 2, 4, 6, 1, 8, 3][i]
        return {
          id: `HT2026-${(2100 + i).toString()}`,
          clueId: c.id,
          taxpayerName: c.taxpayerName,
          riskLevel: c.riskLevel,
          assignee: ASSIGNEE[i % ASSIGNEE.length],
          dueDate: `2026-07-${String(24 + (daysLeft > 0 ? daysLeft : 0)).padStart(2, '0')}`,
          daysLeft,
          status: STATUS_CYCLE[i],
        }
      })
      const kw = query.keyword.trim()
      const filtered = all.filter((r) => {
        if (kw && r.taxpayerName.indexOf(kw) < 0 && r.id.indexOf(kw) < 0 && r.clueId.indexOf(kw) < 0) return false
        if (query.status !== 'all' && r.status !== query.status) return false
        return true
      })
      const start = (query.page - 1) * query.pageSize
      return delay({
        items: filtered.slice(start, start + query.pageSize),
        total: filtered.length,
        page: query.page,
        pageSize: query.pageSize,
      })
    },

    getPerformanceStats(): Promise<PerformanceStats> {
      return delay({
        kpis: [
          { label: '本年办结任务', value: '6,542', unit: '项', accent: 'primary' },
          { label: '查实率', value: '74.5', unit: '%', accent: 'teal' },
          { label: '入库税款', value: '3.42', unit: '亿元', accent: 'green' },
          { label: '户均处置时长', value: '8.6', unit: '天', accent: 'gold' },
        ],
        trend: [
          { label: '2月', value: 386 },
          { label: '3月', value: 452 },
          { label: '4月', value: 498 },
          { label: '5月', value: 476 },
          { label: '6月', value: 542 },
          { label: '7月', value: 586 },
        ],
        deptRank: [
          { name: '城东分局', value: 7840 },
          { name: '高新区分局', value: 6920 },
          { name: '城西分局', value: 5480 },
          { name: '经开区分局', value: 4360 },
          { name: '城南分局', value: 3210 },
          { name: '城北分局', value: 2870 },
        ],
        durationDist: [
          { name: '3 天内', value: 1240 },
          { name: '3–7 天', value: 2180 },
          { name: '7–15 天', value: 1860 },
          { name: '15–30 天', value: 940 },
          { name: '30 天以上', value: 322 },
        ],
        persons: [
          { name: '王××', dept: '城东分局', assigned: 186, completed: 172, rate: 78.2, tax: 1840, avgDays: 7.4, mom: '+12.6%' },
          { name: '李××', dept: '高新区分局', assigned: 172, completed: 164, rate: 81.5, tax: 1720, avgDays: 6.8, mom: '+18.3%' },
          { name: '张××', dept: '城西分局', assigned: 145, completed: 132, rate: 72.8, tax: 1280, avgDays: 9.2, mom: '+6.4%' },
          { name: '陈××', dept: '经开区分局', assigned: 138, completed: 126, rate: 74.1, tax: 1160, avgDays: 8.6, mom: '+9.1%' },
          { name: '赵××', dept: '城南分局', assigned: 124, completed: 108, rate: 69.4, tax: 920, avgDays: 10.4, mom: '-2.8%' },
          { name: '孙××', dept: '城北分局', assigned: 96, completed: 86, rate: 66.2, tax: 780, avgDays: 11.2, mom: '+4.2%' },
          { name: '周××', dept: '临港分局', assigned: 84, completed: 78, rate: 71.8, tax: 690, avgDays: 9.8, mom: '+15.7%' },
          { name: '吴××', dept: '江北分局', assigned: 72, completed: 62, rate: 63.5, tax: 540, avgDays: 12.6, mom: '-5.1%' },
        ],
      })
    },
  },

  /* ==================== 数据治理 ==================== */
  datagov: {
    getDataSourceMonitor(): Promise<DataSourceMonitor> {
      return delay({
        kpis: [
          { label: '接入数据源', value: '32', unit: '个', accent: 'primary' },
          { label: '运行正常', value: '27', unit: '个', accent: 'green' },
          { label: '异常数据源', value: '5', unit: '个', accent: 'red' },
          { label: '今日接入量', value: '486.2', unit: '万条', accent: 'teal' },
        ],
        trend: [
          { label: '7-18', value: 412.6 },
          { label: '7-19', value: 438.2 },
          { label: '7-20', value: 396.4 },
          { label: '7-21', value: 452.8 },
          { label: '7-22', value: 468.1 },
          { label: '7-23', value: 471.5 },
          { label: '7-24', value: 486.2 },
        ],
        rows: [
          { id: 'DS-001', name: '增值税发票全量数据', dept: '税务内部', category: '发票类', status: 'normal', frequency: '实时', lastArrival: '2026-07-24 07:58', arrivalRate: 99.8, delayHours: 0, todayRecords: 1284600 },
          { id: 'DS-002', name: '市场监管登记信息', dept: '市场监管局', category: '登记类', status: 'normal', frequency: '日', lastArrival: '2026-07-24 06:00', arrivalRate: 99.2, delayHours: 0, todayRecords: 18420 },
          { id: 'DS-003', name: '社保参保缴费数据', dept: '人社局', category: '人员类', status: 'normal', frequency: '月', lastArrival: '2026-07-20 02:00', arrivalRate: 98.6, delayHours: 0, todayRecords: 0 },
          { id: 'DS-004', name: '不动产登记过户', dept: '自然资源局', category: '资产类', status: 'delayed', frequency: '日', lastArrival: '2026-07-23 06:00', arrivalRate: 92.4, delayHours: 26, todayRecords: 0 },
          { id: 'DS-005', name: '供电用电量数据', dept: '供电公司', category: '能耗类', status: 'normal', frequency: '月', lastArrival: '2026-07-15 03:00', arrivalRate: 97.8, delayHours: 0, todayRecords: 0 },
          { id: 'DS-006', name: '银行大额资金流水', dept: '人民银行', category: '资金类', status: 'interrupted', frequency: '日', lastArrival: '2026-07-21 06:00', arrivalRate: 68.2, delayHours: 74, todayRecords: 0 },
          { id: 'DS-007', name: '公共资源交易中标', dept: '公共资源交易中心', category: '交易类', status: 'normal', frequency: '日', lastArrival: '2026-07-24 06:00', arrivalRate: 96.4, delayHours: 0, todayRecords: 342 },
          { id: 'DS-008', name: '住建施工许可', dept: '住建局', category: '资质类', status: 'delayed', frequency: '周', lastArrival: '2026-07-16 04:00', arrivalRate: 88.6, delayHours: 48, todayRecords: 0 },
          { id: 'DS-009', name: '海关进出口报关', dept: '海关', category: '贸易类', status: 'normal', frequency: '日', lastArrival: '2026-07-24 05:30', arrivalRate: 98.1, delayHours: 0, todayRecords: 2860 },
          { id: 'DS-010', name: '互联网平台经营数据', dept: '第三方平台', category: '平台类', status: 'offline', frequency: '月', lastArrival: '—', arrivalRate: 0, delayHours: 0, todayRecords: 0 },
          { id: 'DS-011', name: '车辆登记与过户', dept: '公安交管', category: '资产类', status: 'normal', frequency: '日', lastArrival: '2026-07-24 06:00', arrivalRate: 97.2, delayHours: 0, todayRecords: 1240 },
          { id: 'DS-012', name: '水务用水量数据', dept: '水务集团', category: '能耗类', status: 'delayed', frequency: '月', lastArrival: '2026-07-12 03:00', arrivalRate: 90.8, delayHours: 72, todayRecords: 0 },
        ],
        alerts: [
          { title: '银行大额资金流水接入中断', desc: '已连续 3 个批次未到达,最近成功批次 2026-07-21;接口返回鉴权失败', level: 'high', time: '2026-07-24 06:05' },
          { title: '不动产登记过户批次延迟', desc: '延迟 26 小时,超出约定时效(24 小时)', level: 'mid', time: '2026-07-24 06:02' },
          { title: '互联网平台经营数据未接入', desc: '协议签署中,预计 8 月完成对接', level: 'low', time: '2026-07-22 09:00' },
        ],
      })
    },

    getQualityDashboard(): Promise<QualityDashboard> {
      return delay({
        overallScore: 86,
        scoreNote: '综合质量良好;资金类与资产类数据的及时性拖累整体得分,建议督办对应部门',
        dimensions: [
          { name: '完整性', score: 92, weight: 25, issues: 148 },
          { name: '准确性', score: 88, weight: 25, issues: 216 },
          { name: '一致性', score: 84, weight: 20, issues: 312 },
          { name: '及时性', score: 76, weight: 20, issues: 486 },
          { name: '唯一性', score: 94, weight: 10, issues: 92 },
        ],
        trend: [
          { label: '2月', value: 79 },
          { label: '3月', value: 81 },
          { label: '4月', value: 80 },
          { label: '5月', value: 83 },
          { label: '6月', value: 85 },
          { label: '7月', value: 86 },
        ],
        sourceScores: [
          { name: '发票全量数据', value: 96 },
          { name: '市场监管登记', value: 93 },
          { name: '社保参保数据', value: 90 },
          { name: '海关报关数据', value: 88 },
          { name: '供电用电量', value: 84 },
          { name: '不动产登记', value: 78 },
          { name: '银行资金流水', value: 71 },
          { name: '住建施工许可', value: 68 },
        ],
        issues: [
          { id: 'DQ-2026-1842', source: '不动产登记', table: 'ODS_REALESTATE_TRANS', rule: '过户日期不得晚于当前日期', level: 'high', count: 1246, foundAt: '2026-07-24 06:20' },
          { id: 'DQ-2026-1841', source: '银行资金流水', table: 'ODS_BANK_FLOW', rule: '交易对手方名称非空', level: 'high', count: 986, foundAt: '2026-07-24 06:20' },
          { id: 'DQ-2026-1839', source: '住建施工许可', table: 'ODS_CONSTRUCT_PERMIT', rule: '合同金额需与备案金额一致', level: 'mid', count: 642, foundAt: '2026-07-24 06:18' },
          { id: 'DQ-2026-1837', source: '市场监管登记', table: 'ODS_MARKET_REG', rule: '统一社会信用代码校验位正确', level: 'mid', count: 318, foundAt: '2026-07-24 06:15' },
          { id: 'DQ-2026-1835', source: '社保参保数据', table: 'ODS_SOCIAL_INSURE', rule: '参保人数不得为负', level: 'low', count: 86, foundAt: '2026-07-24 06:12' },
          { id: 'DQ-2026-1833', source: '供电用电量', table: 'ODS_POWER_USAGE', rule: '同一户号同期不得重复', level: 'low', count: 54, foundAt: '2026-07-24 06:10' },
        ],
      })
    },

    getEntityMatchFilters(): Promise<EntityMatchFilters> {
      const countBy = (s: MatchStatus) => ENTITY_DATA.filter((e) => e.status === s).length
      return delay({
        updatedAt: '2026-07-24 08:00',
        statuses: [
          { value: 'all', label: '全部状态', count: ENTITY_DATA.length },
          { value: 'matched', label: '已匹配', count: countBy('matched') },
          { value: 'pending', label: '待确认', count: countBy('pending') },
          { value: 'conflict', label: '存在冲突', count: countBy('conflict') },
          { value: 'rejected', label: '已排除', count: countBy('rejected') },
        ],
      })
    },

    getEntityMatches(query: EntityMatchQuery): Promise<PagedResult<EntityMatchRow>> {
      const kw = query.keyword.trim()
      const filtered = ENTITY_DATA.filter((e) => {
        if (kw && e.name.indexOf(kw) < 0 && e.taxId.indexOf(kw) < 0 && e.id.indexOf(kw) < 0) return false
        if (query.status !== 'all' && e.status !== query.status) return false
        return true
      })
      const start = (query.page - 1) * query.pageSize
      return delay({
        items: filtered.slice(start, start + query.pageSize),
        total: filtered.length,
        page: query.page,
        pageSize: query.pageSize,
      })
    },

    getEntityMatchDetail(id: string): Promise<EntityMatchDetail> {
      const e = ENTITY_DATA.filter((x) => x.id === id)[0] || ENTITY_DATA[0]
      const hasConflict = e.status === 'conflict'
      return delay({
        id: e.id,
        name: e.name,
        taxId: e.taxId,
        status: e.status,
        confidence: e.confidence,
        basis: [
          '统一社会信用代码完全一致(权重 60%)',
          '企业名称标准化后完全一致(权重 25%)',
          '注册地址相似度 92%(权重 10%)',
          '法定代表人姓名一致(权重 5%)',
        ],
        identifiers: [
          { source: '税务登记', idType: '纳税人识别号', idValue: e.taxId, name: e.name, merged: true },
          { source: '市场监管登记', idType: '统一社会信用代码', idValue: e.taxId, name: e.name, merged: true },
          { source: '社保参保数据', idType: '社保登记号', idValue: '3301****8842', name: e.name, merged: true },
          { source: '不动产登记', idType: '权利人证件号', idValue: e.taxId, name: `${e.name}(简称)`, merged: !hasConflict },
          { source: '银行资金流水', idType: '开户许可证号', idValue: 'J33****0217', name: e.name, merged: !hasConflict },
          { source: '公共资源交易', idType: '投标人编号', idValue: 'BID****3391', name: e.name, merged: true },
        ].slice(0, e.identifierCount > 6 ? 6 : e.identifierCount),
        conflicts: hasConflict
          ? [
              { field: '企业名称', masterValue: e.name, sourceValue: `${e.name}(曾用名)`, source: '不动产登记' },
              { field: '注册地址', masterValue: '城西区解放路 XX 号', sourceValue: '城西区解放路 XX 号 3 幢', source: '银行资金流水' },
            ]
          : [],
      })
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

  /* ==================== 决策分析 ==================== */
  decision: {
    getDecisionFilters(): Promise<DecisionFilters> {
      return delay({
        periods: [
          { value: 'month', label: '本月' },
          { value: 'quarter', label: '本季' },
          { value: 'year', label: '本年' },
        ],
        defaultPeriod: 'year',
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

    getRevenueAnalysis(_query: DecisionQuery): Promise<RevenueAnalysis> {
      // 各税种共用的区县下钻分布(与设计稿一致)
      const distShare = [
        { name: '城东区', share: 0.24, yoy: '+7.2%' },
        { name: '高新区', share: 0.21, yoy: '+14.6%' },
        { name: '城西区', share: 0.17, yoy: '+3.1%' },
        { name: '经开区', share: 0.14, yoy: '+5.4%' },
        { name: '其他区县', share: 0.24, yoy: '+1.8%' },
      ]
      const tax: Array<[string, number, number, string]> = [
        ['增值税', 58.2, 31.6, '+9.0%'],
        ['企业所得税', 32.4, 17.9, '+8.6%'],
        ['个人所得税', 14.8, 8.6, '+10.7%'],
        ['契税', 9.6, 4.7, '-10.0%'],
        ['土地增值税', 8.4, 3.9, '-20.1%'],
        ['房产税', 7.2, 4.1, '+5.2%'],
        ['城镇土地使用税', 6.8, 3.8, '+2.4%'],
        ['印花税', 5.4, 3.1, '+6.9%'],
        ['其他税种', 9.8, 5.2, '+4.1%'],
      ]
      return delay({
        progress: {
          periodLabel: '本年度',
          timeProgress: 56.2,
          timeNote: '截至 7 月 24 日',
          revenueProgress: 54.3,
          revenueNote: '入库 82.9 亿 / 预算 152.6 亿',
          laggingNote: '收入进度落后时间进度 1.9 个百分点',
        },
        headStats: [
          { label: '累计入库', value: '82.9', unit: '亿元', note: '年度预算 152.6 亿', tone: 'default' },
          { label: '同比增收', value: '+4.5', unit: '亿元', note: '增幅 +5.8%', tone: 'success' },
          { label: '序时缺口', value: '-2.9', unit: '亿元', note: '较序时进度 -1.9pct', tone: 'danger' },
        ],
        waterfall: [
          { name: '去年同期', kind: 'base', value: 78.4, pct: '' },
          { name: '增值税', kind: 'delta', value: 2.61, pct: '+9.0%' },
          { name: '企业所得税', kind: 'delta', value: 1.42, pct: '+8.6%' },
          { name: '个人所得税', kind: 'delta', value: 0.83, pct: '+10.7%' },
          { name: '契税', kind: 'delta', value: -0.52, pct: '-10.0%' },
          { name: '土地增值税', kind: 'delta', value: -0.98, pct: '-20.1%' },
          { name: '其他税种', kind: 'delta', value: 1.14, pct: '+4.9%' },
          { name: '今年同期', kind: 'base', value: 82.9, pct: '' },
        ],
        levelData: {
          levelNames: ['中央级', '省级', '市级', '县区级'],
          months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月'],
          monthTotals: [10.8, 9.2, 12.4, 11.6, 12.9, 13.2, 12.8],
          shares: [
            [0.39, 0.12, 0.27, 0.22],
            [0.37, 0.13, 0.28, 0.22],
            [0.4, 0.11, 0.27, 0.22],
            [0.38, 0.12, 0.28, 0.22],
            [0.39, 0.12, 0.27, 0.22],
            [0.38, 0.13, 0.27, 0.22],
            [0.37, 0.12, 0.29, 0.22],
          ],
        },
        forecast: {
          months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
          actual: [10.8, 9.2, 12.4, 11.6, 12.9, 13.2, 12.8],
          predicted: [12.1, 12.6, 13.8, 12.9, 14.3],
          bandWidth: [0.6, 0.85, 1.1, 1.3, 1.5],
          yearForecast: '148.6 亿',
          range: '145.2–152.1',
          achieveProb: '37%',
        },
        taxRows: tax.map((t) => ({
          name: t[0],
          budget: t[1],
          actual: t[2],
          yoy: t[3],
          districts: distShare,
        })),
      })
    },

    getTaxSourceAnalysis(_query: DecisionQuery): Promise<TaxSourceAnalysis> {
      return delay({
        headStats: [
          { label: '在册税源', value: '48,214', note: '户', tone: 'default' },
          { label: '本年净增', value: '+1,872', note: '户 · +4.0%', tone: 'success' },
          { label: 'CR10', value: '42.6%', note: '前十户税收占比', tone: 'default' },
          { label: 'HHI 指数', value: '0.087', note: '较上年 +0.006', tone: 'gold' },
          { label: '月均迁出', value: '86', note: '户 · 环比 +38%', tone: 'danger' },
        ],
        paretoTotal: 340000,
        pareto: [
          { name: '某能源集团 *', value: 28640 },
          { name: '某汽车制造 *', value: 21360 },
          { name: '某电子科技 *', value: 16820 },
          { name: '某房地产开发 *', value: 13240 },
          { name: '某商业银行 *', value: 11080 },
          { name: '某烟草公司 *', value: 9640 },
          { name: '某医药控股 *', value: 8120 },
          { name: '某建工集团 *', value: 7260 },
          { name: '某物流股份 *', value: 6180 },
          { name: '某百货零售 *', value: 5430 },
          { name: '某化工材料 *', value: 4820 },
          { name: '某食品饮料 *', value: 4210 },
          { name: '某软件信息 *', value: 3860 },
          { name: '某酒店文旅 *', value: 3420 },
          { name: '某装备制造 *', value: 3110 },
        ],
        concentrationBars: [
          { name: 'CR5(前 5 户)', pct: 26.8, delta: '+1.2pct' },
          { name: 'CR10(前 10 户)', pct: 42.6, delta: '+2.1pct' },
          { name: 'CR50(前 50 户)', pct: 63.4, delta: '+0.8pct' },
        ],
        scaleTiers: [
          { name: '亿元以上', count: 12 },
          { name: '5000万–1亿', count: 31 },
          { name: '1000–5000万', count: 187 },
          { name: '100–1000万', count: 1642 },
          { name: '100万以下', count: 46342 },
        ],
        hhi: '0.087',
        hhiNote: '较上年 +0.006,税源集中度持续上升,重点税源依赖度需关注',
        flow: [
          { month: '1月', add: 412, moveIn: 38, cancel: 186, moveOut: 42 },
          { month: '2月', add: 268, moveIn: 24, cancel: 142, moveOut: 35 },
          { month: '3月', add: 486, moveIn: 45, cancel: 210, moveOut: 51 },
          { month: '4月', add: 441, moveIn: 41, cancel: 198, moveOut: 58 },
          { month: '5月', add: 463, moveIn: 36, cancel: 224, moveOut: 64 },
          { month: '6月', add: 428, moveIn: 32, cancel: 246, moveOut: 96 },
          { month: '7月', add: 389, moveIn: 29, cancel: 238, moveOut: 118 },
        ],
        flowNote: '柱上数字为当月净变动;6 月起迁出户数环比上升 38%,其中 62% 迁往周边低税负园区,建议关注',
        quarters: ['24Q4', '25Q1', '25Q2', '25Q3', '25Q4', '26Q1', '26Q2', '26Q3E'],
        industries: [
          { name: '制造业', values: [24.6, 24.8, 25.1, 25.6, 25.9, 26.2, 26.8, 27.1] },
          { name: '建筑房地产', values: [26.4, 25.6, 24.8, 23.9, 22.8, 21.9, 20.8, 20.1] },
          { name: '批发零售', values: [19.8, 19.6, 19.4, 19.2, 19.0, 18.8, 18.6, 18.4] },
          { name: '现代服务业', values: [14.2, 15.1, 15.9, 16.7, 17.5, 18.3, 19.1, 19.8] },
          { name: '其他行业', values: [15.0, 14.9, 14.8, 14.6, 14.8, 14.8, 14.7, 14.6] },
        ],
        industryNote: '现代服务业占比由 14.2% 升至 19.8%;建筑房地产由 26.4% 降至 20.1%',
        bubbles: [
          { name: '城东区', households: 9840, avgTax: 18.2, totalTax: 17.9 },
          { name: '高新区', households: 5620, avgTax: 26.4, totalTax: 14.8 },
          { name: '城西区', households: 7410, avgTax: 14.6, totalTax: 10.8 },
          { name: '经开区', households: 4280, avgTax: 21.5, totalTax: 9.2 },
          { name: '城南区', households: 6120, avgTax: 10.4, totalTax: 6.4 },
          { name: '城北区', households: 5480, avgTax: 9.8, totalTax: 5.4 },
          { name: '临港新区', households: 2360, avgTax: 19.6, totalTax: 4.6 },
          { name: '江北区', households: 3140, avgTax: 8.2, totalTax: 2.6 },
          { name: '湖滨区', households: 2210, avgTax: 9.1, totalTax: 2.0 },
          { name: '老城区', households: 1750, avgTax: 7.4, totalTax: 1.3 },
        ],
      })
    },

    getEffectivenessAnalysis(_query: DecisionQuery): Promise<EffectivenessAnalysis> {
      const kv = (k: string, v: string) => ({ key: k, value: v, numeric: true })
      return delay({
        headline: '整体入库转化 8.7%,累计增收 3.42 亿元',
        stages: [
          {
            name: '规则命中', count: 48672, unit: '条', sub: '214 条规则 · 9 个模型', days: '实时',
            tips: [kv('本月新增', '6,214 条'), kv('去重合并后', '12,094 条'), kv('命中规则数', '187 / 214 条')],
            connector: { rate: '转化 19.1%', loss: '39,354', note: '排除 / 合并' },
          },
          {
            name: '有效线索', count: 9318, unit: '条', sub: '经初筛与人工确认', days: '1.2 天',
            tips: [kv('高风险', '2,431 条'), kv('中风险', '4,562 条'), kv('低风险', '2,325 条')],
            connector: { rate: '转化 70.2%', loss: '2,776', note: '待核查 / 超期' },
          },
          {
            name: '已核查', count: 6542, unit: '户', sub: '实地 + 案头核查', days: '8.6 天',
            tips: [kv('实地核查', '2,187 户'), kv('案头核查', '4,355 户'), kv('在办未结', '1,204 户')],
            connector: { rate: '查实 74.5%', loss: '1,669', note: '核查无问题' },
          },
          {
            name: '已定性', count: 4873, unit: '户', sub: '查实存在涉税问题', days: '3.4 天',
            tips: [kv('补缴申报', '3,912 户'), kv('行政处罚', '645 户'), kv('移送稽查', '316 户')],
            connector: { rate: '入库 86.5%', loss: '658', note: '争议 / 分期在途' },
          },
          {
            name: '税款入库', count: 4215, unit: '户', sub: '累计入库 3.42 亿元', days: '5.1 天',
            tips: [kv('查补税款', '2.86 亿元'), kv('滞纳金罚款', '0.56 亿元'), kv('户均入库', '8.11 万元')],
            connector: null,
          },
        ],
        drills: [
          {
            note: '口径:本年度累计命中(去重前)',
            columns: [
              { title: '按数据源', rows: [{ name: '发票数据', value: 18420 }, { name: '电力能耗', value: 9860 }, { name: '不动产登记', value: 7420 }, { name: '银行大额流水', value: 5210 }] },
              { title: '按区县', rows: [{ name: '城东区', value: 9840 }, { name: '高新区', value: 8620 }, { name: '城西区', value: 7410 }, { name: '经开区', value: 6280 }] },
              { title: '按命中规则 TOP4', rows: [{ name: '进销项背离', value: 6240 }, { name: '电力税收弹性异常', value: 4180 }, { name: '房土两税漏征', value: 3560 }, { name: '虚开发票特征', value: 2870 }] },
            ],
          },
          {
            note: '口径:初筛 + 人工确认后的有效线索',
            columns: [
              { title: '按数据源', rows: [{ name: '发票数据', value: 3120 }, { name: '电力能耗', value: 2140 }, { name: '不动产登记', value: 1680 }, { name: '银行大额流水', value: 1240 }] },
              { title: '按区县', rows: [{ name: '城东区', value: 1860 }, { name: '高新区', value: 1720 }, { name: '城西区', value: 1450 }, { name: '经开区', value: 1180 }] },
              { title: '按风险等级', rows: [{ name: '高风险', value: 2431 }, { name: '中风险', value: 4562 }, { name: '低风险', value: 2325 }, { name: '待复核', value: 0 }] },
            ],
          },
          {
            note: '口径:已完成核查程序的户数',
            columns: [
              { title: '按核查方式', rows: [{ name: '案头核查', value: 4355 }, { name: '实地核查', value: 2187 }, { name: '约谈自查', value: 1420 }, { name: '联合检查', value: 380 }] },
              { title: '按区县', rows: [{ name: '城东区', value: 1320 }, { name: '高新区', value: 1180 }, { name: '城西区', value: 1040 }, { name: '经开区', value: 860 }] },
              { title: '按行业', rows: [{ name: '批发零售', value: 1980 }, { name: '建筑房地产', value: 1560 }, { name: '制造业', value: 1240 }, { name: '现代服务', value: 920 }] },
            ],
          },
          {
            note: '口径:查实存在涉税问题并已定性',
            columns: [
              { title: '按定性类型', rows: [{ name: '补缴申报', value: 3912 }, { name: '行政处罚', value: 645 }, { name: '移送稽查', value: 316 }, { name: '其他', value: 0 }] },
              { title: '按区县', rows: [{ name: '城东区', value: 1020 }, { name: '高新区', value: 890 }, { name: '城西区', value: 760 }, { name: '经开区', value: 640 }] },
              { title: '按行业', rows: [{ name: '批发零售', value: 1510 }, { name: '建筑房地产', value: 1230 }, { name: '制造业', value: 940 }, { name: '现代服务', value: 680 }] },
            ],
          },
          {
            note: '口径:税款(含滞纳金罚款)实际入库',
            columns: [
              { title: '按税种(万元)', rows: [{ name: '增值税', value: 13860 }, { name: '企业所得税', value: 9420 }, { name: '个人所得税', value: 4210 }, { name: '土地增值税', value: 3350 }] },
              { title: '按区县(万元)', rows: [{ name: '城东区', value: 7840 }, { name: '高新区', value: 6920 }, { name: '城西区', value: 5480 }, { name: '经开区', value: 4360 }] },
              { title: '按入库方式', rows: [{ name: '自行补缴', value: 2870 }, { name: '责令追缴', value: 984 }, { name: '强制执行', value: 245 }, { name: '分期入库', value: 116 }] },
            ],
          },
        ],
        sources: [
          { name: '发票全量数据', value: 6420, clues: 3120, rate: 76.4 },
          { name: '电力能耗数据', value: 4860, clues: 2140, rate: 71.2 },
          { name: '不动产登记', value: 3150, clues: 1680, rate: 68.9 },
          { name: '银行大额流水', value: 2740, clues: 1240, rate: 74.8 },
          { name: '社保参保数据', value: 1980, clues: 860, rate: 61.5 },
          { name: '互联网平台经营', value: 1560, clues: 720, rate: 58.3 },
        ],
        sourceNote: '共接入 9 类部门数据 · 覆盖 23 个成员单位',
        sourceTotal: '合计 20,710 万元',
        ruleLegend: '规则引擎(214 条在用)',
        modelLegend: '智能模型(9 个在用)',
        compareTabs: [
          {
            name: '查实率对比', unit: '%', summary: '模型平均查实率高 9.4 个百分点',
            categories: ['增值税', '企业所得税', '个人所得税', '土地增值税', '房产税'],
            rule: [68, 62, 55, 71, 64], model: [79, 74, 70, 66, 72],
          },
          {
            name: '入库贡献', unit: '万元', summary: '规则引擎贡献占比 58.2%',
            categories: ['增值税', '企业所得税', '个人所得税', '土地增值税', '房产税'],
            rule: [5210, 3860, 1240, 980, 760], model: [3120, 2540, 1890, 640, 540],
          },
          {
            name: '耗时对比', unit: '天', summary: '模型线索平均结案快 3.3 天',
            categories: ['增值税', '企业所得税', '个人所得税', '土地增值税', '房产税'],
            rule: [9.8, 11.2, 8.4, 12.6, 10.1], model: [6.2, 7.4, 5.8, 9.1, 7.0],
          },
        ],
        bureaus: [
          { name: '城东分局', clues: 1860, checked: 1320, rate: 78.2, tax: 7840, days: 10.4, mom: '+12.6%' },
          { name: '高新区分局', clues: 1720, checked: 1180, rate: 81.5, tax: 6920, days: 9.2, mom: '+18.3%' },
          { name: '城西分局', clues: 1450, checked: 1040, rate: 72.8, tax: 5480, days: 11.6, mom: '+6.4%' },
          { name: '经开区分局', clues: 1180, checked: 860, rate: 74.1, tax: 4360, days: 10.8, mom: '+9.1%' },
          { name: '城南分局', clues: 940, checked: 690, rate: 69.4, tax: 3210, days: 12.3, mom: '-2.8%' },
          { name: '城北分局', clues: 860, checked: 610, rate: 66.2, tax: 2870, days: 13.1, mom: '+4.2%' },
          { name: '临港分局', clues: 620, checked: 450, rate: 71.8, tax: 2340, days: 11.9, mom: '+15.7%' },
          { name: '江北分局', clues: 540, checked: 390, rate: 63.5, tax: 1860, days: 14.2, mom: '-5.1%' },
          { name: '湖滨分局', clues: 480, checked: 340, rate: 67.9, tax: 1640, days: 12.8, mom: '+3.6%' },
          { name: '老城分局', clues: 420, checked: 300, rate: 61.2, tax: 1380, days: 15.4, mom: '-1.9%' },
          { name: '铁西分局', clues: 380, checked: 270, rate: 64.8, tax: 1210, days: 13.7, mom: '+7.8%' },
          { name: '直属一分局', clues: 310, checked: 220, rate: 70.3, tax: 980, days: 10.9, mom: '+11.2%' },
        ],
      })
    },

    getTopicAnalysis(_query: DecisionQuery): Promise<TopicAnalysis> {
      return delay({
        tabs: [
          { key: 'realestate', name: '房地产', risk: 46 },
          { key: 'construction', name: '建筑安装', risk: 23 },
          { key: 'platform', name: '平台经济', risk: 31 },
        ],
        scopeNote: '专题口径由税政部门维护 · 每月 5 日更新',
        realEstate: {
          headline: '专题税收合计 21.4 亿元 · 占全市 25.8%',
          stages: [
            {
              name: '拿地', amount: '3.2', taxes: ['契税', '耕地占用税', '印花税'], riskCount: 4,
              taxRows: [
                { name: '契税', due: 26400, paid: 25100 },
                { name: '耕地占用税', due: 4800, paid: 4620 },
                { name: '印花税', due: 920, paid: 905 },
              ],
              risks: [
                { level: 'mid', title: '土地成交价与契税计税依据不符', note: '成交公示价高于申报计税价 5% 以上', count: 3 },
                { level: 'low', title: '耕地占用税逾期申报', note: '取得用地批文超 30 日未申报', count: 1 },
              ],
            },
            {
              name: '开发建设', amount: '2.8', taxes: ['增值税预缴', '城建税', '印花税'], riskCount: 7,
              taxRows: [
                { name: '增值税(预缴)', due: 18600, paid: 16800 },
                { name: '城市维护建设税', due: 2230, paid: 2020 },
                { name: '建安合同印花税', due: 1480, paid: 1390 },
              ],
              risks: [
                { level: 'high', title: '建安发票与工程进度背离', note: '形象进度 70%,取得建安发票仅 41%', count: 4 },
                { level: 'mid', title: '甲供材未按规定计税', note: '甲供工程计税方式选择异常', count: 3 },
              ],
            },
            {
              name: '预售', amount: '6.4', taxes: ['增值税预缴', '土增税预征', '企所税预计'], riskCount: 15,
              taxRows: [
                { name: '增值税(预缴 3%)', due: 31200, paid: 28400 },
                { name: '土地增值税(预征)', due: 18700, paid: 15300 },
                { name: '企业所得税(预计毛利)', due: 14100, paid: 12600 },
              ],
              risks: [
                { level: 'high', title: '预收款未足额预缴增值税', note: '按揭到账与申报预收款差异超 10%', count: 7 },
                { level: 'high', title: '土增税预征率适用错误', note: '普通住宅与非普通住宅混用预征率', count: 5 },
                { level: 'mid', title: '诚意金/更名费未并入预收', note: 'POS 流水存在账外收款特征', count: 3 },
              ],
            },
            {
              name: '现房销售', amount: '4.1', taxes: ['增值税', '土增税清算', '企所税'], riskCount: 12,
              taxRows: [
                { name: '增值税', due: 22800, paid: 21500 },
                { name: '土地增值税(清算)', due: 16400, paid: 12100 },
                { name: '企业所得税', due: 9800, paid: 9200 },
              ],
              risks: [
                { level: 'high', title: '达到清算条件未申请清算', note: '销售比例超 85% 满 1 年,共 8 个项目', count: 8 },
                { level: 'mid', title: '车位/储藏室收入未计税', note: '不动产登记与申报面积差异', count: 4 },
              ],
            },
            {
              name: '持有', amount: '1.9', taxes: ['房产税', '城镇土地使用税'], riskCount: 5,
              taxRows: [
                { name: '房产税(自持)', due: 12400, paid: 11200 },
                { name: '城镇土地使用税', due: 6600, paid: 6400 },
              ],
              risks: [{ level: 'mid', title: '自持商业未申报房产税', note: '电力数据显示营业但零申报', count: 5 }],
            },
            {
              name: '转让', amount: '3.0', taxes: ['增值税', '个税', '契税', '土增税'], riskCount: 3,
              taxRows: [
                { name: '增值税(二手交易)', due: 13100, paid: 12800 },
                { name: '个人所得税', due: 8200, paid: 7900 },
                { name: '契税(受让方)', due: 8700, paid: 8600 },
              ],
              risks: [{ level: 'mid', title: '阴阳合同低报成交价', note: '网签价明显低于同小区均价', count: 3 }],
            },
          ],
          projects: [
            { name: '滨江壹号院', developer: '某房地产开发 *', stage: '现房销售', sale: '18.6', progress: 88, tax: '32,400', risk: 'high' },
            { name: '云湖上城', developer: '某置业集团 *', stage: '预售', sale: '12.3', progress: 30, tax: '18,700', risk: 'high' },
            { name: '学府雅苑', developer: '某城建投资 *', stage: '现房销售', sale: '9.8', progress: 62, tax: '15,200', risk: 'mid' },
            { name: '科创天地(商办)', developer: '某产业发展 *', stage: '持有', sale: '4.2', progress: 15, tax: '6,800', risk: 'mid' },
            { name: '锦绣家园三期', developer: '某房地产开发 *', stage: '预售', sale: '7.6', progress: 10, tax: '9,300', risk: 'low' },
          ],
        },
        construction: {
          riskInvoiceOver: 55,
          riskPrepayUnder: 1.5,
          projects: [
            { name: '市政快速路三标', corp: '某建工集团 *', district: '城东区', amount: 4.8, invoiceProgress: 72, prepayRate: 1.1 },
            { name: '数据中心机电安装', corp: '某机电安装 *', district: '高新区', amount: 2.6, invoiceProgress: 81, prepayRate: 0.8 },
            { name: '老旧小区改造二期', corp: '某建设发展 *', district: '老城区', amount: 1.9, invoiceProgress: 64, prepayRate: 2.1 },
            { name: '产业园厂房总包', corp: '某建筑股份 *', district: '经开区', amount: 5.4, invoiceProgress: 58, prepayRate: 2.2 },
            { name: '轨交附属工程', corp: '某隧道工程 *', district: '城西区', amount: 6.2, invoiceProgress: 45, prepayRate: 2.4 },
            { name: '医院住院楼', corp: '某建工集团 *', district: '城南区', amount: 3.1, invoiceProgress: 52, prepayRate: 2.3 },
            { name: '水环境治理EPC', corp: '某生态环境 *', district: '临港新区', amount: 4.4, invoiceProgress: 38, prepayRate: 2.5 },
            { name: '学校迁建项目', corp: '某城建投资 *', district: '江北区', amount: 2.2, invoiceProgress: 49, prepayRate: 2.0 },
            { name: '商业综合体幕墙', corp: '某幕墙装饰 *', district: '城东区', amount: 1.6, invoiceProgress: 86, prepayRate: 0.6 },
            { name: '物流园道路工程', corp: '某路桥公司 *', district: '经开区', amount: 1.2, invoiceProgress: 68, prepayRate: 1.7 },
            { name: '棚改安置房四标', corp: '某建筑劳务 *', district: '城北区', amount: 2.8, invoiceProgress: 77, prepayRate: 0.9 },
            { name: '热力管网改造', corp: '某能源建设 *', district: '湖滨区', amount: 1.4, invoiceProgress: 61, prepayRate: 1.9 },
            { name: '科研楼精装修', corp: '某装饰工程 *', district: '高新区', amount: 1.1, invoiceProgress: 90, prepayRate: 0.5 },
            { name: '港区堆场扩建', corp: '某港务工程 *', district: '临港新区', amount: 3.6, invoiceProgress: 74, prepayRate: 1.0 },
          ],
          stats: [
            { label: '在建项目', value: '342', unit: '个', tone: 'default' },
            { label: '跨区域施工项目', value: '87', unit: '个', tone: 'default' },
            { label: '预缴到位率', value: '81.4', unit: '%', tone: 'primary' },
            { label: '风险区项目', value: '23', unit: '个 · 预估欠缴 4,860 万', tone: 'danger' },
          ],
          note: '跨区域项目按 2% 预缴口径监控;外埠施工企业 87 个项目中 23 个预缴率低于阈值,已生成风险线索推送属地分局',
        },
        platform: {
          headline: '监测平台 12 家 · 入驻商户 36,420 户',
          platforms: [
            {
              name: '某同城生活平台 *', type: '本地生活', merchants: 14620, rate: 61.2, riskCount: 2140,
              gapCount: 1846, gapTax: 2130,
              bins: [
                { label: '10万以下', reported: 4820, declared: 3980 },
                { label: '10–50万', reported: 3660, declared: 2610 },
                { label: '50–120万', reported: 2940, declared: 1490 },
                { label: '120–300万', reported: 1780, declared: 860 },
                { label: '300–500万', reported: 980, declared: 620 },
                { label: '500万以上', reported: 440, declared: 380 },
              ],
            },
            {
              name: '某电商平台(区域仓)*', type: '电子商务', merchants: 9840, rate: 72.6, riskCount: 986,
              gapCount: 912, gapTax: 1480,
              bins: [
                { label: '10万以下', reported: 2610, declared: 2260 },
                { label: '10–50万', reported: 2380, declared: 1890 },
                { label: '50–120万', reported: 2140, declared: 1520 },
                { label: '120–300万', reported: 1460, declared: 980 },
                { label: '300–500万', reported: 820, declared: 610 },
                { label: '500万以上', reported: 430, declared: 380 },
              ],
            },
            {
              name: '某货运撮合平台 *', type: '网络货运', merchants: 6420, rate: 54.8, riskCount: 1620,
              gapCount: 1284, gapTax: 1960,
              bins: [
                { label: '10万以下', reported: 1240, declared: 860 },
                { label: '10–50万', reported: 1480, declared: 820 },
                { label: '50–120万', reported: 1520, declared: 760 },
                { label: '120–300万', reported: 1180, declared: 540 },
                { label: '300–500万', reported: 680, declared: 380 },
                { label: '500万以上', reported: 320, declared: 210 },
              ],
            },
            {
              name: '某灵活用工平台 *', type: '灵活用工', merchants: 5540, rate: 83.4, riskCount: 412,
              gapCount: 386, gapTax: 520,
              bins: [
                { label: '10万以下', reported: 2210, declared: 2020 },
                { label: '10–50万', reported: 1480, declared: 1310 },
                { label: '50–120万', reported: 860, declared: 720 },
                { label: '120–300万', reported: 540, declared: 420 },
                { label: '300–500万', reported: 290, declared: 240 },
                { label: '500万以上', reported: 160, declared: 140 },
              ],
            },
          ],
          topMerchants: [
            { name: '某餐饮连锁(11 门店)*', category: '本地生活 · 餐饮', sale: 486, level: 'high' },
            { name: '某建材经营部 *', category: '电商 · 建材家居', sale: 412, level: 'high' },
            { name: '某个体运输车队 *', category: '网络货运', sale: 368, level: 'high' },
            { name: '某服饰直播店 *', category: '电商 · 服饰鞋包', sale: 291, level: 'mid' },
            { name: '某生鲜配送站 *', category: '本地生活 · 生鲜', sale: 246, level: 'mid' },
            { name: '某家政服务号 *', category: '灵活用工', sale: 188, level: 'mid' },
          ],
        },
      })
    },
  },
}

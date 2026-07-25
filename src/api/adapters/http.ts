/* ============================================================
 * HTTP 适配器（VITE_API_MODE=http）
 * 与 mock 适配器签名完全一致;此处对接真实后端。
 * 基地址取自 VITE_API_BASE_URL,默认 /api。
 * 约定后端统一返回 { code, message, data } 包裹,取出 data 交给页面。
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
  DashboardFilters,
  DashboardQuery,
  DecisionFilters,
  DecisionQuery,
  DistrictCompletion,
  EffectivenessAnalysis,
  GraphData,
  RevenueAnalysis,
  TaxSourceAnalysis,
  TopicAnalysis,
  KeyValue,
  KpiCard,
  PagedResult,
  QaSession,
  RevenueTrend,
  RiskTaskFunnel,
  RuleDetail,
  RuleFilters,
  RuleQuery,
  RuleRow,
  SourceContribution,
  TaxTypeStructure,
} from '../types'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

/** 后端统一响应包裹 */
interface ApiEnvelope<T> {
  /** 业务状态码,0 表示成功 */
  code: number
  /** 提示信息 */
  message: string
  /** 数据体 */
  data: T
}

/** 将查询参数序列化为 query string */
function toQuery(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams()
  Object.keys(params).forEach((k) => {
    const v = params[k]
    if (v !== undefined && v !== '') usp.set(k, String(v))
  })
  const s = usp.toString()
  return s ? `?${s}` : ''
}

/** 通用 GET 请求;失败抛出面向业务的错误信息（不暴露堆栈/错误码给界面） */
async function get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  let resp: Response
  try {
    resp = await fetch(`${BASE_URL}${path}${toQuery(params)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
  } catch {
    throw new Error('网络异常,服务暂不可用')
  }
  if (!resp.ok) {
    throw new Error(resp.status === 403 ? '无权限查看该数据' : '数据加载失败')
  }
  const body = (await resp.json()) as ApiEnvelope<T>
  if (body.code !== 0) {
    throw new Error(body.message || '数据加载失败')
  }
  return body.data
}

/** 领导驾驶舱查询参数 → 请求参数 */
function q(query: DashboardQuery): Record<string, string> {
  return { period: query.period, districtCode: query.districtCode }
}

export const httpClient: ApiClient = {
  dashboard: {
    getDashboardFilters(): Promise<DashboardFilters> {
      return get<DashboardFilters>('/dashboard/filters')
    },
    getRevenueKpis(query: DashboardQuery): Promise<KpiCard[]> {
      return get<KpiCard[]>('/dashboard/kpis', q(query))
    },
    getRevenueTrend(query: DashboardQuery): Promise<RevenueTrend> {
      return get<RevenueTrend>('/dashboard/revenue-trend', q(query))
    },
    getTaxTypeStructure(query: DashboardQuery): Promise<TaxTypeStructure> {
      return get<TaxTypeStructure>('/dashboard/tax-type-structure', q(query))
    },
    getDistrictCompletion(query: DashboardQuery): Promise<DistrictCompletion[]> {
      return get<DistrictCompletion[]>('/dashboard/district-completion', q(query))
    },
    getSourceContribution(query: DashboardQuery): Promise<SourceContribution[]> {
      return get<SourceContribution[]>('/dashboard/source-contribution', q(query))
    },
    getRiskTaskFunnel(query: DashboardQuery): Promise<RiskTaskFunnel> {
      return get<RiskTaskFunnel>('/dashboard/risk-task-funnel', q(query))
    },
  },

  clues: {
    getClueFilters(): Promise<ClueFilters> {
      return get<ClueFilters>('/clues/filters')
    },
    getClues(query: ClueQuery): Promise<PagedResult<ClueRow>> {
      return get<PagedResult<ClueRow>>('/clues', {
        keyword: query.keyword,
        districtCode: query.districtCode,
        categoryCode: query.categoryCode,
        taxMin: query.taxMin === null ? undefined : query.taxMin,
        taxMax: query.taxMax === null ? undefined : query.taxMax,
        // 数组条件以逗号分隔传递
        riskLevels: query.riskLevels.join(','),
        statuses: query.statuses.join(','),
        page: query.page,
        pageSize: query.pageSize,
      })
    },
    getClueDetail(id: string): Promise<ClueDetail> {
      return get<ClueDetail>(`/clues/${encodeURIComponent(id)}`)
    },
    getClueDisposalOptions(): Promise<ClueDisposalOptions> {
      return get<ClueDisposalOptions>('/clues/disposal-options')
    },
  },

  archive: {
    getArchiveSummary(taxId: string): Promise<ArchiveSummary> {
      return get<ArchiveSummary>(`/archive/${encodeURIComponent(taxId)}/summary`)
    },
    getArchiveProfile(taxId: string, section: 'base' | 'reg' | 'biz'): Promise<KeyValue[]> {
      return get<KeyValue[]>(`/archive/${encodeURIComponent(taxId)}/profile`, { section })
    },
    getArchiveDeclare(taxId: string): Promise<ArchiveDeclare> {
      return get<ArchiveDeclare>(`/archive/${encodeURIComponent(taxId)}/declare`)
    },
    getArchiveInvoice(taxId: string): Promise<ArchiveInvoice> {
      return get<ArchiveInvoice>(`/archive/${encodeURIComponent(taxId)}/invoice`)
    },
    getArchiveEvaluation(taxId: string): Promise<ArchiveEvaluation> {
      return get<ArchiveEvaluation>(`/archive/${encodeURIComponent(taxId)}/evaluation`)
    },
  },

  rules: {
    getRuleFilters(): Promise<RuleFilters> {
      return get<RuleFilters>('/rules/filters')
    },
    getRules(query: RuleQuery): Promise<PagedResult<RuleRow>> {
      return get<PagedResult<RuleRow>>('/rules', {
        keyword: query.keyword,
        categoryCode: query.categoryCode,
        status: query.status,
        taxType: query.taxType,
        riskLevel: query.riskLevel,
        model: query.model,
        page: query.page,
        pageSize: query.pageSize,
      })
    },
    getRuleDetail(id: string): Promise<RuleDetail> {
      return get<RuleDetail>(`/rules/${encodeURIComponent(id)}`)
    },
  },

  qa: {
    getQaSession(): Promise<QaSession> {
      return get<QaSession>('/qa/session')
    },
  },

  graph: {
    getGraph(rootId: string): Promise<GraphData> {
      return get<GraphData>('/graph', { rootId })
    },
  },

  decision: {
    getDecisionFilters(): Promise<DecisionFilters> {
      return get<DecisionFilters>('/decision/filters')
    },
    getRevenueAnalysis(query: DecisionQuery): Promise<RevenueAnalysis> {
      return get<RevenueAnalysis>('/decision/revenue', { period: query.period, districtCode: query.districtCode })
    },
    getTaxSourceAnalysis(query: DecisionQuery): Promise<TaxSourceAnalysis> {
      return get<TaxSourceAnalysis>('/decision/tax-source', { period: query.period, districtCode: query.districtCode })
    },
    getEffectivenessAnalysis(query: DecisionQuery): Promise<EffectivenessAnalysis> {
      return get<EffectivenessAnalysis>('/decision/effectiveness', { period: query.period, districtCode: query.districtCode })
    },
    getTopicAnalysis(query: DecisionQuery, topic: string): Promise<TopicAnalysis> {
      return get<TopicAnalysis>('/decision/topic', { period: query.period, districtCode: query.districtCode, topic })
    },
  },
}

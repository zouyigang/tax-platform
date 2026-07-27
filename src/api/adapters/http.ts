/* ============================================================
 * HTTP 适配器（VITE_API_MODE=http）
 * 与 mock 适配器签名完全一致;此处对接真实后端。
 * 基地址取自 VITE_API_BASE_URL,默认 /api。
 * 约定后端统一返回 { code, message, data } 包裹,取出 data 交给页面。
 * 禁止被页面组件直接引用,只能经由 src/api/client.ts。
 * ============================================================ */
import type {
  AbnormalChart,
  AbnormalDetail,
  AbnormalFilters,
  AbnormalQuery,
  AbnormalRow,
  ApiClient,
  ArchiveDeclare,
  AuditLogRow,
  AuditOverview,
  AuditQuery,
  BenchmarkAttribution,
  BenchmarkBoard,
  BenchmarkScatter,
  ArchiveEvaluation,
  ArchiveInvoice,
  ArchiveSummary,
  ClueDetail,
  ClueDisposalOptions,
  ClueFilters,
  ClueQuery,
  ClueRow,
  BackfillFilters,
  BackfillQuery,
  BackfillRow,
  DashboardFilters,
  DashboardQuery,
  DataPermConfig,
  DataSourceMonitor,
  DispatchBoard,
  DispatchFilters,
  DispatchQuery,
  DispatchPreview,
  DispatchRow,
  DispatchStrategy,
  DispatchStrategyInput,
  DocGenOptions,
  DocGenQuery,
  DocGenResult,
  DocGenTask,
  DocGenTaxpayer,
  DocMaterialDetail,
  DocMaterialRow,
  DocProcessFilters,
  DocProcessQuery,
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
  ForecastFilters,
  ForecastQuery,
  GangDetail,
  GangFilters,
  GangQuery,
  GangRow,
  QualityDashboard,
  EffectivenessAnalysis,
  GraphData,
  RevenueAnalysis,
  TaxSourceAnalysis,
  TopicAnalysis,
  KeySourceDetail,
  KeySourceFilters,
  KeySourceQuery,
  KeySourceRow,
  KeyTaxpayerBrief,
  KeyValue,
  KpiCard,
  MyTaskRow,
  MyTaskSummary,
  NewEntDetail,
  NewEntFilters,
  NewEntPoint,
  NewEntQuery,
  NewEntRow,
  NlAnswer,
  NlSession,
  PagedResult,
  ParamGroup,
  PermSubject,
  QaSession,
  RolePermMatrix,
  RowRuleCondition,
  RowRuleEstimate,
  SysRole,
  SysUserRow,
  ForecastBoard,
  RevenueTrend,
  RiskTaskFunnel,
  RuleDetail,
  RuleFilters,
  RuleQuery,
  RuleRow,
  ScoreAttribution,
  ScoreFilters,
  ScoreModelState,
  ScoreQuery,
  ScoreRow,
  SourceContribution,
  TaxpayerBrief,
  TaxpayerQuery,
  TaxpayerSearchFilters,
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
    getMyTaskSummary(): Promise<MyTaskSummary> {
      return get<MyTaskSummary>('/clues/my-tasks/summary')
    },
    getMyTasks(status: string): Promise<MyTaskRow[]> {
      return get<MyTaskRow[]>('/clues/my-tasks', { status })
    },
    getCluePendingCount(): Promise<number> {
      return get<number>('/clues/pending-count')
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
    getTaxpayerSearchFilters(): Promise<TaxpayerSearchFilters> {
      return get<TaxpayerSearchFilters>('/taxpayers/filters')
    },
    searchTaxpayers(query: TaxpayerQuery): Promise<PagedResult<TaxpayerBrief>> {
      return get<PagedResult<TaxpayerBrief>>('/taxpayers', {
        keyword: query.keyword,
        industryCode: query.industryCode,
        regStatus: query.regStatus,
        authorityCode: query.authorityCode,
        riskLevel: query.riskLevel,
        qualification: query.qualification,
        page: query.page,
        pageSize: query.pageSize,
      })
    },
    getTaxpayersByIds(ids: string[]): Promise<TaxpayerBrief[]> {
      // 主键以逗号分隔传递,后端需按传入顺序返回
      return get<TaxpayerBrief[]>('/taxpayers/by-ids', { ids: ids.join(',') })
    },
    getMyKeyTaxpayers(): Promise<KeyTaxpayerBrief[]> {
      return get<KeyTaxpayerBrief[]>('/taxpayers/my-key-sources')
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

  system: {
    getPermSubjects(): Promise<PermSubject[]> {
      return get<PermSubject[]>('/system/perm/subjects')
    },
    getDataPermConfig(subjectId: string): Promise<DataPermConfig> {
      return get<DataPermConfig>(`/system/perm/${encodeURIComponent(subjectId)}`)
    },
    estimateRowRules(subjectId: string, rules: RowRuleCondition[]): Promise<RowRuleEstimate> {
      // 规则以紧凑串传递:field:op:v1|v2,多条以分号分隔
      return get<RowRuleEstimate>('/system/perm/estimate', {
        subjectId,
        rules: rules.map((r) => `${r.field}:${r.op}:${r.values.join('|')}`).join(';'),
      })
    },
    getAuditOverview(): Promise<AuditOverview> {
      return get<AuditOverview>('/system/audit/overview')
    },
    getSysRoles(): Promise<SysRole[]> {
      return get<SysRole[]>('/system/roles')
    },
    getSysUsers(roleId: string): Promise<SysUserRow[]> {
      return get<SysUserRow[]>('/system/users', { roleId })
    },
    getRolePermMatrix(roleId: string): Promise<RolePermMatrix> {
      return get<RolePermMatrix>(`/system/roles/${encodeURIComponent(roleId)}/permissions`)
    },
    getSysParamGroups(): Promise<ParamGroup[]> {
      return get<ParamGroup[]>('/system/params')
    },
    getAuditLogs(query: AuditQuery): Promise<PagedResult<AuditLogRow>> {
      return get<PagedResult<AuditLogRow>>('/system/audit/logs', {
        keyword: query.keyword,
        opType: query.opType,
        alertType: query.alertType,
        sensitiveOnly: query.sensitiveOnly ? 1 : 0,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        page: query.page,
        pageSize: query.pageSize,
      })
    },
  },

  app: {
    getDocProcessFilters(): Promise<DocProcessFilters> {
      return get<DocProcessFilters>('/app/doc-process/filters')
    },
    getDocMaterials(query: DocProcessQuery): Promise<DocMaterialRow[]> {
      return get<DocMaterialRow[]>('/app/doc-process/materials', {
        keyword: query.keyword,
        status: query.status,
      })
    },
    getDocMaterialDetail(id: string): Promise<DocMaterialDetail> {
      return get<DocMaterialDetail>(`/app/doc-process/materials/${encodeURIComponent(id)}`)
    },
    getDocGenOptions(): Promise<DocGenOptions> {
      return get<DocGenOptions>('/app/doc-gen/options')
    },
    searchDocGenTaxpayers(keyword: string): Promise<DocGenTaxpayer[]> {
      return get<DocGenTaxpayer[]>('/app/doc-gen/taxpayers', { keyword })
    },
    getDocGenTasks(taxId: string): Promise<DocGenTask[]> {
      return get<DocGenTask[]>('/app/doc-gen/tasks', { taxId })
    },
    getNlSession(): Promise<NlSession> {
      return get<NlSession>('/app/nl-query/session')
    },
    askNlQuery(question: string): Promise<NlAnswer> {
      return get<NlAnswer>('/app/nl-query/ask', { question })
    },
    generateDoc(query: DocGenQuery): Promise<DocGenResult> {
      return get<DocGenResult>('/app/doc-gen/generate', {
        docType: query.docType,
        taxId: query.taxId,
        taskId: query.taskId,
        period: query.period,
        detail: query.detail,
        withTable: query.withTable ? 1 : 0,
        withAdvice: query.withAdvice ? 1 : 0,
      })
    },
  },

  graph: {
    getGraph(rootId: string): Promise<GraphData> {
      return get<GraphData>('/graph', { rootId })
    },
  },

  taxsource: {
    getKeySourceFilters(): Promise<KeySourceFilters> {
      return get<KeySourceFilters>('/tax-source/key/filters')
    },
    getKeySources(query: KeySourceQuery): Promise<PagedResult<KeySourceRow>> {
      return get<PagedResult<KeySourceRow>>('/tax-source/key', {
        keyword: query.keyword,
        tier: query.tier,
        districtCode: query.districtCode,
        alertType: query.alertType,
        sortKey: query.sortKey,
        sortDir: query.sortDir,
        page: query.page,
        pageSize: query.pageSize,
      })
    },
    getKeySourceDetail(taxId: string): Promise<KeySourceDetail> {
      return get<KeySourceDetail>(`/tax-source/key/${encodeURIComponent(taxId)}`)
    },
    getForecastFilters(): Promise<ForecastFilters> {
      return get<ForecastFilters>('/tax-source/forecast/filters')
    },
    getRevenueForecast(query: ForecastQuery): Promise<ForecastBoard> {
      return get<ForecastBoard>('/tax-source/forecast', {
        period: query.period,
        taxType: query.taxType,
        districtCode: query.districtCode,
      })
    },
    getNewEntFilters(): Promise<NewEntFilters> {
      return get<NewEntFilters>('/tax-source/new-enterprise/filters')
    },
    getNewEntScatter(): Promise<NewEntPoint[]> {
      return get<NewEntPoint[]>('/tax-source/new-enterprise/scatter')
    },
    getNewEnts(query: NewEntQuery): Promise<PagedResult<NewEntRow>> {
      return get<PagedResult<NewEntRow>>('/tax-source/new-enterprise', {
        keyword: query.keyword,
        quadrant: query.quadrant,
        industryCode: query.industryCode,
        page: query.page,
        pageSize: query.pageSize,
      })
    },
    getNewEntDetail(taxId: string): Promise<NewEntDetail> {
      return get<NewEntDetail>(`/tax-source/new-enterprise/${encodeURIComponent(taxId)}`)
    },
  },

  model: {
    getScoreModelState(): Promise<ScoreModelState> {
      return get<ScoreModelState>('/model/score/state')
    },
    getScoreFilters(): Promise<ScoreFilters> {
      return get<ScoreFilters>('/model/score/filters')
    },
    getScores(query: ScoreQuery): Promise<PagedResult<ScoreRow>> {
      return get<PagedResult<ScoreRow>>('/model/score', {
        keyword: query.keyword,
        districtCode: query.districtCode,
        industryCode: query.industryCode,
        // 数组条件以逗号分隔传递
        levels: query.levels.join(','),
        scoreMin: query.scoreMin === null ? undefined : query.scoreMin,
        scoreMax: query.scoreMax === null ? undefined : query.scoreMax,
        sortKey: query.sortKey,
        sortDir: query.sortDir,
        page: query.page,
        pageSize: query.pageSize,
      })
    },
    getScoreAttribution(taxId: string): Promise<ScoreAttribution> {
      return get<ScoreAttribution>(`/model/score/${encodeURIComponent(taxId)}/attribution`)
    },
    getGangFilters(): Promise<GangFilters> {
      return get<GangFilters>('/model/gang/filters')
    },
    getGangs(query: GangQuery): Promise<PagedResult<GangRow>> {
      return get<PagedResult<GangRow>>('/model/gang', {
        keyword: query.keyword,
        districtCode: query.districtCode,
        // 数组条件以逗号分隔传递
        patterns: query.patterns.join(','),
        sortKey: query.sortKey,
        sortDir: query.sortDir,
        page: query.page,
        pageSize: query.pageSize,
      })
    },
    getGangDetail(id: string): Promise<GangDetail> {
      return get<GangDetail>(`/model/gang/${encodeURIComponent(id)}`)
    },
    getAbnormalFilters(): Promise<AbnormalFilters> {
      return get<AbnormalFilters>('/model/abnormal/filters')
    },
    getAbnormalChart(industryCode: string): Promise<AbnormalChart> {
      return get<AbnormalChart>('/model/abnormal/chart', { industryCode })
    },
    getAbnormals(query: AbnormalQuery): Promise<PagedResult<AbnormalRow>> {
      return get<PagedResult<AbnormalRow>>('/model/abnormal', {
        keyword: query.keyword,
        industryCode: query.industryCode,
        sortKey: query.sortKey,
        sortDir: query.sortDir,
        page: query.page,
        pageSize: query.pageSize,
      })
    },
    getAbnormalDetail(taxId: string): Promise<AbnormalDetail> {
      return get<AbnormalDetail>(`/model/abnormal/${encodeURIComponent(taxId)}`)
    },
    getBenchmarkBoard(metricKey: string): Promise<BenchmarkBoard> {
      return get<BenchmarkBoard>('/model/benchmark/board', { metricKey })
    },
    getBenchmarkScatter(industryCode: string, metricKey: string): Promise<BenchmarkScatter> {
      return get<BenchmarkScatter>('/model/benchmark/scatter', { industryCode, metricKey })
    },
    getBenchmarkAttribution(industryCode: string, metricKey: string): Promise<BenchmarkAttribution> {
      return get<BenchmarkAttribution>('/model/benchmark/attribution', { industryCode, metricKey })
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
    getTopicAnalysis(query: DecisionQuery): Promise<TopicAnalysis> {
      return get<TopicAnalysis>('/decision/topic', { period: query.period, districtCode: query.districtCode })
    },
  },

  datagov: {
    getDataSourceMonitor(): Promise<DataSourceMonitor> {
      return get<DataSourceMonitor>('/datagov/source-monitor')
    },
    getQualityDashboard(): Promise<QualityDashboard> {
      return get<QualityDashboard>('/datagov/quality')
    },
    getEntityMatchFilters(): Promise<EntityMatchFilters> {
      return get<EntityMatchFilters>('/datagov/entity-match/filters')
    },
    getEntityMatches(query: EntityMatchQuery): Promise<PagedResult<EntityMatchRow>> {
      return get<PagedResult<EntityMatchRow>>('/datagov/entity-match', {
        keyword: query.keyword,
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      })
    },
    getEntityMatchDetail(id: string): Promise<EntityMatchDetail> {
      return get<EntityMatchDetail>(`/datagov/entity-match/${encodeURIComponent(id)}`)
    },
  },

  riskmgmt: {
    getDispatchFilters(): Promise<DispatchFilters> {
      return get<DispatchFilters>('/risk/dispatch/filters')
    },
    getDispatchBoard(): Promise<DispatchBoard> {
      return get<DispatchBoard>('/risk/dispatch/board')
    },
    getDispatchList(query: DispatchQuery): Promise<PagedResult<DispatchRow>> {
      return get<PagedResult<DispatchRow>>('/risk/dispatch', {
        keyword: query.keyword,
        districtCode: query.districtCode,
        riskLevel: query.riskLevel,
        page: query.page,
        pageSize: query.pageSize,
      })
    },
    getDispatchStrategy(): Promise<DispatchStrategy> {
      return get<DispatchStrategy>('/risk/dispatch/strategy')
    },
    previewAutoDispatch(input: DispatchStrategyInput): Promise<DispatchPreview> {
      // 试算入参较复杂,按约定以逗号分隔的紧凑串传递:key:enabled:weight:priority
      return get<DispatchPreview>('/risk/dispatch/preview', {
        rules: input.rules.map((r) => `${r.key}:${r.enabled ? 1 : 0}:${r.weight}:${r.priority}`).join(','),
      })
    },
    getBackfillFilters(): Promise<BackfillFilters> {
      return get<BackfillFilters>('/risk/backfill/filters')
    },
    getBackfillList(query: BackfillQuery): Promise<PagedResult<BackfillRow>> {
      return get<PagedResult<BackfillRow>>('/risk/backfill', {
        keyword: query.keyword,
        status: query.status,
        page: query.page,
        pageSize: query.pageSize,
      })
    },
    getPerformanceStats(): Promise<PerformanceStats> {
      return get<PerformanceStats>('/risk/performance')
    },
  },

  ruleops: {
    getTrialFilters(): Promise<TrialFilters> {
      return get<TrialFilters>('/rules/trial/filters')
    },
    getTrials(status: string): Promise<TrialRow[]> {
      return get<TrialRow[]>('/rules/trial', { status })
    },
    getThresholdFilters(): Promise<ThresholdFilters> {
      return get<ThresholdFilters>('/rules/threshold/filters')
    },
    getThresholds(query: ThresholdQuery): Promise<PagedResult<ThresholdRow>> {
      return get<PagedResult<ThresholdRow>>('/rules/threshold', {
        keyword: query.keyword,
        industry: query.industry,
        page: query.page,
        pageSize: query.pageSize,
      })
    },
    getEffectMonitor(): Promise<EffectMonitor> {
      return get<EffectMonitor>('/rules/effect-monitor')
    },
  },
}

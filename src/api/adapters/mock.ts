/* ============================================================
 * Mock 适配器（VITE_API_MODE=mock）
 * 数据 1:1 取自《领导驾驶舱》设计稿。签名与 http 适配器完全一致。
 * 说明:mock 忽略 query（周期/区县切换返回同一份演示数据）,
 *       但仍模拟网络延迟以呈现四态中的「加载中」。
 * 禁止被页面组件直接引用,只能经由 src/api/client.ts。
 * ============================================================ */
import type {
  ApiClient,
  DashboardFilters,
  DashboardQuery,
  DistrictCompletion,
  KpiCard,
  RevenueTrend,
  RiskTaskFunnel,
  SourceContribution,
  TaxTypeStructure,
} from '../types'

/** 模拟网络延迟（毫秒）:让加载态可见,又不至于拖慢演示 */
const LATENCY = 320
function delay<T>(data: T, ms = LATENCY): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
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
        { key: 'govAdd', label: '综合治税增收', value: '1.28', unit: '亿元', accent: 'gold', delta: '▲ 21.3%', deltaTone: 'positive', deltaNote: '同比', linkTo: '/rules' },
        { key: 'riskRate', label: '风险任务处置率', value: '86.3', unit: '%', accent: 'red', delta: '待处置 137 户', deltaTone: 'negative', deltaNote: '剩余', linkTo: '/clues?status=待派发' },
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
}

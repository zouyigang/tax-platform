<script setup lang="ts">
/**
 * 一户式主档查询
 * 档案主体由 URL 的 taxpayerId 决定,不再固定展示某一户:
 *   有参数 → 档案态(顶部搜索区收起为一行,可点「切换企业」重新展开);
 *   无参数 → 空态(展开的搜索框 + 最近查看 / 我管辖的重点税源两个快捷列表)。
 * 六大类标签页同页切换(tab 写入 URL query,可分享 / 可回退),各自独立取数与四态。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { ArchiveTab, ArchiveTaxRow, FilterOption, TaxpayerBrief } from '@/api/types'
import { useResource } from '@/composables/useResource'
import { useRecentTaxpayers } from '@/composables/useRecentTaxpayers'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import TabNav from '@/components/common/TabNav.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import DataTable from '@/components/common/DataTable.vue'
import TaxpayerSearch from '@/components/common/TaxpayerSearch.vue'
import InvoiceBarChart from '@/components/charts/InvoiceBarChart.vue'
import type { TableColumn } from '@/components/common/table'
import { REG_STATUS_LABEL, REG_STATUS_TONE, RISK_LABEL, RISK_TONE } from '@/components/common/tone'

const route = useRoute()
const router = useRouter()
const { recent, push: pushRecent } = useRecentTaxpayers()

/**
 * 档案主体:取自 URL 的 taxpayerId;
 * 兼容早期链接使用的 taxId 参数(站内已全部改为 taxpayerId,此处仅作向后兼容)。
 */
const taxId = ref('')
function readTaxpayerFromRoute(): string {
  const q = route.query
  if (typeof q.taxpayerId === 'string' && q.taxpayerId) return q.taxpayerId
  if (typeof q.taxId === 'string' && q.taxId) return q.taxId
  return ''
}

const TABS: FilterOption[] = [
  { value: 'base', label: '基础信息' },
  { value: 'reg', label: '登记信息' },
  { value: 'biz', label: '经营信息' },
  { value: 'declare', label: '申报缴纳' },
  { value: 'invoice', label: '票流' },
  { value: 'eval', label: '征管评价' },
]

const tab = ref<ArchiveTab>('base')

/* ---------------- 数据资源:概要 + 各标签页独立 ---------------- */
const summary = useResource(() => api.archive.getArchiveSummary(taxId.value))
const profile = useResource(
  () => api.archive.getArchiveProfile(taxId.value, tab.value as 'base' | 'reg' | 'biz'),
  { isEmpty: (d) => d.length === 0 },
)
const declare = useResource(() => api.archive.getArchiveDeclare(taxId.value))
const invoice = useResource(() => api.archive.getArchiveInvoice(taxId.value))
const evaluation = useResource(() => api.archive.getArchiveEvaluation(taxId.value))

/** 已按当前主体取过数的标签页;切换企业时清空,避免沿用上一户的数据 */
const loadedTabs = ref<string[]>([])

function loadTab() {
  if (!taxId.value) return
  if (tab.value === 'base' || tab.value === 'reg' || tab.value === 'biz') {
    profile.load()
    return
  }
  if (loadedTabs.value.indexOf(tab.value) >= 0) return
  loadedTabs.value.push(tab.value)
  if (tab.value === 'declare') declare.load()
  else if (tab.value === 'invoice') invoice.load()
  else if (tab.value === 'eval') evaluation.load()
}

/**
 * 载入某一户的档案(taxId 已变更后调用)
 * 概要返回后补记「最近查看」—— 从其他页点纳税人名称直接跳进来的情况也要记上,
 * 否则最近查看只会记住手工搜索过的户,失去意义。
 */
async function loadArchive() {
  if (!taxId.value) return
  loadedTabs.value = []
  loadTab()
  await summary.load()
  const s = summary.data.value
  if (s && taxId.value) pushRecent(taxId.value, s.taxpayerName)
}

onMounted(() => {
  const q = route.query.tab
  if (typeof q === 'string' && TABS.some((t) => t.value === q)) tab.value = q as ArchiveTab
  taxId.value = readTaxpayerFromRoute()
  // 顶栏全局搜索回车未选中联想项时会带 keyword 进来,直接展开检索结果
  const kw = route.query.keyword
  if (typeof kw === 'string' && kw) {
    pageKeyword.value = kw
    results.load()
  }
  if (taxId.value) loadArchive()
  else {
    keyList.load()
    loadRecent()
  }
})

// 浏览器前进后退 / 站内跳转都会改 query,统一在此响应
watch(
  () => route.query.taxpayerId,
  () => {
    const next = readTaxpayerFromRoute()
    if (next === taxId.value) return
    taxId.value = next
    if (taxId.value) loadArchive()
    else {
      keyList.load()
      loadRecent()
    }
  },
)

watch(tab, (v) => {
  router.replace({ query: { ...route.query, tab: v } })
  loadTab()
})

/* ---------------- 搜索区 ---------------- */
/** 已选中企业时搜索区收起为一行;点「切换企业」展开 */
const searchOpen = ref(false)
const advancedOpen = ref(false)
const pageKeyword = ref('')

const industryCode = ref('all')
const regStatus = ref('all')
const authorityCode = ref('all')
const riskLevel = ref('all')
const qualification = ref('all')

const searchFilters = useResource(() => api.archive.getTaxpayerSearchFilters())
const activeFilters = computed(() => ({
  industryCode: industryCode.value,
  regStatus: regStatus.value,
  authorityCode: authorityCode.value,
  riskLevel: riskLevel.value,
  qualification: qualification.value,
}))
/** 已启用的高级筛选项数(收起时显示在按钮上) */
const activeFilterCount = computed(
  () => [industryCode, regStatus, authorityCode, riskLevel, qualification].filter((r) => r.value !== 'all').length,
)

const results = useResource(
  () =>
    api.archive.searchTaxpayers({
      keyword: pageKeyword.value,
      ...activeFilters.value,
      page: 1,
      pageSize: 20,
    }),
  { isEmpty: (d) => d.items.length === 0 },
)

function runSearch() {
  results.load()
}
function resetFilters() {
  industryCode.value = 'all'
  regStatus.value = 'all'
  authorityCode.value = 'all'
  riskLevel.value = 'all'
  qualification.value = 'all'
  if (results.status.value !== 'idle') results.load()
}
function openSwitch() {
  searchOpen.value = true
  advancedOpen.value = false
}
/** 展开高级筛选:筛选项懒加载,用户不展开就不请求 */
function toggleAdvanced() {
  advancedOpen.value = !advancedOpen.value
  if (advancedOpen.value && searchFilters.status.value === 'idle') searchFilters.load()
}

/* ---------------- 快捷列表 ---------------- */
const keyList = useResource(() => api.archive.getMyKeyTaxpayers())
const recentList = useResource(() => api.archive.getTaxpayersByIds(recent.value.map((r) => r.taxpayerId)))
function loadRecent() {
  if (recent.value.length) recentList.load()
}

/* ---------------- 选中企业 ---------------- */
function selectTaxpayer(t: TaxpayerBrief) {
  pushRecent(t.taxpayerId, t.name)
  searchOpen.value = false
  pageKeyword.value = ''
  // 用 push 而非 replace,保证浏览器前进后退可在不同企业间切换
  router.push({ path: '/archive', query: { taxpayerId: t.taxpayerId, tab: tab.value } })
}
/** 回到空态(不带任何主体) */
function backToEmpty() {
  router.push({ path: '/archive' })
}

const money = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 })

/* ---------------- 分税种表格 ---------------- */
const taxColumns: TableColumn[] = [
  { key: 'name', label: '税种' },
  { key: 'amount', label: '已入库', align: 'right', numeric: true },
  { key: 'yoy', label: '同比', align: 'right', numeric: true },
  { key: 'share', label: '占比', width: '40%' },
]

const taxRowKey = (r: ArchiveTaxRow) => r.name

const taxMax = computed(() => {
  const list = declare.data.value ? declare.data.value.taxes : []
  return list.reduce((m, t) => (t.amount > m ? t.amount : m), 0) || 1
})
const taxSum = computed(() => {
  const list = declare.data.value ? declare.data.value.taxes : []
  return list.reduce((s, t) => s + t.amount, 0) || 1
})
</script>

<template>
  <div class="archive">
    <PageHeader title="一户式主档查询" breadcrumb="首页 / 数据治理 / 一户式主档查询">
      <template #actions>
        <button type="button" class="btn" :disabled="!taxId">导出档案</button>
        <button type="button" class="btn btn--primary" :disabled="!taxId">发起核查</button>
      </template>
    </PageHeader>

    <div class="archive__body">
      <!-- ══ 搜索区:未选中企业时展开,已选中时收起为一行 ══ -->
      <section v-if="taxId && !searchOpen" class="bar">
        <span class="bar__label">当前企业</span>
        <span class="bar__name">{{ summary.data.value ? summary.data.value.taxpayerName : '加载中…' }}</span>
        <span class="bar__id num">{{ taxId }}</span>
        <button type="button" class="btn bar__btn" @click="openSwitch">切换企业</button>
        <button type="button" class="btn bar__btn" @click="backToEmpty">返回检索</button>
      </section>

      <section v-else class="search" :class="{ 'search--empty': !taxId }">
        <div class="search__row">
          <TaxpayerSearch
            v-model="pageKeyword"
            size="page"
            :filters="activeFilters"
            :autofocus="searchOpen"
            @select="selectTaxpayer"
            @submit="runSearch"
          />
          <button type="button" class="btn" @click="toggleAdvanced">
            高级筛选 {{ advancedOpen ? '▲' : '▼' }}
            <span v-if="activeFilterCount" class="search__count num">{{ activeFilterCount }}</span>
          </button>
          <button type="button" class="btn btn--primary" @click="runSearch">查询</button>
          <button v-if="taxId" type="button" class="btn" @click="searchOpen = false">取消</button>
        </div>

        <!-- 筛选项取数失败时给出可重试的提示,而不是让面板静默空着 -->
        <div v-if="advancedOpen" class="adv-wrap">
          <StateBlock
            :status="searchFilters.status.value"
            :error="searchFilters.error.value"
            @retry="searchFilters.load()"
          >
            <div v-if="searchFilters.data.value" class="adv">
              <div class="adv__item">
                <label>行业</label>
                <BaseSelect v-model="industryCode" :options="searchFilters.data.value.industries" width="100%" />
              </div>
              <div class="adv__item">
                <label>登记状态</label>
                <BaseSelect v-model="regStatus" :options="searchFilters.data.value.regStatuses" width="100%" />
              </div>
              <div class="adv__item adv__item--wide">
                <label>主管税务机关</label>
                <BaseSelect v-model="authorityCode" :options="searchFilters.data.value.authorities" width="100%" />
              </div>
              <div class="adv__item">
                <label>风险等级</label>
                <BaseSelect v-model="riskLevel" :options="searchFilters.data.value.riskLevels" width="100%" />
              </div>
              <div class="adv__item">
                <label>纳税人资格</label>
                <BaseSelect v-model="qualification" :options="searchFilters.data.value.qualifications" width="100%" />
              </div>
              <div class="adv__act">
                <button type="button" class="btn" @click="resetFilters">重置筛选</button>
              </div>
            </div>
          </StateBlock>
        </div>
      </section>

      <!-- ══ 空态:检索结果 或 两个快捷列表 ══ -->
      <template v-if="!taxId">
        <!-- 已执行检索:出结果列表 -->
        <section v-if="results.status.value !== 'idle'" class="panel">
          <div class="panel__head">
            <span class="panel__title">检索结果</span>
            <span v-if="results.data.value" class="panel__sub num">共 {{ results.data.value.total }} 户</span>
          </div>
          <div class="panel__body">
            <StateBlock
              :status="results.status.value"
              :error="results.error.value"
              empty-text="未匹配到纳税人"
              empty-hint="可调整关键词或放宽高级筛选条件"
              @retry="results.load()"
            >
              <div v-if="results.data.value" class="hits">
                <div
                  v-for="t in results.data.value.items"
                  :key="t.taxpayerId"
                  class="hit"
                  @click="selectTaxpayer(t)"
                >
                  <div class="hit__line">
                    <span class="hit__name">{{ t.name }}</span>
                    <BaseBadge :tone="REG_STATUS_TONE[t.regStatus]" variant="dot">
                      {{ REG_STATUS_LABEL[t.regStatus] }}
                    </BaseBadge>
                    <BaseBadge :tone="RISK_TONE[t.riskLevel]">{{ RISK_LABEL[t.riskLevel] }}</BaseBadge>
                  </div>
                  <div class="hit__meta num">
                    {{ t.taxpayerId }} · {{ t.industry }} · {{ t.district }} · {{ t.authority }}
                  </div>
                </div>
              </div>
            </StateBlock>
          </div>
        </section>

        <!-- 未检索:两个快捷列表并排 -->
        <div v-else class="quick">
          <section class="panel">
            <div class="panel__head">
              <span class="panel__title">最近查看</span>
              <span class="panel__sub num">{{ recent.length }} 户</span>
            </div>
            <div class="panel__body">
              <div v-if="!recent.length" class="quick__empty">
                还没有查看记录。用上方搜索框查找企业,或从右侧重点税源中直接进入。
              </div>
              <StateBlock v-else :status="recentList.status.value" :error="recentList.error.value" @retry="loadRecent()">
                <div v-if="recentList.data.value" class="qlist">
                  <div
                    v-for="t in recentList.data.value"
                    :key="t.taxpayerId"
                    class="qitem"
                    @click="selectTaxpayer(t)"
                  >
                    <div class="qitem__main">
                      <span class="qitem__name">{{ t.name }}</span>
                      <span class="qitem__meta num">{{ t.industry }} · {{ t.district }}</span>
                    </div>
                    <BaseBadge :tone="RISK_TONE[t.riskLevel]">{{ RISK_LABEL[t.riskLevel] }}</BaseBadge>
                  </div>
                </div>
              </StateBlock>
            </div>
          </section>

          <section class="panel">
            <div class="panel__head">
              <span class="panel__title">我管辖的重点税源</span>
              <span v-if="keyList.data.value" class="panel__sub num">{{ keyList.data.value.length }} 户</span>
            </div>
            <div class="panel__body">
              <StateBlock :status="keyList.status.value" :error="keyList.error.value" @retry="keyList.load()">
                <div v-if="keyList.data.value" class="qlist">
                  <div
                    v-for="t in keyList.data.value"
                    :key="t.taxpayerId"
                    class="qitem"
                    @click="selectTaxpayer(t)"
                  >
                    <div class="qitem__main">
                      <span class="qitem__name">{{ t.name }}</span>
                      <span class="qitem__meta num">
                        本年入库 {{ money(t.yearTax) }} 万 · {{ t.industry }}
                      </span>
                    </div>
                    <span class="qitem__score num" :class="`tone-${RISK_TONE[t.riskLevel]}`">
                      {{ t.riskScore.toFixed(0) }}
                    </span>
                    <span v-if="t.openClueCount" class="qitem__clue num">{{ t.openClueCount }} 条未办结</span>
                    <span v-else class="qitem__clue qitem__clue--none">无未办结</span>
                  </div>
                </div>
              </StateBlock>
            </div>
          </section>
        </div>
      </template>

      <!-- ══ 企业概要卡 ══ -->
      <section v-if="taxId" class="summary">
        <StateBlock :status="summary.status.value" :error="summary.error.value" @retry="summary.load()">
          <template v-if="summary.data.value">
            <div class="summary__inner">
              <div class="summary__avatar">{{ summary.data.value.avatarText }}</div>
              <div class="summary__main">
                <div class="summary__title-line">
                  <div class="summary__name">{{ summary.data.value.taxpayerName }}</div>
                  <BaseBadge :tone="RISK_TONE[summary.data.value.riskLevel]">
                    {{ RISK_LABEL[summary.data.value.riskLevel] }}
                  </BaseBadge>
                  <BaseBadge tone="success" variant="soft">
                    {{ summary.data.value.registrationStatus }}
                  </BaseBadge>
                </div>
                <div class="summary__meta num">
                  纳税人识别号 {{ summary.data.value.taxId }} · 统一社会信用代码
                  {{ summary.data.value.creditCode }} · 主管:{{ summary.data.value.authority }}
                </div>
              </div>
              <div class="summary__metrics">
                <MetricCard
                  v-for="m in summary.data.value.metrics"
                  :key="m.label"
                  :label="m.label"
                  :value="m.value"
                  :tone="m.tone"
                  align="center"
                  variant="none"
                />
              </div>
            </div>
          </template>
        </StateBlock>
      </section>

      <!-- ══ 六大类标签页 ══ -->
      <section v-if="taxId" class="panel">
        <TabNav v-model="tab" :tabs="TABS" />

        <div class="panel__body">
          <!-- 基础 / 登记 / 经营:键值网格 -->
          <StateBlock
            v-if="tab === 'base' || tab === 'reg' || tab === 'biz'"
            :status="profile.status.value"
            :error="profile.error.value"
            empty-text="暂无该类档案信息"
            @retry="profile.load()"
          >
            <div class="kv-grid">
              <div v-for="p in profile.data.value" :key="p.key" class="kv-grid__cell">
                <div class="kv-grid__k">{{ p.key }}</div>
                <div class="kv-grid__v" :class="{ num: p.numeric }">{{ p.value }}</div>
              </div>
            </div>
          </StateBlock>

          <!-- 申报缴纳 -->
          <StateBlock
            v-else-if="tab === 'declare'"
            :status="declare.status.value"
            :error="declare.error.value"
            @retry="declare.load()"
          >
            <template v-if="declare.data.value">
              <div class="grid grid--4 mb-20">
                <MetricCard
                  v-for="k in declare.data.value.kpis"
                  :key="k.label"
                  :label="k.label"
                  :value="k.value"
                  :unit="k.unit"
                  :accent="k.accent"
                />
              </div>

              <div class="sec-title">分税种入库(本年累计,万元)</div>
              <DataTable
                :columns="taxColumns"
                :rows="declare.data.value.taxes"
                :row-key="taxRowKey"
              >
                <template #cell-amount="{ row }">{{ row.amount.toFixed(1) }}</template>
                <template #cell-yoy="{ row }">
                  <span :class="row.yoyPositive ? 'tone-success' : 'tone-danger'" class="yoy">
                    {{ row.yoy }}
                  </span>
                </template>
                <template #cell-share="{ row }">
                  <div class="share">
                    <div class="share__track">
                      <div
                        class="share__fill"
                        :style="{ width: ((row.amount / taxMax) * 100).toFixed(0) + '%' }"
                      ></div>
                    </div>
                    <span class="share__pct num">
                      {{ ((row.amount / taxSum) * 100).toFixed(1) }}%
                    </span>
                  </div>
                </template>
              </DataTable>
            </template>
          </StateBlock>

          <!-- 票流 -->
          <StateBlock
            v-else-if="tab === 'invoice'"
            :status="invoice.status.value"
            :error="invoice.error.value"
            @retry="invoice.load()"
          >
            <template v-if="invoice.data.value">
              <div class="grid grid--4 mb-20">
                <MetricCard
                  v-for="s in invoice.data.value.stats"
                  :key="s.label"
                  :label="s.label"
                  :value="s.value"
                  :tone="s.tone"
                  align="center"
                />
              </div>

              <div class="grid grid--2">
                <div>
                  <div class="sec-title">进销项对比(近6月,万元)</div>
                  <InvoiceBarChart :monthly="invoice.data.value.monthly" />
                </div>
                <div>
                  <div class="sec-title">开票预警</div>
                  <div class="warn-list">
                    <div
                      v-for="w in invoice.data.value.warnings"
                      :key="w.title"
                      class="warn"
                      :class="`tone-${RISK_TONE[w.level]}`"
                    >
                      <div class="warn__title">{{ w.title }}</div>
                      <div class="warn__desc">{{ w.desc }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </StateBlock>

          <!-- 征管评价 -->
          <StateBlock
            v-else
            :status="evaluation.status.value"
            :error="evaluation.error.value"
            @retry="evaluation.load()"
          >
            <template v-if="evaluation.data.value">
              <div class="grid grid--2">
                <div>
                  <div class="sec-title">纳税信用等级(近4年)</div>
                  <div class="credit">
                    <div
                      v-for="c in evaluation.data.value.creditHistory"
                      :key="c.year"
                      class="credit__cell"
                      :class="`tone-${c.tone}`"
                    >
                      <div class="credit__grade">{{ c.grade }}</div>
                      <div class="credit__year num">{{ c.year }}</div>
                    </div>
                  </div>

                  <div class="sec-title">评价标签</div>
                  <div class="tags">
                    <BaseBadge
                      v-for="t in evaluation.data.value.tags"
                      :key="t.name"
                      :tone="t.tone"
                    >
                      {{ t.name }}
                    </BaseBadge>
                  </div>
                </div>

                <div>
                  <div class="sec-title">风险与征管记录</div>
                  <div class="records">
                    <div
                      v-for="r in evaluation.data.value.records"
                      :key="r.label"
                      class="records__row"
                    >
                      <span class="records__k">{{ r.label }}</span>
                      <span class="records__v num" :class="`tone-${r.tone}`">{{ r.value }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </StateBlock>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.archive {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.archive__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
/* 可滚动的纵向 flex 容器:直接子项一律不收缩,避免面板被压扁 */
.archive__body > * {
  flex: none;
}

/* ══ 搜索区 ══ */
.search {
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: var(--space-3) var(--space-4);
}
/* 空态下搜索区居中偏上,视觉上引导先检索 */
.search--empty {
  max-width: 860px;
  width: 100%;
  margin: var(--space-6) auto 0;
}
.search__row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.search__row .btn {
  height: 38px;
  flex: none;
}
.search__row > .tps,
.search__row :deep(.tps) {
  flex: 1;
  min-width: 0;
}
.search__count {
  margin-left: 4px;
  font-size: var(--fs-micro);
  color: var(--color-text-inverse);
  background: var(--color-primary);
  border-radius: var(--radius-control);
  padding: 0 5px;
}
.adv-wrap {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-neutral-200);
}
.adv {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-3);
}
.adv__item {
  min-width: 0;
}
.adv__item--wide {
  grid-column: span 2;
}
.adv__item label {
  display: block;
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-bottom: 4px;
}
.adv__act {
  grid-column: span 5;
  display: flex;
  justify-content: flex-end;
}

/* 已选中企业时的紧凑条 */
.bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: 0 var(--space-4);
  height: 46px;
}
.bar__label {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  flex: none;
}
.bar__name {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-900);
}
.bar__id {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  flex: 1;
  min-width: 0;
}
.bar__btn {
  height: 30px;
  flex: none;
}

/* ══ 空态:检索结果与快捷列表 ══ */
.quick {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: var(--space-4);
  max-width: 1160px;
  width: 100%;
  margin: 0 auto;
}
.panel__head {
  height: 42px;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 18px;
  border-bottom: var(--border-line);
}
.panel__title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.panel__sub {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
}
.quick__empty {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  line-height: 1.8;
  padding: var(--space-4) 0;
  text-align: center;
}
.qlist {
  display: flex;
  flex-direction: column;
}
.qitem {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 9px 4px;
  border-bottom: 1px solid var(--color-neutral-200);
  cursor: pointer;
}
.qitem:last-child {
  border-bottom: none;
}
.qitem:hover {
  background: var(--color-row-hover);
}
.qitem__main {
  flex: 1;
  min-width: 0;
}
.qitem__name {
  display: block;
  font-size: var(--fs-aux);
  color: var(--color-neutral-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.qitem__meta {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.qitem__score {
  flex: none;
  width: 34px;
  text-align: right;
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
}
.qitem__clue {
  flex: none;
  width: 76px;
  text-align: right;
  font-size: var(--fs-micro);
  color: var(--color-risk-mid-text);
}
.qitem__clue--none {
  color: var(--color-neutral-500);
}

.hits {
  display: flex;
  flex-direction: column;
}
.hit {
  padding: 9px 4px;
  border-bottom: 1px solid var(--color-neutral-200);
  cursor: pointer;
}
.hit:last-child {
  border-bottom: none;
}
.hit:hover {
  background: var(--color-row-hover);
}
.hit__line {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.hit__name {
  font-size: var(--fs-aux);
  color: var(--color-neutral-900);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hit__meta {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  margin-top: 1px;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ══ 概要卡 ══ */
.summary {
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  min-height: 96px;
}
.summary__inner {
  display: flex;
  gap: 22px;
  align-items: center;
}
.summary__avatar {
  width: 56px;
  height: 56px;
  flex: none;
  background: var(--color-surface-dark);
  color: var(--color-text-inverse);
  border-radius: var(--radius-control);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: var(--fw-semibold);
}
.summary__main {
  min-width: 0;
  flex: 1;
}
.summary__title-line {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.summary__name {
  font-size: 20px;
  font-weight: var(--fw-semibold);
}
.summary__meta {
  font-size: var(--fs-aux);
  color: var(--color-neutral-600);
  margin-top: 6px;
}
.summary__metrics {
  display: flex;
  gap: var(--space-8);
  flex: none;
}

/* ══ 标签面板 ══ */
.panel {
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.panel__body {
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  min-height: 220px;
}

.sec-title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-600);
  margin-bottom: 10px;
}
.grid {
  display: grid;
  gap: 14px;
}
.grid--2 {
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.grid--4 {
  grid-template-columns: repeat(4, 1fr);
}
.mb-20 {
  margin-bottom: 20px;
}

/* ══ 键值网格(基础/登记/经营) ══ */
.kv-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1px;
  background: var(--color-neutral-200);
  border: 1px solid var(--color-neutral-200);
}
.kv-grid__cell {
  background: var(--color-panel);
  padding: 12px 16px;
}
.kv-grid__k {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-bottom: 5px;
}
.kv-grid__v {
  font-size: var(--fs-body);
}

/* ══ 分税种表格内的占比条 ══ */
.yoy {
  color: var(--tone-text);
}
.share {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.share__track {
  flex: 1;
  height: 8px;
  background: var(--color-neutral-200);
  border-radius: 1px;
}
.share__fill {
  height: 8px;
  background: var(--color-primary);
  border-radius: 1px;
}
.share__pct {
  width: 40px;
  color: var(--color-neutral-600);
}

/* ══ 开票预警 ══ */
.warn-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.warn {
  border: 1px solid var(--color-neutral-200);
  border-left: 3px solid var(--tone-main);
  border-radius: var(--radius-control);
  padding: 11px 14px;
}
.warn__title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
}
.warn__desc {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-top: 3px;
}

/* ══ 征管评价 ══ */
.credit {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
}
.credit__cell {
  flex: 1;
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  padding: 14px 10px;
  text-align: center;
}
.credit__grade {
  font-size: 22px;
  font-weight: var(--fw-semibold);
  color: var(--tone-main);
}
.credit__year {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-top: var(--space-1);
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.records {
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
}
.records__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 11px 16px;
  border-bottom: 1px solid var(--color-neutral-200);
  font-size: var(--fs-aux);
}
.records__row:last-child {
  border-bottom: none;
}
.records__k {
  color: var(--color-text-sub);
}
.records__v {
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
}
</style>

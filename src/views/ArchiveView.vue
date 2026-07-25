<script setup lang="ts">
/**
 * 一户式档案详情
 * 六大类标签页同页切换(tab 写入 URL query,可分享 / 可回退),
 * 每个标签页独立取数、独立四态。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { ArchiveTab, ArchiveTaxRow, FilterOption } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import TabNav from '@/components/common/TabNav.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import DataTable from '@/components/common/DataTable.vue'
import InvoiceBarChart from '@/components/charts/InvoiceBarChart.vue'
import type { TableColumn } from '@/components/common/table'
import { RISK_LABEL, RISK_TONE } from '@/components/common/tone'

const route = useRoute()
const router = useRouter()

/** 档案主体:由 URL query 带入,缺省用演示企业 */
const taxId = computed(() =>
  typeof route.query.taxId === 'string' && route.query.taxId ? route.query.taxId : '91330100MA2Q7X',
)

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

/** 按当前标签页加载对应数据(已加载过的不重复请求) */
function loadTab() {
  if (tab.value === 'base' || tab.value === 'reg' || tab.value === 'biz') profile.load()
  else if (tab.value === 'declare') {
    if (declare.status.value === 'idle') declare.load()
  } else if (tab.value === 'invoice') {
    if (invoice.status.value === 'idle') invoice.load()
  } else if (tab.value === 'eval') {
    if (evaluation.status.value === 'idle') evaluation.load()
  }
}

onMounted(() => {
  const q = route.query.tab
  if (typeof q === 'string' && TABS.some((t) => t.value === q)) tab.value = q as ArchiveTab
  summary.load()
  loadTab()
})

watch(tab, (v) => {
  router.replace({ query: { ...route.query, tab: v } })
  loadTab()
})

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
        <button type="button" class="btn">导出档案</button>
        <button type="button" class="btn btn--primary">发起核查</button>
      </template>
    </PageHeader>

    <div class="archive__body">
      <!-- ══ 企业概要卡 ══ -->
      <section class="summary">
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
      <section class="panel">
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

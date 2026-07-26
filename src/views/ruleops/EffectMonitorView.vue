<script setup lang="ts">
/**
 * 规则库管理 · 规则效果监测(《需求文档》3.12.3)
 * 无设计稿;跨规则「全库效果横向对比」视角:KPI + 命中趋势 + 分类占比
 * + 规则对比表(迷你趋势 + 结论徽章,点击列头排序)+ 优化建议。
 */
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { EffectRuleRow } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import PanelCard from '@/components/common/PanelCard.vue'
import DataTable from '@/components/common/DataTable.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import LineChart from '@/components/charts/LineChart.vue'
import HBarList from '@/components/charts/HBarList.vue'
import Sparkline from '@/components/charts/Sparkline.vue'
import type { SortDir, TableColumn } from '@/components/common/table'
import { RISK_TONE, VERDICT_LABEL, VERDICT_TONE, toneClass } from '@/components/common/tone'

const data = useResource(() => api.ruleops.getEffectMonitor())
const em = computed(() => data.data.value)

onMounted(() => data.load())

/* 规则表排序(点击列头) */
const sortKey = ref<string>('monthHit')
const sortDir = ref<SortDir>(-1)
function sortBy(key: string) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 1 ? -1 : 1
  else {
    sortKey.value = key
    sortDir.value = key === 'name' || key === 'category' || key === 'verdict' ? 1 : -1
  }
}

const rules = computed(() => {
  const d = em.value
  if (!d) return []
  const rows = [...d.rules]
  const k = sortKey.value
  const dir = sortDir.value
  rows.sort((a, b) => {
    if (k === 'name' || k === 'category' || k === 'verdict' || k === 'id') {
      return String(a[k as keyof EffectRuleRow]).localeCompare(String(b[k as keyof EffectRuleRow]), 'zh') * dir
    }
    if (k === 'mom') return (parseFloat(a.mom) - parseFloat(b.mom)) * dir
    return ((a[k as keyof EffectRuleRow] as number) - (b[k as keyof EffectRuleRow] as number)) * dir
  })
  return rows.map((r) => ({ ...r, momPos: r.mom.startsWith('+') }))
})

const columns: TableColumn[] = [
  { key: 'id', label: '规则编号', width: '112px', numeric: true },
  { key: 'name', label: '规则名称', ellipsis: true },
  { key: 'category', label: '分类', width: '92px' },
  { key: 'monthHit', label: '本月命中', width: '92px', align: 'right', numeric: true },
  { key: 'spark', label: '近 6 月走势', width: '96px', sortable: false },
  { key: 'hitRate', label: '查实率', width: '138px' },
  { key: 'falseRate', label: '误报率', width: '84px', align: 'right', numeric: true },
  { key: 'mom', label: '环比', width: '82px', align: 'right', numeric: true },
  { key: 'verdict', label: '评估结论', width: '96px' },
]
const rowKey = (r: EffectRuleRow) => r.id
const fmt = (n: number) => n.toLocaleString('en-US')
function rateTone(r: number) {
  return r >= 50 ? 'success' : r >= 30 ? 'gold' : 'danger'
}
</script>

<template>
  <div class="em">
    <PageHeader title="规则效果监测" breadcrumb="首页 / 规则库管理 / 规则效果监测">
      <template #actions>
        <span class="em__upd num">数据更新 2026-07-24 08:00</span>
        <button type="button" class="btn btn--primary">导出评估报告</button>
      </template>
    </PageHeader>

    <div class="em__body">
      <StateBlock :status="data.status.value" :error="data.error.value" @retry="data.load()">
        <template v-if="em">
          <div class="em__kpis">
            <MetricCard
              v-for="k in em.kpis"
              :key="k.label"
              :label="k.label"
              :value="k.value"
              :unit="k.unit"
              :accent="k.accent"
              variant="card"
            />
          </div>

          <div class="em__row">
            <PanelCard title="全库命中量趋势" subtitle="近 6 个月 · 条" class="em__panel">
              <LineChart :points="em.trend" />
            </PanelCard>
            <PanelCard title="分类命中占比" subtitle="本月 · 条" class="em__panel">
              <HBarList :items="em.categoryDist" unit="条" />
            </PanelCard>
            <PanelCard title="优化建议" :subtitle="`${em.suggestions.length} 条`" class="em__panel">
              <div class="sugs">
                <div v-for="(s, i) in em.suggestions" :key="i" class="sug" :class="toneClass(RISK_TONE[s.level])">
                  <div class="sug__title">{{ s.title }}</div>
                  <div class="sug__rule">{{ s.ruleName }}</div>
                  <div class="sug__note">{{ s.note }}</div>
                </div>
              </div>
            </PanelCard>
          </div>

          <PanelCard title="规则效果横向对比" subtitle="点击列头排序">
            <DataTable
              :columns="columns"
              :rows="rules"
              :row-key="rowKey"
              density="compact"
              sortable
              :sort-key="sortKey"
              :sort-dir="sortDir"
              @sort="sortBy"
            >
              <template #cell-id="{ row }">
                <span class="em__id">{{ row.id }}</span>
              </template>
              <template #cell-monthHit="{ row }">{{ fmt(row.monthHit) }}</template>
              <template #cell-spark="{ row }">
                <Sparkline :values="row.spark" />
              </template>
              <template #cell-hitRate="{ row }">
                <div class="rate">
                  <div class="rate__track">
                    <div class="rate__fill" :class="`tone-${rateTone(row.hitRate)}`" :style="{ width: row.hitRate + '%' }"></div>
                  </div>
                  <span class="num rate__pct">{{ row.hitRate.toFixed(1) }}%</span>
                </div>
              </template>
              <template #cell-falseRate="{ row }">
                <span :class="row.falseRate > 65 ? 'val-neg' : ''">{{ row.falseRate.toFixed(1) }}%</span>
              </template>
              <template #cell-mom="{ row }">
                <span :class="row.momPos ? 'val-pos' : 'val-neg'">{{ row.mom }}</span>
              </template>
              <template #cell-verdict="{ row }">
                <BaseBadge :tone="VERDICT_TONE[row.verdict]">{{ VERDICT_LABEL[row.verdict] }}</BaseBadge>
              </template>
            </DataTable>
          </PanelCard>
        </template>
      </StateBlock>
    </div>
  </div>
</template>

<style scoped>
.em {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
}
.em__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  white-space: nowrap;
  margin-right: 6px;
}
.em__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: var(--space-4) 20px;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.em__kpis {
  flex: none;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}
.em__row {
  display: grid;
  grid-template-columns: 1.1fr 1fr 1.15fr;
  gap: var(--space-4);
}
.em__panel {
  height: 290px;
}
.em__id {
  color: var(--color-primary);
  font-weight: var(--fw-medium);
}

/* 优化建议 */
.sugs {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: auto;
  min-height: 0;
}
.sug {
  border: 1px solid var(--color-neutral-200);
  border-left: 3px solid var(--tone-main);
  border-radius: var(--radius-control);
  padding: 9px 12px;
}
.sug__title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
}
.sug__rule {
  font-size: var(--fs-micro);
  color: var(--color-primary);
  margin-top: 2px;
}
.sug__note {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-top: 3px;
  line-height: 1.5;
}

/* 查实率条 */
.rate {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.rate__track {
  flex: 1;
  height: 8px;
  background: var(--color-neutral-200);
  border-radius: 1px;
  min-width: 0;
}
.rate__fill {
  height: 8px;
  border-radius: 1px;
  background: var(--tone-main);
}
.rate__pct {
  width: 46px;
  text-align: right;
  flex: none;
  font-weight: var(--fw-medium);
}
.val-pos {
  color: var(--color-status-normal-text);
  font-weight: var(--fw-semibold);
}
.val-neg {
  color: var(--color-risk-high);
  font-weight: var(--fw-semibold);
}
</style>

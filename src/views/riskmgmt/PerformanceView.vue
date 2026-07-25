<script setup lang="ts">
/**
 * 风险管理 · 处置绩效统计(《需求文档》7.5)
 * 无设计稿;看板范式:KPI + 办结量趋势 + 分局入库排名 + 处置时长分布 + 人员绩效明细(可排序)。
 */
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { PerfPersonRow } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import PanelCard from '@/components/common/PanelCard.vue'
import DataTable from '@/components/common/DataTable.vue'
import LineChart from '@/components/charts/LineChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import HBarList from '@/components/charts/HBarList.vue'
import type { SortDir, TableColumn } from '@/components/common/table'

const data = useResource(() => api.riskmgmt.getPerformanceStats())
const perf = computed(() => data.data.value)

onMounted(() => data.load())

/* 人员绩效排序:点击列头切换(首次点击数值列降序,文本列升序) */
const sortKey = ref<keyof PerfPersonRow>('tax')
const sortDir = ref<SortDir>(-1)
function sortBy(key: string) {
  const k = key as keyof PerfPersonRow
  if (sortKey.value === k) sortDir.value = sortDir.value === 1 ? -1 : 1
  else {
    sortKey.value = k
    sortDir.value = k === 'name' || k === 'dept' ? 1 : -1
  }
}
const persons = computed(() => {
  const d = perf.value
  if (!d) return []
  const rows = [...d.persons]
  const k = sortKey.value
  const dir = sortDir.value
  rows.sort((a, b) => {
    if (k === 'name' || k === 'dept') return String(a[k]).localeCompare(String(b[k]), 'zh') * dir
    if (k === 'mom') return (parseFloat(a.mom) - parseFloat(b.mom)) * dir
    return ((a[k] as number) - (b[k] as number)) * dir
  })
  return rows.map((r) => ({ ...r, momPos: r.mom.startsWith('+') }))
})

const columns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '90px' },
  { key: 'dept', label: '所属分局', width: '120px' },
  { key: 'assigned', label: '承办任务', width: '96px', align: 'right', numeric: true },
  { key: 'completed', label: '已办结', width: '90px', align: 'right', numeric: true },
  { key: 'rate', label: '查实率', width: '150px' },
  { key: 'tax', label: '入库税款(万)', width: '120px', align: 'right', numeric: true },
  { key: 'avgDays', label: '户均耗时(天)', width: '118px', align: 'right', numeric: true },
  { key: 'mom', label: '环比', width: '90px', align: 'right', numeric: true },
]
const rowKey = (r: PerfPersonRow) => r.name
const fmt = (n: number) => n.toLocaleString('en-US')
/** 查实率取色 */
function rateTone(r: number) {
  return r >= 75 ? 'success' : r >= 65 ? 'gold' : 'danger'
}
</script>

<template>
  <div class="pf">
    <PageHeader title="处置绩效统计" breadcrumb="首页 / 风险管理 / 处置绩效统计">
      <template #actions>
        <span class="pf__upd num">数据更新 2026-07-24 08:00</span>
        <button type="button" class="btn btn--primary">导出绩效报表</button>
      </template>
    </PageHeader>

    <div class="pf__body">
      <StateBlock :status="data.status.value" :error="data.error.value" @retry="data.load()">
        <template v-if="perf">
          <div class="pf__kpis">
            <MetricCard
              v-for="k in perf.kpis"
              :key="k.label"
              :label="k.label"
              :value="k.value"
              :unit="k.unit"
              :accent="k.accent"
              variant="card"
            />
          </div>

          <div class="pf__row3">
            <PanelCard title="月度办结量" subtitle="项" class="pf__panel">
              <LineChart :points="perf.trend" />
            </PanelCard>
            <PanelCard title="分局入库税款排名" subtitle="万元" class="pf__panel">
              <HBarList :items="perf.deptRank" unit="万" />
            </PanelCard>
            <PanelCard title="处置时长分布" subtitle="任务数" class="pf__panel">
              <BarChart :items="perf.durationDist" unit="项" />
            </PanelCard>
          </div>

          <PanelCard title="人员绩效明细" subtitle="点击列头排序">
            <DataTable
              :columns="columns"
              :rows="persons"
              :row-key="rowKey"
              density="compact"
              sortable
              :sort-key="sortKey"
              :sort-dir="sortDir"
              @sort="sortBy"
            >
              <template #cell-name="{ row }">
                <span class="pf__name">{{ row.name }}</span>
              </template>
              <template #cell-assigned="{ row }">{{ fmt(row.assigned) }}</template>
              <template #cell-completed="{ row }">{{ fmt(row.completed) }}</template>
              <template #cell-rate="{ row }">
                <div class="rate">
                  <div class="rate__track">
                    <div class="rate__fill" :class="`tone-${rateTone(row.rate)}`" :style="{ width: row.rate + '%' }"></div>
                  </div>
                  <span class="num rate__pct">{{ row.rate.toFixed(1) }}%</span>
                </div>
              </template>
              <template #cell-tax="{ row }">{{ fmt(row.tax) }}</template>
              <template #cell-mom="{ row }">
                <span :class="row.momPos ? 'val-pos' : 'val-neg'">{{ row.mom }}</span>
              </template>
            </DataTable>
          </PanelCard>
        </template>
      </StateBlock>
    </div>
  </div>
</template>

<style scoped>
.pf {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
}
.pf__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  white-space: nowrap;
  margin-right: 6px;
}
.pf__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: var(--space-4) 20px;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.pf__kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}
.pf__row3 {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: var(--space-4);
}
.pf__panel {
  height: 280px;
}
.pf__name {
  font-weight: var(--fw-semibold);
  color: var(--color-primary);
}
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
  width: 48px;
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

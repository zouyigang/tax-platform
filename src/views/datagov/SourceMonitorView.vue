<script setup lang="ts">
/**
 * 数据治理 · 数据源接入监控(《需求文档》2.2)
 * 无设计稿,在既有设计系统内自绘:KPI 行 + 接入量趋势 + 告警栏 + 数据源清单表。
 * 取数经 @/api/client。
 */
import { computed, onMounted } from 'vue'
import { api } from '@/api/client'
import type { DataSourceRow } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import PanelCard from '@/components/common/PanelCard.vue'
import DataTable from '@/components/common/DataTable.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import LineChart from '@/components/charts/LineChart.vue'
import type { TableColumn } from '@/components/common/table'
import { SOURCE_STATUS_LABEL, SOURCE_STATUS_TONE, RISK_TONE, toneClass } from '@/components/common/tone'

const data = useResource(() => api.datagov.getDataSourceMonitor())
const ds = computed(() => data.data.value)

onMounted(() => data.load())

const columns: TableColumn[] = [
  { key: 'id', label: '编码', width: '84px', numeric: true },
  { key: 'name', label: '数据源名称', ellipsis: true },
  { key: 'dept', label: '提供部门', width: '140px', ellipsis: true },
  { key: 'category', label: '类别', width: '78px' },
  { key: 'frequency', label: '频率', width: '64px', align: 'center' },
  { key: 'lastArrival', label: '最近到达', width: '132px', numeric: true },
  { key: 'arrivalRate', label: '到达率', width: '150px' },
  { key: 'delayHours', label: '延迟', width: '76px', align: 'right', numeric: true },
  { key: 'todayRecords', label: '今日接入', width: '96px', align: 'right', numeric: true },
  { key: 'status', label: '状态', width: '86px' },
]
const rowKey = (r: DataSourceRow) => r.id
const fmt = (n: number) => n.toLocaleString('en-US')
</script>

<template>
  <div class="sm">
    <PageHeader title="数据源接入监控" breadcrumb="首页 / 数据治理 / 数据源接入监控">
      <template #actions>
        <span class="sm__upd num">数据更新 2026-07-24 08:00</span>
        <button type="button" class="btn">接口配置</button>
        <button type="button" class="btn btn--primary">手动触发同步</button>
      </template>
    </PageHeader>

    <div class="sm__body">
      <StateBlock :status="data.status.value" :error="data.error.value" @retry="data.load()">
        <template v-if="ds">
          <div class="sm__kpis">
            <MetricCard
              v-for="k in ds.kpis"
              :key="k.label"
              :label="k.label"
              :value="k.value"
              :unit="k.unit"
              :accent="k.accent"
              variant="card"
            />
          </div>

          <div class="sm__row">
            <PanelCard title="近 7 日接入量" subtitle="万条" class="sm__panel">
              <LineChart :points="ds.trend" />
            </PanelCard>

            <PanelCard title="接入告警" :subtitle="`${ds.alerts.length} 条`" class="sm__panel">
              <div class="alerts">
                <div v-for="(a, i) in ds.alerts" :key="i" class="alert" :class="toneClass(RISK_TONE[a.level])">
                  <div class="alert__head">
                    <span class="alert__title">{{ a.title }}</span>
                    <span class="num alert__time">{{ a.time }}</span>
                  </div>
                  <div class="alert__desc">{{ a.desc }}</div>
                </div>
              </div>
            </PanelCard>
          </div>

          <PanelCard title="数据源清单" :subtitle="`共 ${ds.rows.length} 个`">
            <DataTable :columns="columns" :rows="ds.rows" :row-key="rowKey" density="compact">
              <template #cell-id="{ row }">
                <span class="sm__id">{{ row.id }}</span>
              </template>
              <template #cell-arrivalRate="{ row }">
                <div class="rate">
                  <div class="rate__track">
                    <div
                      class="rate__fill"
                      :class="row.arrivalRate >= 95 ? 'rate__fill--ok' : row.arrivalRate >= 85 ? 'rate__fill--warn' : 'rate__fill--bad'"
                      :style="{ width: row.arrivalRate + '%' }"
                    ></div>
                  </div>
                  <span class="num rate__pct">{{ row.arrivalRate.toFixed(1) }}%</span>
                </div>
              </template>
              <template #cell-delayHours="{ row }">
                <span :class="row.delayHours > 0 ? 'val-neg' : 'val-muted'">
                  {{ row.delayHours > 0 ? row.delayHours + ' h' : '—' }}
                </span>
              </template>
              <template #cell-todayRecords="{ row }">
                <span :class="{ 'val-muted': row.todayRecords === 0 }">
                  {{ row.todayRecords > 0 ? fmt(row.todayRecords) : '—' }}
                </span>
              </template>
              <template #cell-status="{ row }">
                <BaseBadge :tone="SOURCE_STATUS_TONE[row.status]" variant="dot">
                  {{ SOURCE_STATUS_LABEL[row.status] }}
                </BaseBadge>
              </template>
            </DataTable>
          </PanelCard>
        </template>
      </StateBlock>
    </div>
  </div>
</template>

<style scoped>
.sm {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
}
.sm__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  white-space: nowrap;
  margin-right: 6px;
}
.sm__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: var(--space-4) 20px;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.sm__kpis {
  flex: none;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}
.sm__row {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: var(--space-4);
}
.sm__panel {
  height: 280px;
}
.sm__id {
  color: var(--color-primary);
  font-weight: var(--fw-medium);
}

/* 告警 */
.alerts {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: auto;
  min-height: 0;
}
.alert {
  border: 1px solid var(--color-neutral-200);
  border-left: 3px solid var(--tone-main);
  border-radius: var(--radius-control);
  padding: 10px 14px;
}
.alert__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}
.alert__title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
}
.alert__time {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  white-space: nowrap;
}
.alert__desc {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-top: 3px;
}

/* 到达率条 */
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
}
.rate__fill--ok {
  background: var(--color-status-normal);
}
.rate__fill--warn {
  background: var(--color-status-pending);
}
.rate__fill--bad {
  background: var(--color-risk-high);
}
.rate__pct {
  width: 48px;
  text-align: right;
  flex: none;
  font-weight: var(--fw-medium);
}
.val-neg {
  color: var(--color-risk-high);
  font-weight: var(--fw-semibold);
}
.val-muted {
  color: var(--color-neutral-400);
}
</style>

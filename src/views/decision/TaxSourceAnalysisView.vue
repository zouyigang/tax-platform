<script setup lang="ts">
/**
 * 决策分析 · 税源分析(《需求文档》8.1)
 * 看板范式:周期/区县筛选 + KPI + 行业分布/登记结构/分区县户数面板。
 */
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { DashboardPeriod, DecisionQuery } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import PanelCard from '@/components/common/PanelCard.vue'
import BarChart from '@/components/charts/BarChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import HBarList from '@/components/charts/HBarList.vue'

const period = ref<DashboardPeriod>('year')
const districtCode = ref('all')

const filters = useResource(() => api.decision.getDecisionFilters())
const query = computed<DecisionQuery>(() => ({ period: period.value, districtCode: districtCode.value }))
const data = useResource(() => api.decision.getTaxSourceAnalysis(query.value))

onMounted(async () => {
  await filters.load()
  if (filters.data.value) {
    period.value = filters.data.value.defaultPeriod
    districtCode.value = filters.data.value.defaultDistrictCode
  }
  data.load()
})
</script>

<template>
  <div class="ana">
    <PageHeader title="税源分析" breadcrumb="首页 / 决策分析 / 税源分析">
      <template #actions>
        <BaseSelect
          v-model="period"
          :options="filters.data.value ? filters.data.value.periods : []"
          width="100px"
          @update:model-value="data.load()"
        />
        <BaseSelect
          v-model="districtCode"
          :options="filters.data.value ? filters.data.value.districts : []"
          width="130px"
          @update:model-value="data.load()"
        />
      </template>
    </PageHeader>

    <div class="ana__body">
      <StateBlock :status="data.status.value" :error="data.error.value" @retry="data.load()">
        <template v-if="data.data.value">
          <div class="ana__kpis">
            <MetricCard
              v-for="k in data.data.value.kpis"
              :key="k.label"
              :label="k.label"
              :value="k.value"
              :unit="k.unit"
              :accent="k.accent"
              variant="card"
            />
          </div>

          <PanelCard title="分行业税源分布" subtitle="户" class="ana__panel ana__panel--tall">
            <BarChart :items="data.data.value.industries" unit="户" />
          </PanelCard>

          <div class="ana__row2">
            <PanelCard title="登记类型结构" class="ana__panel">
              <DonutChart :segments="data.data.value.structure.segments" :total-label="data.data.value.structure.totalLabel" />
            </PanelCard>
            <PanelCard title="分区县税源户数" subtitle="户" class="ana__panel">
              <HBarList :items="data.data.value.districts" unit="户" />
            </PanelCard>
          </div>
        </template>
      </StateBlock>
    </div>
  </div>
</template>

<style scoped>
.ana {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
}
.ana__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: var(--space-4) 20px;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.ana__kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}
.ana__panel {
  height: 300px;
}
.ana__panel--tall {
  height: 320px;
}
.ana__row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
</style>

<script setup lang="ts">
/**
 * 决策分析 · 治税成效分析(《需求文档》8.1)
 * 看板范式:周期/区县筛选 + KPI + 增收趋势/数据源贡献/风险闭环面板。
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
import LineChart from '@/components/charts/LineChart.vue'
import BarChart from '@/components/charts/BarChart.vue'
import HBarList from '@/components/charts/HBarList.vue'

const period = ref<DashboardPeriod>('year')
const districtCode = ref('all')

const filters = useResource(() => api.decision.getDecisionFilters())
const query = computed<DecisionQuery>(() => ({ period: period.value, districtCode: districtCode.value }))
const data = useResource(() => api.decision.getEffectivenessAnalysis(query.value))

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
    <PageHeader title="治税成效分析" breadcrumb="首页 / 决策分析 / 治税成效分析">
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

          <PanelCard title="综合治税增收趋势" subtitle="近 12 个月 · 万元" class="ana__panel ana__panel--tall">
            <LineChart :points="data.data.value.trend" />
          </PanelCard>

          <div class="ana__row2">
            <PanelCard title="分数据源增收贡献" subtitle="万元" class="ana__panel">
              <BarChart :items="data.data.value.sources" unit="万" />
            </PanelCard>
            <PanelCard title="风险任务闭环" subtitle="条" class="ana__panel">
              <HBarList :items="data.data.value.funnel" unit="条" :rank-color="false" />
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

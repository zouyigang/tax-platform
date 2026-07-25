<script setup lang="ts">
/**
 * 决策分析 · 专题分析(《需求文档》8.1)
 * 看板范式 + 专题切换:选择专题后加载该专题的 KPI/趋势/结构/明细。
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
import DonutChart from '@/components/charts/DonutChart.vue'
import HBarList from '@/components/charts/HBarList.vue'

const period = ref<DashboardPeriod>('year')
const districtCode = ref('all')
const topic = ref('realestate')

const filters = useResource(() => api.decision.getDecisionFilters())
const query = computed<DecisionQuery>(() => ({ period: period.value, districtCode: districtCode.value }))
const data = useResource(() => api.decision.getTopicAnalysis(query.value, topic.value))

onMounted(async () => {
  await filters.load()
  if (filters.data.value) {
    period.value = filters.data.value.defaultPeriod
    districtCode.value = filters.data.value.defaultDistrictCode
    topic.value = filters.data.value.defaultTopic
  }
  data.load()
})
</script>

<template>
  <div class="ana">
    <PageHeader title="专题分析" breadcrumb="首页 / 决策分析 / 专题分析">
      <template #actions>
        <BaseSelect
          v-model="topic"
          :options="filters.data.value ? filters.data.value.topics : []"
          width="150px"
          @update:model-value="data.load()"
        />
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
          <div class="ana__topic">当前专题:<b>{{ data.data.value.topicName }}</b></div>
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

          <PanelCard title="专题税收趋势" subtitle="近 6 个月 · 亿元" class="ana__panel ana__panel--tall">
            <LineChart :points="data.data.value.trend" />
          </PanelCard>

          <div class="ana__row2">
            <PanelCard title="专题税种结构" class="ana__panel">
              <DonutChart :segments="data.data.value.structure.segments" :total-label="data.data.value.structure.totalLabel" />
            </PanelCard>
            <PanelCard title="专题明细分解" subtitle="万元" class="ana__panel">
              <HBarList :items="data.data.value.breakdown" unit="万" />
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
.ana__topic {
  font-size: var(--fs-aux);
  color: var(--color-neutral-600);
}
.ana__topic b {
  color: var(--color-neutral-900);
  font-weight: var(--fw-semibold);
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

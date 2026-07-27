<script setup lang="ts">
/**
 * 数据治理 · 数据质量看板(《需求文档》2.5)
 * 无设计稿,在既有设计系统内自绘:综合评分环 + 五维度评分 + 得分趋势
 * + 各数据源评分排名 + 问题数据清单。
 */
import { computed, onMounted } from 'vue'
import { api } from '@/api/client'
import type { QualityIssueRow } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PanelCard from '@/components/common/PanelCard.vue'
import DataTable from '@/components/common/DataTable.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import LineChart from '@/components/charts/LineChart.vue'
import HBarList from '@/components/charts/HBarList.vue'
import type { TableColumn } from '@/components/common/table'
import { RISK_LABEL, RISK_TONE } from '@/components/common/tone'

const data = useResource(() => api.datagov.getQualityDashboard())
const q = computed(() => data.data.value)

onMounted(() => data.load())

/** 评分环几何:半径 54,周长 2πr */
const RING_R = 54
const RING_C = 2 * Math.PI * RING_R
const ringDash = computed(() => {
  const s = q.value ? q.value.overallScore : 0
  return `${((s / 100) * RING_C).toFixed(1)} ${RING_C.toFixed(1)}`
})
/** 得分语气:≥90 优 / ≥80 良 / ≥70 中 / 其余差 */
function scoreTone(score: number) {
  return score >= 90 ? 'success' : score >= 80 ? 'primary' : score >= 70 ? 'gold' : 'danger'
}
function scoreLabel(score: number) {
  return score >= 90 ? '优秀' : score >= 80 ? '良好' : score >= 70 ? '一般' : '待改进'
}

const columns: TableColumn[] = [
  { key: 'id', label: '问题编号', width: '132px', numeric: true },
  { key: 'source', label: '数据源', width: '128px' },
  { key: 'table', label: '数据表', width: '210px', numeric: true, ellipsis: true },
  { key: 'rule', label: '命中质量规则', ellipsis: true },
  { key: 'level', label: '严重程度', width: '90px' },
  { key: 'count', label: '问题记录', width: '92px', align: 'right', numeric: true },
  { key: 'foundAt', label: '发现时间', width: '136px', numeric: true },
  { key: 'actions', label: '操作', width: '76px' },
]
const rowKey = (r: QualityIssueRow) => r.id
const fmt = (n: number) => n.toLocaleString('en-US')
</script>

<template>
  <div class="qd">
    <PageHeader title="数据质量看板" breadcrumb="首页 / 数据治理 / 数据质量看板">
      <template #actions>
        <span class="qd__upd num">数据更新 2026-07-24 08:00</span>
        <button type="button" class="btn">质量规则</button>
        <button type="button" class="btn btn--primary">生成质量报告</button>
      </template>
    </PageHeader>

    <div class="qd__body">
      <StateBlock :status="data.status.value" :error="data.error.value" @retry="data.load()">
        <template v-if="q">
          <!-- 综合评分 + 维度 -->
          <section class="card score">
            <div class="score__ring-wrap">
              <svg viewBox="0 0 140 140" class="score__ring">
                <circle cx="70" cy="70" :r="RING_R" fill="none" stroke="var(--color-neutral-200)" stroke-width="12" />
                <circle
                  cx="70" cy="70" :r="RING_R" fill="none"
                  stroke="currentColor" stroke-width="12" stroke-linecap="round"
                  :stroke-dasharray="ringDash" transform="rotate(-90 70 70)"
                  :class="`tone-${scoreTone(q.overallScore)}`"
                  :style="{ color: 'var(--tone-main)' }"
                />
              </svg>
              <div class="score__center">
                <div class="num score__value">{{ q.overallScore }}</div>
                <div class="score__label">综合质量得分</div>
              </div>
            </div>

            <div class="score__dims">
              <div class="score__dims-head">
                <span class="card__h2">质量维度评估</span>
                <BaseBadge :tone="scoreTone(q.overallScore)">{{ scoreLabel(q.overallScore) }}</BaseBadge>
              </div>
              <div class="dims">
                <div v-for="d in q.dimensions" :key="d.name" class="dim">
                  <div class="dim__head">
                    <span class="dim__name">{{ d.name }}</span>
                    <span class="dim__weight">权重 {{ d.weight }}%</span>
                    <span class="num dim__score" :class="`tone-${scoreTone(d.score)}`">{{ d.score }}</span>
                  </div>
                  <div class="dim__track">
                    <div class="dim__fill" :class="`tone-${scoreTone(d.score)}`" :style="{ width: d.score + '%' }"></div>
                  </div>
                  <div class="dim__issues num">{{ fmt(d.issues) }} 条问题</div>
                </div>
              </div>
              <div class="score__note">{{ q.scoreNote }}</div>
            </div>
          </section>

          <!-- 趋势 + 数据源排名 -->
          <div class="qd__row">
            <PanelCard title="质量得分趋势" subtitle="近 6 期" class="qd__panel">
              <LineChart :points="q.trend" />
            </PanelCard>
            <PanelCard title="分数据源质量得分" subtitle="满分 100" class="qd__panel">
              <HBarList :items="q.sourceScores" unit="分" />
            </PanelCard>
          </div>

          <!-- 问题清单 -->
          <PanelCard title="问题数据清单" :subtitle="`共 ${q.issues.length} 类`">
            <DataTable :columns="columns" :rows="q.issues" :row-key="rowKey" density="compact">
              <template #cell-id="{ row }">
                <span class="qd__id">{{ row.id }}</span>
              </template>
              <template #cell-level="{ row }">
                <BaseBadge :tone="RISK_TONE[row.level]">{{ RISK_LABEL[row.level] }}</BaseBadge>
              </template>
              <template #cell-count="{ row }">{{ fmt(row.count) }}</template>
              <template #cell-actions>
                <span class="qd__link">导出明细</span>
              </template>
            </DataTable>
          </PanelCard>
        </template>
      </StateBlock>
    </div>
  </div>
</template>

<style scoped>
.qd {
  /* 质量总分大字 */
  --qd-score: 38px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
}
.qd__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  white-space: nowrap;
  margin-right: 6px;
}
.qd__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: var(--space-4) 20px;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.card {
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: 18px 22px;
}
.card__h2 {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
}

/* 评分卡 */
.score {
  display: flex;
  align-items: center;
  gap: 32px;
}
.score__ring-wrap {
  position: relative;
  width: 160px;
  height: 160px;
  flex: none;
}
.score__ring {
  width: 160px;
  height: 160px;
  display: block;
}
.score__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.score__value {
  font-size: var(--qd-score);
  font-weight: var(--fw-semibold);
  line-height: 1;
  color: var(--color-neutral-900);
}
.score__label {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-top: 4px;
}
.score__dims {
  flex: 1;
  min-width: 0;
}
.score__dims-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.dims {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 18px;
}
.dim__head {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.dim__name {
  font-size: var(--fs-aux);
  color: var(--color-neutral-800);
  font-weight: var(--fw-medium);
}
.dim__weight {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.dim__score {
  margin-left: auto;
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
}
.dim__track {
  height: 8px;
  background: var(--color-neutral-200);
  border-radius: 1px;
  margin-top: 6px;
}
.dim__fill {
  height: 8px;
  border-radius: 1px;
  background: var(--tone-main);
}
.dim__issues {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  margin-top: 4px;
}
.score__note {
  margin-top: var(--space-4);
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  background: var(--color-neutral-100);
  border-radius: var(--radius-control);
  padding: 8px 12px;
}

.qd__row {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: var(--space-4);
}
.qd__panel {
  height: 280px;
}
.qd__id {
  color: var(--color-primary);
  font-weight: var(--fw-medium);
}
.qd__link {
  color: var(--color-primary);
  cursor: pointer;
}
.qd__link:hover {
  text-decoration: underline;
}
</style>

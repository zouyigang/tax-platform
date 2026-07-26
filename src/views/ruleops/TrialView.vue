<script setup lang="ts">
/**
 * 规则库管理 · 规则试跑与灰度(《需求文档》3.1.6)
 * 无设计稿;跨规则「试跑队列」视角:KPI + 状态芯片 + 试跑任务卡列表
 * (运行中显示进度条;已完成显示命中/误报/影响面与对比;灰度阶段可推进)。
 */
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { TrialRow } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FilterBar from '@/components/common/FilterBar.vue'
import FilterChip from '@/components/common/FilterChip.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import Toast from '@/components/common/Toast.vue'
import { TRIAL_STATUS_LABEL, TRIAL_STATUS_TONE } from '@/components/common/tone'

const status = ref('all')
const filters = useResource(() => api.ruleops.getTrialFilters())
const list = useResource(() => api.ruleops.getTrials(status.value), { isEmpty: (d) => d.length === 0 })

onMounted(() => {
  filters.load()
  list.load()
})

function pickStatus(v: string) {
  status.value = v
  list.load()
}

const fmt = (n: number) => n.toLocaleString('en-US')

/* 灰度推进确认 */
const grayOpen = ref(false)
const grayRow = ref<TrialRow | null>(null)
const toastVisible = ref(false)
const toastText = ref('')

function askPromote(row: TrialRow) {
  grayRow.value = row
  grayOpen.value = true
}
const grayTitle = computed(() => {
  const r = grayRow.value
  if (!r) return ''
  return r.gray === 'none' ? '确认开启灰度发布?' : '确认扩大至全量发布?'
})
const grayMessage = computed(() => {
  const r = grayRow.value
  if (!r) return ''
  return r.gray === 'none'
    ? `规则「${r.ruleName}」将以 10% 流量进入灰度,仅对抽样纳税人生成线索,可随时回退。`
    : `规则「${r.ruleName}」当前灰度 ${r.grayPercent}%,确认后将对全市全量生效。`
})
function confirmPromote() {
  grayOpen.value = false
  toastText.value = grayRow.value
    ? `规则「${grayRow.value.ruleName}」${grayRow.value.gray === 'none' ? '已开启灰度' : '已全量发布'}`
    : ''
  toastVisible.value = true
  list.load()
}
</script>

<template>
  <div class="tv">
    <PageHeader title="规则试跑与灰度" breadcrumb="首页 / 规则库管理 / 规则试跑与灰度">
      <template #actions>
        <span v-if="filters.status.value === 'ready'" class="tv__upd num">
          数据更新 {{ filters.data.value!.updatedAt }}
        </span>
        <button type="button" class="btn btn--primary">+ 新建试跑</button>
      </template>
    </PageHeader>

    <div class="tv__body">
      <div v-if="filters.data.value" class="tv__kpis">
        <MetricCard
          v-for="k in filters.data.value.kpis"
          :key="k.label"
          :label="k.label"
          :value="k.value"
          :unit="k.unit"
          :accent="k.accent"
          variant="card"
        />
      </div>

      <FilterBar>
        <div class="tv__chips">
          <span class="tv__chip-label">任务状态</span>
          <FilterChip
            v-for="s in filters.data.value ? filters.data.value.statuses : []"
            :key="s.value"
            :active="status === s.value"
            :count="s.count"
            @toggle="pickStatus(s.value)"
          >
            {{ s.label }}
          </FilterChip>
        </div>
      </FilterBar>

      <StateBlock
        :status="list.status.value"
        :error="list.error.value"
        empty-text="暂无试跑任务"
        empty-hint="可切换状态或新建试跑"
        @retry="list.load()"
      >
        <div v-if="list.data.value" class="trials">
          <div v-for="t in list.data.value" :key="t.id" class="trial">
            <!-- 头部 -->
            <div class="trial__head">
              <span class="num trial__id">{{ t.id }}</span>
              <span class="trial__name">{{ t.ruleName }}</span>
              <span class="num trial__rule">{{ t.ruleId }}</span>
              <BaseBadge :tone="TRIAL_STATUS_TONE[t.status]" variant="dot">
                {{ TRIAL_STATUS_LABEL[t.status] }}
              </BaseBadge>
              <span v-if="t.gray === 'gray'" class="trial__gray num">灰度 {{ t.grayPercent }}%</span>
              <span v-else-if="t.gray === 'full'" class="trial__full">已全量</span>
            </div>

            <div class="trial__meta">
              <span>样本范围:{{ t.scope }}</span>
              <span>发起人:{{ t.operator }}</span>
              <span class="num">{{ t.createdAt }}</span>
            </div>

            <!-- 运行中:进度 -->
            <div v-if="t.status === 'running'" class="trial__progress">
              <div class="trial__progress-bar">
                <div class="trial__progress-fill" :style="{ width: t.progress + '%' }"></div>
              </div>
              <span class="num trial__progress-pct">{{ t.progress }}%</span>
            </div>

            <!-- 已完成:结果 -->
            <div v-else-if="t.status === 'done'" class="trial__result">
              <div class="res">
                <div class="res__label">试跑命中量</div>
                <div class="num res__value">{{ fmt(t.hitCount) }}<span class="res__unit">条</span></div>
                <div class="res__delta" :class="t.hitDelta.startsWith('+') ? 'val-pos' : 'val-neg'">
                  较现行 {{ t.hitDelta }}
                </div>
              </div>
              <div class="res">
                <div class="res__label">预估误报率</div>
                <div class="num res__value" :class="t.falseRate > 50 ? 'val-neg' : ''">
                  {{ t.falseRate.toFixed(1) }}<span class="res__unit">%</span>
                </div>
                <div class="res__delta">越低越好</div>
              </div>
              <div class="res">
                <div class="res__label">影响面</div>
                <div class="num res__value">{{ fmt(t.coverage) }}<span class="res__unit">户</span></div>
                <div class="res__delta">涉及纳税人</div>
              </div>
              <div class="trial__ops">
                <button v-if="t.gray !== 'full'" type="button" class="btn btn--primary" @click="askPromote(t)">
                  {{ t.gray === 'none' ? '开启灰度' : '扩至全量' }}
                </button>
                <button type="button" class="btn">查看明细</button>
              </div>
            </div>

            <!-- 排队 / 失败 -->
            <div v-else class="trial__hint" :class="{ 'trial__hint--fail': t.status === 'failed' }">
              {{ t.status === 'queued' ? '任务已提交,等待计算资源调度…' : '试跑失败:取数超时,请检查样本范围后重试' }}
            </div>
          </div>
        </div>
      </StateBlock>
    </div>

    <ConfirmModal
      :open="grayOpen"
      :title="grayTitle"
      :message="grayMessage"
      confirm-text="确认"
      @confirm="confirmPromote"
      @cancel="grayOpen = false"
    />
    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.tv {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
}
.tv__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  white-space: nowrap;
  margin-right: 6px;
}
.tv__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: var(--space-4) 20px;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.tv__kpis {
  flex: none;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}
.tv__chips {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tv__chip-label {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  flex: none;
}

/* 试跑任务卡 */
.trials {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.trial {
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: 14px 18px;
}
.trial__head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.trial__id {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
}
.trial__name {
  font-size: var(--fs-body);
  font-weight: var(--fw-semibold);
}
.trial__rule {
  font-size: var(--fs-label);
  color: var(--color-primary);
}
.trial__gray {
  font-size: var(--fs-label);
  color: var(--color-status-pending-text);
  background: var(--color-status-pending-tint);
  border-radius: var(--radius-control);
  padding: 1px 8px;
}
.trial__full {
  font-size: var(--fs-label);
  color: var(--color-status-normal-text);
  background: var(--color-status-normal-tint);
  border-radius: var(--radius-control);
  padding: 1px 8px;
}
.trial__meta {
  display: flex;
  gap: 18px;
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-top: 6px;
  flex-wrap: wrap;
}

/* 进度 */
.trial__progress {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: 12px;
}
.trial__progress-bar {
  flex: 1;
  height: 10px;
  background: var(--color-neutral-200);
  border-radius: 1px;
}
.trial__progress-fill {
  height: 10px;
  background: var(--color-primary);
  border-radius: 1px;
  transition: width var(--motion-mid) ease;
}
.trial__progress-pct {
  width: 48px;
  text-align: right;
  font-weight: var(--fw-semibold);
  color: var(--color-primary);
}

/* 结果 */
.trial__result {
  display: flex;
  align-items: flex-end;
  gap: 40px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-neutral-200);
}
.res__label {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.res__value {
  font-size: 22px;
  font-weight: var(--fw-semibold);
  line-height: 1.3;
}
.res__unit {
  font-size: var(--fs-label);
  font-weight: var(--fw-regular);
  color: var(--color-neutral-600);
  margin-left: 3px;
}
.res__delta {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.trial__ops {
  margin-left: auto;
  display: flex;
  gap: var(--space-2);
}
.trial__ops .btn {
  height: 32px;
}
.trial__hint {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-neutral-200);
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
}
.trial__hint--fail {
  color: var(--color-risk-high-text);
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

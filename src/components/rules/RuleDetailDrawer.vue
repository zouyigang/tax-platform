<script setup lang="ts">
/**
 * 规则详情抽屉 · 三个标签页
 *   ① 规则定义:表 3-1 十七项要素展示
 *   ② 阈值参数:按行业/规模分档的可编辑参数表单
 *   ③ 效果监测:近 6 个月命中量 / 命中率双轴折线
 * 数据由父级传入(父级持有 useResource);阈值参数在本组件内维护可编辑副本。
 */
import { ref, watch } from 'vue'
import type { RuleDetail, RuleParamTier, FilterOption } from '@/api/types'
import type { ResourceStatus } from '@/composables/useResource'
import SideDrawer from '@/components/common/SideDrawer.vue'
import TabNav from '@/components/common/TabNav.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import StateBlock from '@/components/StateBlock.vue'
import RuleEffectChart from '@/components/charts/RuleEffectChart.vue'
import { RISK_LABEL, RISK_TONE, RULE_STATUS_LABEL, RULE_STATUS_TONE } from '@/components/common/tone'

const props = defineProps<{
  open: boolean
  status: ResourceStatus
  error: string
  detail: RuleDetail | null
}>()

defineEmits<{ (e: 'close'): void; (e: 'retry'): void }>()

const TABS: FilterOption[] = [
  { value: 'def', label: '规则定义' },
  { value: 'threshold', label: '阈值参数' },
  { value: 'effect', label: '效果监测' },
]
const tab = ref('def')

/** 阈值参数的可编辑副本(避免直接改动 props 数据) */
const tiers = ref<RuleParamTier[]>([])

function cloneTiers(d: RuleDetail | null): RuleParamTier[] {
  if (!d) return []
  return d.threshold.tiers.map((t) => ({ ...t, values: { ...t.values } }))
}

// 切换规则时:回到第一个标签页,重置可编辑副本
watch(
  () => (props.detail ? props.detail.id : ''),
  () => {
    tab.value = 'def'
    tiers.value = cloneTiers(props.detail)
  },
)

/** 新增一个分档行(默认「通用 / 不限」) */
function addTier() {
  const params = props.detail ? props.detail.threshold.params : []
  const values: Record<string, string> = {}
  params.forEach((p) => (values[p.key] = ''))
  tiers.value.push({ id: `t${Date.now()}`, industry: '通用', scale: '不限', values })
}
function removeTier(id: string) {
  tiers.value = tiers.value.filter((t) => t.id !== id)
}
</script>

<template>
  <SideDrawer :open="open" width="620px" @close="$emit('close')">
    <template #header>
      <div class="dh">
        <div class="dh__main">
          <div class="dh__line">
            <span v-if="detail" class="dh__id num">{{ detail.id }}</span>
            <span v-else class="skeleton dh__skel" style="width: 110px"></span>
            <BaseBadge v-if="detail" :tone="RISK_TONE[detail.riskLevel]">
              {{ RISK_LABEL[detail.riskLevel] }}
            </BaseBadge>
            <BaseBadge v-if="detail" :tone="RULE_STATUS_TONE[detail.status]" variant="dot">
              {{ RULE_STATUS_LABEL[detail.status] }}
            </BaseBadge>
          </div>
          <div v-if="detail" class="dh__name">{{ detail.name }}</div>
          <div v-else class="skeleton dh__skel dh__skel--name"></div>
          <div v-if="detail" class="dh__meta">所属分类 · {{ detail.categoryName }}</div>
        </div>
        <span class="dh__close" @click="$emit('close')">✕</span>
      </div>
      <TabNav v-model="tab" :tabs="TABS" size="sm" class="dh__tabs" />
    </template>

    <StateBlock :status="status" :error="error" @retry="$emit('retry')">
      <template v-if="detail">
        <!-- ══ ① 规则定义(表 3-1 十七要素) ══ -->
        <div v-if="tab === 'def'" class="def">
          <div
            v-for="(f, i) in detail.definition"
            :key="i"
            class="def__item"
            :class="{ 'def__item--full': f.full }"
          >
            <div class="def__label">{{ f.label }}</div>
            <div class="def__value" :class="{ num: f.mono }">{{ f.value }}</div>
          </div>
        </div>

        <!-- ══ ② 阈值参数(可编辑,按行业/规模分档) ══ -->
        <div v-else-if="tab === 'threshold'" class="stack">
          <div class="hint">
            按「行业 × 纳税人规模」分档配置阈值,留空表示沿用上一档。修改后点击底部「保存参数」生效。
          </div>
          <div class="ptable">
            <div class="ptable__head">
              <div class="ptable__cell ptable__cell--industry">适用行业</div>
              <div class="ptable__cell ptable__cell--scale">纳税人规模</div>
              <div
                v-for="p in detail.threshold.params"
                :key="p.key"
                class="ptable__cell ptable__cell--param"
              >
                {{ p.label }}<span v-if="p.unit" class="ptable__unit">/{{ p.unit }}</span>
              </div>
              <div class="ptable__cell ptable__cell--op"></div>
            </div>
            <div v-for="t in tiers" :key="t.id" class="ptable__row">
              <div class="ptable__cell ptable__cell--industry">
                <BaseInput v-model="t.industry" width="100%" />
              </div>
              <div class="ptable__cell ptable__cell--scale">
                <BaseInput v-model="t.scale" width="100%" />
              </div>
              <div
                v-for="p in detail.threshold.params"
                :key="p.key"
                class="ptable__cell ptable__cell--param"
              >
                <BaseInput v-model="t.values[p.key]" numeric width="100%" />
              </div>
              <div class="ptable__cell ptable__cell--op">
                <span class="ptable__del" title="删除该档" @click="removeTier(t.id)">✕</span>
              </div>
            </div>
          </div>
          <button type="button" class="btn btn--ghost ptable__add" @click="addTier">+ 新增分档</button>
        </div>

        <!-- ══ ③ 效果监测(近 6 月双轴) ══ -->
        <div v-else class="stack stack--lg">
          <div class="grid grid--4">
            <MetricCard
              v-for="s in detail.effect.summary"
              :key="s.label"
              :label="s.label"
              :value="s.value"
              :unit="s.unit"
              size="sm"
              align="center"
            />
          </div>
          <section>
            <div class="sec-title">近 6 个月命中量与命中率</div>
            <div class="effect-wrap">
              <RuleEffectChart :points="detail.effect.points" />
            </div>
          </section>
        </div>
      </template>
    </StateBlock>

    <template #footer>
      <button type="button" class="btn">停用规则</button>
      <button type="button" class="btn">规则试跑</button>
      <button type="button" class="btn btn--primary">保存参数</button>
    </template>
  </SideDrawer>
</template>

<style scoped>
/* ── 抽屉头部 ── */
.dh {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.dh__main {
  min-width: 0;
}
.dh__line {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dh__id {
  font-size: var(--fs-body);
  font-weight: var(--fw-semibold);
  color: var(--color-primary);
}
.dh__name {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
  margin-top: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dh__meta {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-top: 2px;
}
.dh__skel {
  display: block;
  height: 14px;
}
.dh__skel--name {
  width: 220px;
  height: 18px;
  margin-top: 6px;
}
.dh__close {
  flex: none;
  width: 26px;
  height: 26px;
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-neutral-600);
  cursor: pointer;
  font-size: var(--fs-h3);
}
.dh__close:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.dh__tabs {
  margin-top: 14px;
  margin-bottom: -14px;
  border-bottom-color: var(--color-neutral-200);
}

/* ── 通用排布 ── */
.stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.stack--lg {
  gap: 18px;
}
.sec-title {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-600);
  margin-bottom: var(--space-2);
}
.grid {
  display: grid;
  gap: 10px;
}
.grid--4 {
  grid-template-columns: repeat(4, 1fr);
}
.hint {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  line-height: 1.6;
  background: var(--color-primary-tint);
  border-radius: var(--radius-control);
  padding: var(--space-2) var(--space-3);
}

/* ── ① 规则定义:键值网格 ── */
.def {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--color-neutral-200);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  overflow: hidden;
}
.def__item {
  background: var(--color-panel);
  padding: 10px 14px;
}
.def__item--full {
  grid-column: 1 / -1;
}
.def__label {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  margin-bottom: var(--space-1);
}
.def__value {
  font-size: var(--fs-aux);
  color: var(--color-neutral-900);
  line-height: 1.55;
}

/* ── ② 阈值参数表 ── */
.ptable {
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  overflow: hidden;
}
.ptable__head,
.ptable__row {
  display: flex;
  align-items: center;
}
.ptable__head {
  background: var(--color-neutral-100);
  border-bottom: 1px solid var(--color-neutral-200);
}
.ptable__row {
  border-bottom: 1px solid var(--color-neutral-200);
}
.ptable__row:last-child {
  border-bottom: none;
}
.ptable__cell {
  padding: var(--space-2);
}
.ptable__head .ptable__cell {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  font-weight: var(--fw-semibold);
}
.ptable__cell--industry {
  flex: 1.4;
  min-width: 0;
}
.ptable__cell--scale {
  flex: 1.2;
  min-width: 0;
}
.ptable__cell--param {
  flex: 1;
  min-width: 0;
}
.ptable__cell--op {
  flex: none;
  width: 34px;
  text-align: center;
}
.ptable__unit {
  color: var(--color-neutral-500);
  font-weight: var(--fw-regular);
}
.ptable__del {
  color: var(--color-neutral-500);
  cursor: pointer;
  font-size: var(--fs-label);
}
.ptable__del:hover {
  color: var(--color-danger);
}
.ptable__add {
  align-self: flex-start;
}

/* 幽灵按钮(虚线,用于「新增分档」) */
.btn--ghost {
  background: transparent;
  border: 1px dashed var(--color-neutral-400);
  color: var(--color-neutral-600);
}
.btn--ghost:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* ── ③ 效果监测 ── */
.effect-wrap {
  height: 260px;
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  padding: var(--space-3);
}
</style>

<script setup lang="ts">
/**
 * 风险管理 · 任务派发(《需求文档》7.2)· 派发策略配置
 * 定位调整:单条派发与批量派发已在「风险线索池」里(管理者手工挑),
 * 本页解决的是「怎么自动分」,与线索池不重复:
 *   上 规则配置(管辖分局 / 行业专业化 / 人员负荷,可设权重与优先级)
 *   中 人员负荷看板(在办 / 本月已办结 / 承载上限,超载标红)
 *   下 待派发队列 + 一键按策略试算 → 预览派给谁 → 确认后执行
 * 试算不落库;规则一改,已有试算结果立即作废,必须重算后才能执行。
 */
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { DispatchQuery, DispatchRow, DispatchRule, DispatchStrategyInput } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import PanelCard from '@/components/common/PanelCard.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseCheckbox from '@/components/common/BaseCheckbox.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import DataTable from '@/components/common/DataTable.vue'
import Pagination from '@/components/common/Pagination.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import Toast from '@/components/common/Toast.vue'
import type { TableColumn } from '@/components/common/table'
import { RISK_LABEL, RISK_TONE } from '@/components/common/tone'

/* ---------------- 资源 ---------------- */
const strategy = useResource(() => api.riskmgmt.getDispatchStrategy())
const board = useResource(() => api.riskmgmt.getDispatchBoard())
const preview = useResource(() => api.riskmgmt.previewAutoDispatch(strategyInput.value))

/** 规则的本地可编辑副本(不直接改接口返回的数据) */
const rules = ref<DispatchRule[]>([])
const st = computed(() => strategy.data.value)
const bd = computed(() => board.data.value)
const pv = computed(() => preview.data.value)

const strategyInput = computed<DispatchStrategyInput>(() => ({
  rules: rules.value.map((r) => ({ key: r.key, enabled: r.enabled, weight: r.weight, priority: r.priority })),
}))

/* ---------------- 待派发队列 ---------------- */
const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)
const query = computed<DispatchQuery>(() => ({
  keyword: keyword.value,
  districtCode: 'all',
  riskLevel: 'all',
  page: page.value,
  pageSize: pageSize.value,
}))
const list = useResource(() => api.riskmgmt.getDispatchList(query.value), { isEmpty: (d) => d.items.length === 0 })

onMounted(async () => {
  await strategy.load()
  if (st.value) rules.value = st.value.rules.map((r) => ({ ...r }))
  board.load()
  list.load()
})

/* ---------------- 规则编辑 ---------------- */
/** 启用规则的权重合计;不等于 100 只提示、不阻断(允许先调后配平) */
const weightSum = computed(() => rules.value.filter((r) => r.enabled).reduce((s, r) => s + r.weight, 0))
const weightBalanced = computed(() => weightSum.value === 100)

/** 规则改动后,已有的试算结果作废,必须重算才能执行 */
const dirty = ref(false)
function markDirty() {
  dirty.value = true
}
function setWeight(r: DispatchRule, v: string) {
  r.weight = Math.max(0, Math.min(100, parseInt(v, 10) || 0))
  markDirty()
}
function toggleRule(r: DispatchRule) {
  r.enabled = !r.enabled
  markDirty()
}
/** 调整优先级:与相邻规则互换后重排序号 */
function movePriority(index: number, step: number) {
  const next = index + step
  if (next < 0 || next >= rules.value.length) return
  const arr = rules.value.slice()
  const tmp = arr[index]
  arr[index] = arr[next]
  arr[next] = tmp
  arr.forEach((r, i) => (r.priority = i + 1))
  rules.value = arr
  markDirty()
}
function resetRules() {
  if (st.value) rules.value = st.value.rules.map((r) => ({ ...r }))
  dirty.value = false
  preview.data.value = null
}
const saveOpen = ref(false)
function saveRules() {
  saveOpen.value = false
  dirty.value = false
  toast('派发策略已保存,后续自动派发按新策略执行')
}

/* ---------------- 试算与执行 ---------------- */
async function runPreview() {
  await preview.load()
  dirty.value = false
}
const previewCount = computed(() => (pv.value ? pv.value.items.length : 0))
const unassignedCount = computed(() => (pv.value ? pv.value.unassigned.length : 0))
/** 试算后各承办人各分到多少条 */
const perAssignee = computed(() => {
  if (!pv.value) return []
  const m: Record<string, number> = {}
  pv.value.items.forEach((i) => (m[i.assignee] = (m[i.assignee] || 0) + 1))
  return Object.keys(m)
    .map((name) => ({ name, count: m[name] }))
    .sort((a, b) => b.count - a.count)
})

const execOpen = ref(false)
function confirmExec() {
  execOpen.value = false
  toast(`已按策略派发 ${previewCount.value} 条线索`)
  preview.data.value = null
  list.load()
  board.load()
}

const toastVisible = ref(false)
const toastText = ref('')
function toast(text: string) {
  toastText.value = text
  toastVisible.value = true
}

/* ---------------- 队列表格 ---------------- */
function search() {
  page.value = 1
  list.load()
}
function onPageChange(p: number) {
  page.value = p
  list.load()
}
function onPageSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  list.load()
}
const columns: TableColumn[] = [
  { key: 'id', label: '线索编号', width: '132px', numeric: true },
  { key: 'taxpayerName', label: '纳税人名称', ellipsis: true },
  { key: 'riskLevel', label: '风险等级', width: '88px' },
  { key: 'estimatedTax', label: '预估税款(万)', width: '116px', align: 'right', numeric: true },
  { key: 'category', label: '规则类别', width: '96px' },
  { key: 'district', label: '所属区县', width: '92px' },
  { key: 'createdDate', label: '生成日期', width: '106px', numeric: true },
  { key: 'assign', label: '拟派承办人', width: '156px' },
]
const rowKey = (r: DispatchRow) => r.id
const rows = computed(() => (list.data.value ? list.data.value.items : []))
const total = computed(() => (list.data.value ? list.data.value.total : 0))
/** 队列行 → 试算结果里的分派对象(未试算时为空) */
function assignOf(id: string) {
  if (!pv.value) return null
  return pv.value.items.filter((i) => i.clueId === id)[0] || null
}
function loadTone(rate: number) {
  return rate >= 100 ? 'danger' : rate >= 85 ? 'warn' : rate >= 60 ? 'primary' : 'success'
}
</script>

<template>
  <div class="dp">
    <PageHeader title="任务派发" breadcrumb="首页 / 风险管理 / 任务派发">
      <template #actions>
        <span v-if="st" class="dp__upd num">策略更新 {{ st.updatedAt }} · {{ st.updatedBy }}</span>
      </template>
    </PageHeader>

    <div class="dp__body">
      <div class="dp__note">
        单条与批量派发在「风险线索池」按需手工执行;本页配置的是<b>自动派发策略</b>,仅对下方「按策略试算 → 确认派发」生效。
      </div>

      <div v-if="bd" class="dp__kpis">
        <MetricCard
          v-for="k in bd.kpis"
          :key="k.label"
          :label="k.label"
          :value="k.value"
          :unit="k.unit"
          :accent="k.accent"
          variant="card"
        />
      </div>

      <!-- ══════════ 上:自动派发规则 ══════════ -->
      <PanelCard title="自动派发规则" :subtitle="st ? st.note : ''">
        <template #actions>
          <span class="ws" :class="weightBalanced ? 'tone-success' : 'tone-warn'">
            启用权重合计 <b class="num">{{ weightSum }}</b> / 100
          </span>
          <button type="button" class="btn" @click="resetRules">恢复默认</button>
          <button type="button" class="btn btn--primary" @click="saveOpen = true">保存策略</button>
        </template>

        <StateBlock :status="strategy.status.value" :error="strategy.error.value" @retry="strategy.load()">
          <div class="rules">
            <div v-for="(r, i) in rules" :key="r.key" class="rule" :class="{ 'rule--off': !r.enabled }">
              <div class="rule__head">
                <span class="rule__pri num">优先级 {{ r.priority }}</span>
                <span class="rule__move">
                  <i :class="{ 'rule__move--dim': i === 0 }" title="上移" @click="movePriority(i, -1)">▲</i>
                  <i :class="{ 'rule__move--dim': i === rules.length - 1 }" title="下移" @click="movePriority(i, 1)">▼</i>
                </span>
                <span class="rule__switch" @click="toggleRule(r)">
                  <BaseCheckbox :model-value="r.enabled" @update:model-value="toggleRule(r)" />
                  <span>启用</span>
                </span>
              </div>
              <div class="rule__name">{{ r.name }}</div>
              <div class="rule__desc">{{ r.desc }}</div>
              <div class="rule__weight">
                <span class="rule__wk">权重</span>
                <div class="rule__track">
                  <div class="rule__fill" :style="{ width: r.weight + '%' }"></div>
                </div>
                <BaseInput
                  :model-value="String(r.weight)"
                  numeric
                  width="56px"
                  @update:model-value="setWeight(r, $event)"
                />
                <span class="rule__wu">%</span>
              </div>
            </div>
          </div>
        </StateBlock>
      </PanelCard>

      <!-- ══════════ 中:人员负荷看板 ══════════ -->
      <PanelCard title="人员负荷看板" subtitle="负荷率 = 在办任务数 ÷ 承载上限,达 100% 不再派单">
        <StateBlock :status="board.status.value" :error="board.error.value" @retry="board.load()">
          <div v-if="bd" class="loads">
            <div v-for="w in bd.workloads" :key="w.name" class="load" :class="`tone-${loadTone(w.loadRate)}`">
              <div class="load__top">
                <span class="load__name">{{ w.name }}</span>
                <span class="load__rate num">{{ w.loadRate }}%</span>
              </div>
              <div class="load__dept">{{ w.dept }}</div>
              <div class="load__track">
                <div class="load__fill" :style="{ width: Math.min(100, w.loadRate) + '%' }"></div>
              </div>
              <div class="load__meta num">
                在办 {{ w.processing }}/{{ w.capacity }} · 本月办结 {{ w.done }}
                <span v-if="w.loadRate >= 100" class="load__over">已超载</span>
              </div>
            </div>
          </div>
        </StateBlock>
      </PanelCard>

      <!-- ══════════ 下:待派发队列 + 试算 ══════════ -->
      <PanelCard title="待派发线索队列" :subtitle="`共 ${total} 条`">
        <template #actions>
          <BaseInput v-model="keyword" placeholder="纳税人 / 线索编号" width="180px" @enter="search" />
          <button type="button" class="btn" @click="search">查询</button>
          <button
            type="button"
            class="btn btn--primary"
            :disabled="preview.status.value === 'loading'"
            @click="runPreview"
          >
            {{ preview.status.value === 'loading' ? '试算中…' : '按策略试算' }}
          </button>
          <button type="button" class="btn btn--primary" :disabled="!pv || dirty" @click="execOpen = true">
            确认派发
          </button>
        </template>

        <!-- 试算结果摘要 -->
        <div v-if="pv" class="pv" :class="{ 'pv--stale': dirty }">
          <span class="pv__title">{{ dirty ? '规则已改动,试算结果已作废' : '试算结果(未执行)' }}</span>
          <span class="pv__stat num">拟派 {{ previewCount }} 条</span>
          <span v-if="unassignedCount" class="pv__stat pv__stat--warn num">{{ unassignedCount }} 条无法分派</span>
          <span v-for="a in perAssignee" :key="a.name" class="pv__chip num">{{ a.name }} {{ a.count }}</span>
          <button v-if="dirty" type="button" class="btn pv__btn" @click="runPreview">重新试算</button>
        </div>
        <div v-if="pv && unassignedCount" class="unassigned">
          <div v-for="u in pv.unassigned" :key="u.clueId" class="unassigned__row">
            <span class="num">{{ u.clueId }}</span>
            <span>{{ u.taxpayerName }}</span>
            <i>{{ u.reason }}</i>
          </div>
        </div>

        <StateBlock
          v-if="list.status.value === 'empty' || list.status.value === 'error'"
          :status="list.status.value"
          :error="list.error.value"
          empty-text="没有待派发的线索"
          @retry="list.load()"
        />
        <DataTable
          v-else
          :columns="columns"
          :rows="rows"
          :row-key="rowKey"
          density="compact"
          :loading="list.status.value === 'loading' || list.status.value === 'idle'"
          :skeleton-rows="10"
        >
          <template #cell-id="{ row }">
            <span class="dp__id">{{ row.id }}</span>
          </template>
          <template #cell-riskLevel="{ row }">
            <BaseBadge :tone="RISK_TONE[row.riskLevel]">{{ RISK_LABEL[row.riskLevel] }}</BaseBadge>
          </template>
          <template #cell-estimatedTax="{ row }">{{ row.estimatedTax.toFixed(2) }}</template>
          <template #cell-assign="{ row }">
            <span v-if="assignOf(row.id)" class="dp__assign" :title="assignOf(row.id)!.reason">
              {{ assignOf(row.id)!.assignee }}
              <i class="num">派后 {{ assignOf(row.id)!.loadAfter }}%</i>
            </span>
            <span v-else class="dp__none">未试算</span>
          </template>
        </DataTable>

        <Pagination
          :total="total"
          :page="page"
          :page-size="pageSize"
          @update:page="onPageChange"
          @update:page-size="onPageSizeChange"
        />
      </PanelCard>
    </div>

    <ConfirmModal
      :open="saveOpen"
      title="保存自动派发策略?"
      message="保存后,后续的自动派发将按新的规则启用状态、权重与优先级执行;已派发的任务不受影响。"
      confirm-text="确认保存"
      @confirm="saveRules"
      @cancel="saveOpen = false"
    />
    <ConfirmModal
      :open="execOpen"
      :title="`确认按试算结果派发 ${previewCount} 条线索?`"
      :message="
        unassignedCount
          ? `其中 ${unassignedCount} 条因承办人超载无法分派,本次不会派出,需人工处理。`
          : '派发后线索将进入对应承办人的待办任务,承办人负荷同步更新。'
      "
      confirm-text="确认派发"
      @confirm="confirmExec"
      @cancel="execOpen = false"
    />
    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.dp {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.dp__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.dp__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: var(--space-4) 20px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.dp__body > * {
  flex: none;
}
.dp__note {
  background: var(--color-primary-tint);
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-control);
  padding: 7px 14px;
  font-size: var(--fs-label);
  color: var(--color-primary-deep);
}
.dp__note b {
  font-weight: var(--fw-semibold);
}
.dp__kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}

/* ---------- 规则 ---------- */
.ws {
  font-size: var(--fs-label);
  color: var(--tone-text);
  background: var(--tone-tint);
  border-radius: var(--radius-control);
  padding: 2px 10px;
}
.ws b {
  font-weight: var(--fw-semibold);
}
.rules {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}
.rule {
  border: 1px solid var(--color-neutral-200);
  border-top: 3px solid var(--color-primary);
  border-radius: var(--radius-control);
  padding: 10px 14px;
}
.rule--off {
  border-top-color: var(--color-neutral-400);
  background: var(--color-neutral-100);
  opacity: 0.72;
}
.rule__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.rule__pri {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  background: var(--color-neutral-100);
  border-radius: var(--radius-control);
  padding: 0 6px;
}
.rule__move {
  display: inline-flex;
  gap: 2px;
}
.rule__move i {
  font-style: normal;
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  cursor: pointer;
  padding: 0 2px;
}
.rule__move i:hover {
  color: var(--color-primary);
}
.rule__move--dim {
  opacity: 0.3;
  cursor: not-allowed;
}
.rule__switch {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--fs-label);
  color: var(--color-neutral-700);
  cursor: pointer;
}
.rule__name {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  margin-top: 6px;
}
.rule__desc {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  line-height: 1.55;
  margin-top: 2px;
  min-height: 34px;
}
.rule__weight {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: 8px;
}
.rule__wk {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  flex: none;
}
.rule__track {
  flex: 1;
  min-width: 0;
  height: 6px;
  background: var(--color-neutral-200);
  border-radius: 1px;
}
.rule__fill {
  height: 6px;
  border-radius: 1px;
  background: var(--color-primary);
}
.rule__wu {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
}

/* ---------- 负荷看板 ---------- */
.loads {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-3);
}
.load {
  border: 1px solid var(--color-neutral-200);
  border-left: 3px solid var(--tone-main);
  border-radius: var(--radius-control);
  padding: 8px 12px;
}
.load__top {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}
.load__name {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  flex: 1;
  min-width: 0;
}
.load__rate {
  font-size: var(--fs-h3);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
}
.load__dept {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.load__track {
  height: 6px;
  background: var(--color-neutral-200);
  border-radius: 1px;
  margin: 5px 0 4px;
}
.load__fill {
  height: 6px;
  border-radius: 1px;
  background: var(--tone-main);
}
.load__meta {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
}
.load__over {
  color: var(--color-risk-high-text);
  font-weight: var(--fw-semibold);
  margin-left: 4px;
}

/* ---------- 试算 ---------- */
.pv {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  background: var(--color-status-normal-tint);
  border: 1px solid var(--color-status-normal);
  border-radius: var(--radius-control);
  padding: 6px 12px;
  margin-bottom: var(--space-2);
}
/* 规则改动后旧结果作废,转为警示色并要求重算 */
.pv--stale {
  background: var(--color-risk-mid-tint);
  border-color: var(--color-risk-mid);
}
.pv__title {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-800);
}
.pv__stat {
  font-size: var(--fs-label);
  color: var(--color-neutral-700);
}
.pv__stat--warn {
  color: var(--color-risk-high-text);
  font-weight: var(--fw-semibold);
}
.pv__chip {
  font-size: var(--fs-micro);
  color: var(--color-neutral-700);
  background: var(--color-panel);
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-control);
  padding: 0 7px;
}
.pv__btn {
  margin-left: auto;
  height: 26px;
  padding: 0 10px;
}
.unassigned {
  border: 1px solid var(--color-risk-high);
  border-radius: var(--radius-control);
  padding: 6px 12px;
  margin-bottom: var(--space-2);
}
.unassigned__row {
  display: flex;
  gap: var(--space-3);
  font-size: var(--fs-micro);
  color: var(--color-neutral-700);
  padding: 2px 0;
}
.unassigned__row i {
  font-style: normal;
  color: var(--color-risk-high-text);
}

.dp__id {
  color: var(--color-primary);
  font-weight: var(--fw-medium);
}
.dp__assign {
  font-weight: var(--fw-semibold);
  color: var(--color-primary-deep);
}
.dp__assign i {
  font-style: normal;
  font-weight: var(--fw-regular);
  color: var(--color-neutral-500);
  margin-left: 5px;
}
.dp__none {
  color: var(--color-neutral-500);
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>

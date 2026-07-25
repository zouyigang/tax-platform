<script setup lang="ts">
/**
 * 风险管理 · 任务派发(《需求文档》7.2)
 * 无设计稿;沿用列表范式:KPI + 人员负荷侧栏 + 待派发线索列表(可勾选批量派发)。
 * 派发走二次确认(《交互说明》4.3),成功以 toast 反馈。
 */
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { DispatchQuery, DispatchRow } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FilterBar from '@/components/common/FilterBar.vue'
import FilterField from '@/components/common/FilterField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import PanelCard from '@/components/common/PanelCard.vue'
import DataTable from '@/components/common/DataTable.vue'
import Pagination from '@/components/common/Pagination.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import Toast from '@/components/common/Toast.vue'
import type { TableColumn } from '@/components/common/table'
import { RISK_LABEL, RISK_TONE } from '@/components/common/tone'

const keyword = ref('')
const districtCode = ref('all')
const riskLevel = ref('all')
const page = ref(1)
const pageSize = ref(20)

const filters = useResource(() => api.riskmgmt.getDispatchFilters())
const board = useResource(() => api.riskmgmt.getDispatchBoard())
const query = computed<DispatchQuery>(() => ({
  keyword: keyword.value,
  districtCode: districtCode.value,
  riskLevel: riskLevel.value,
  page: page.value,
  pageSize: pageSize.value,
}))
const list = useResource(() => api.riskmgmt.getDispatchList(query.value), {
  isEmpty: (d) => d.items.length === 0,
})

onMounted(() => {
  filters.load()
  board.load()
  list.load()
})

function search() {
  page.value = 1
  list.load()
}
function reset() {
  keyword.value = ''
  districtCode.value = 'all'
  riskLevel.value = 'all'
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

/* 选择与派发 */
const selectedKeys = ref<string[]>([])
const hasSelection = computed(() => selectedKeys.value.length > 0)
const assignee = ref('auto')
const dispatchOpen = ref(false)
const dispatchRow = ref<DispatchRow | null>(null)
const toastVisible = ref(false)
const toastText = ref('')

function askDispatch(row: DispatchRow) {
  dispatchRow.value = row
  dispatchOpen.value = true
}
function askBatch() {
  if (!hasSelection.value) return
  dispatchRow.value = null
  dispatchOpen.value = true
}
const dispatchTitle = computed(() =>
  dispatchRow.value ? '确认派发该线索?' : `确认派发选中的 ${selectedKeys.value.length} 条线索?`,
)
const assigneeLabel = computed(() => {
  const opts = filters.data.value ? filters.data.value.assignees : []
  const hit = opts.filter((o) => o.value === assignee.value)[0]
  return hit ? hit.label : ''
})
function confirmDispatch() {
  dispatchOpen.value = false
  const n = dispatchRow.value ? 1 : selectedKeys.value.length
  toastText.value = `已派发 ${n} 条线索至「${assigneeLabel.value}」`
  toastVisible.value = true
  if (!dispatchRow.value) selectedKeys.value = []
  list.load()
  board.load()
}

const columns: TableColumn[] = [
  { key: 'id', label: '线索编号', width: '128px', numeric: true },
  { key: 'taxpayerName', label: '纳税人名称', ellipsis: true },
  { key: 'riskLevel', label: '风险等级', width: '88px' },
  { key: 'category', label: '规则类别', width: '86px' },
  { key: 'district', label: '所属区县', width: '90px' },
  { key: 'estimatedTax', label: '预估税款(万)', width: '112px', align: 'right', numeric: true },
  { key: 'createdDate', label: '生成日期', width: '106px', numeric: true },
  { key: 'suggested', label: '建议承办人', width: '148px', ellipsis: true },
  { key: 'actions', label: '操作', width: '72px' },
]
const rowKey = (r: DispatchRow) => r.id
const rows = computed(() => (list.data.value ? list.data.value.items : []))
const total = computed(() => (list.data.value ? list.data.value.total : 0))
/** 负荷取色:≥90 超载 / ≥70 偏高 / 其余正常 */
function loadTone(rate: number) {
  return rate >= 90 ? 'danger' : rate >= 70 ? 'gold' : 'success'
}
</script>

<template>
  <div class="dp">
    <PageHeader title="任务派发" breadcrumb="首页 / 风险管理 / 任务派发">
      <template #actions>
        <span v-if="filters.status.value === 'ready'" class="dp__upd num">
          数据更新 {{ filters.data.value!.updatedAt }}
        </span>
        <button type="button" class="btn">派发规则</button>
      </template>
    </PageHeader>

    <div class="dp__body">
      <StateBlock :status="board.status.value" :error="board.error.value" @retry="board.load()">
        <template v-if="board.data.value">
          <div class="dp__kpis">
            <MetricCard
              v-for="k in board.data.value.kpis"
              :key="k.label"
              :label="k.label"
              :value="k.value"
              :unit="k.unit"
              :accent="k.accent"
              variant="card"
            />
          </div>
        </template>
      </StateBlock>

      <div class="dp__main">
        <!-- 左:待派发列表 -->
        <div class="dp__left">
          <FilterBar>
            <FilterField label="纳税人名称 / 线索编号">
              <BaseInput v-model="keyword" placeholder="请输入关键字" width="200px" @enter="search" />
            </FilterField>
            <FilterField label="所属区县">
              <BaseSelect
                v-model="districtCode"
                :options="filters.data.value ? filters.data.value.districts : []"
                width="140px"
                @update:model-value="search"
              />
            </FilterField>
            <FilterField label="风险等级">
              <BaseSelect
                v-model="riskLevel"
                :options="filters.data.value ? filters.data.value.riskLevels : []"
                width="120px"
                @update:model-value="search"
              />
            </FilterField>
            <div class="dp__actions">
              <button type="button" class="btn btn--primary" @click="search">查询</button>
              <button type="button" class="btn" @click="reset">重置</button>
            </div>
          </FilterBar>

          <div class="dp__list">
            <div class="dp__toolbar">
              <span class="dp__toolbar-title">待派发线索</span>
              <span class="dp__toolbar-total num">共 {{ total }} 条</span>
              <span v-if="hasSelection" class="dp__toolbar-sel num">已选 {{ selectedKeys.length }} 项</span>
              <div class="dp__toolbar-actions">
                <BaseSelect
                  v-model="assignee"
                  :options="filters.data.value ? filters.data.value.assignees : []"
                  width="170px"
                />
                <button
                  type="button"
                  class="btn"
                  :class="{ 'btn--primary': hasSelection }"
                  :disabled="!hasSelection"
                  @click="askBatch"
                >
                  批量派发
                </button>
              </div>
            </div>

            <StateBlock
              v-if="list.status.value === 'empty' || list.status.value === 'error'"
              :status="list.status.value"
              :error="list.error.value"
              empty-text="暂无待派发线索"
              empty-hint="可尝试放宽筛选条件"
              @retry="list.load()"
            />
            <DataTable
              v-else
              :columns="columns"
              :rows="rows"
              :row-key="rowKey"
              density="compact"
              selectable
              :selected-keys="selectedKeys"
              :loading="list.status.value === 'loading' || list.status.value === 'idle'"
              :skeleton-rows="12"
              @update:selected-keys="selectedKeys = $event"
            >
              <template #cell-id="{ row }">
                <span class="dp__id">{{ row.id }}</span>
              </template>
              <template #cell-riskLevel="{ row }">
                <BaseBadge :tone="RISK_TONE[row.riskLevel]">{{ RISK_LABEL[row.riskLevel] }}</BaseBadge>
              </template>
              <template #cell-estimatedTax="{ row }">{{ row.estimatedTax.toFixed(2) }}万</template>
              <template #cell-actions="{ row }">
                <span class="dp__link" @click.stop="askDispatch(row)">派发</span>
              </template>
            </DataTable>

            <Pagination
              :total="total"
              :page="page"
              :page-size="pageSize"
              @update:page="onPageChange"
              @update:page-size="onPageSizeChange"
            />
          </div>
        </div>

        <!-- 右:人员负荷 -->
        <PanelCard title="核查人员负荷" subtitle="在办 / 上限" class="dp__side">
          <StateBlock :status="board.status.value" :error="board.error.value" @retry="board.load()">
            <div v-if="board.data.value" class="loads">
              <div v-for="w in board.data.value.workloads" :key="w.name" class="load">
                <div class="load__head">
                  <span class="load__name">{{ w.name }}</span>
                  <span class="load__dept">{{ w.dept }}</span>
                  <span class="num load__rate" :class="`tone-${loadTone(w.loadRate)}`">{{ w.loadRate }}%</span>
                </div>
                <div class="load__track">
                  <div class="load__fill" :class="`tone-${loadTone(w.loadRate)}`" :style="{ width: Math.min(100, w.loadRate) + '%' }"></div>
                </div>
                <div class="load__meta num">在办 {{ w.processing }} / 上限 {{ w.capacity }} · 本月办结 {{ w.done }}</div>
              </div>
            </div>
          </StateBlock>
        </PanelCard>
      </div>
    </div>

    <ConfirmModal
      :open="dispatchOpen"
      :title="dispatchTitle"
      :message="`将派发至「${assigneeLabel}」。派发后线索进入核查处置流程,承办人可在核查处置工作台办理。`"
      confirm-text="确认派发"
      @confirm="confirmDispatch"
      @cancel="dispatchOpen = false"
    />
    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.dp {
  --dp-min-h: 940px;
  height: 100%;
  min-height: var(--dp-min-h);
  display: flex;
  flex-direction: column;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.dp__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  white-space: nowrap;
  margin-right: 6px;
}
.dp__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: var(--space-4) 20px;
  gap: var(--space-4);
}
.dp__kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}
.dp__main {
  flex: 1;
  display: flex;
  gap: var(--space-4);
  min-height: 0;
}
.dp__left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-height: 0;
}
.dp__side {
  width: 300px;
  flex: none;
}
.dp__actions {
  margin-left: auto;
  display: flex;
  gap: var(--space-2);
}
.dp__actions .btn {
  height: 32px;
}
.dp__list {
  flex: 1;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.dp__toolbar {
  height: 46px;
  flex: none;
  border-bottom: var(--border-line);
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: var(--space-3);
}
.dp__toolbar-title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.dp__toolbar-total {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.dp__toolbar-sel {
  font-size: var(--fs-label);
  color: var(--color-primary);
  background: var(--color-primary-tint);
  padding: 3px 10px;
  border-radius: var(--radius-control);
}
.dp__toolbar-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.dp__toolbar-actions .btn {
  height: 32px;
  padding: 0 14px;
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.dp__id {
  color: var(--color-primary);
  font-weight: var(--fw-medium);
}
.dp__link {
  color: var(--color-primary);
  cursor: pointer;
}
.dp__link:hover {
  text-decoration: underline;
}

/* 人员负荷 */
.loads {
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: auto;
  min-height: 0;
}
.load__head {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}
.load__name {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.load__dept {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.load__rate {
  margin-left: auto;
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
}
.load__track {
  height: 8px;
  background: var(--color-neutral-200);
  border-radius: 1px;
  margin-top: 5px;
}
.load__fill {
  height: 8px;
  border-radius: 1px;
  background: var(--tone-main);
}
.load__meta {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  margin-top: 4px;
}
</style>

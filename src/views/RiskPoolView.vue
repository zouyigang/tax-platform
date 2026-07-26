<script setup lang="ts">
/**
 * 风险线索池(《需求文档》7.1)
 * 由设计稿「风险线索工作台」拆分而来的「列表 + 筛选」半;
 * 点击行进入独立整页「核查处置工作台」(/clues/:id),不再用抽屉。
 * 取数经 @/api/client;筛选条件写入 URL query,可分享 / 可回退。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { ClueQuery, ClueRow, ClueStatus, RiskLevel } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FilterBar from '@/components/common/FilterBar.vue'
import FilterField from '@/components/common/FilterField.vue'
import FilterChip from '@/components/common/FilterChip.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import DataTable from '@/components/common/DataTable.vue'
import Pagination from '@/components/common/Pagination.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import Toast from '@/components/common/Toast.vue'
import type { TableColumn } from '@/components/common/table'
import { CLUE_STATUS_LABEL, CLUE_STATUS_TONE, RISK_LABEL, RISK_TONE } from '@/components/common/tone'

const route = useRoute()
const router = useRouter()

/* ---------------- 筛选状态(与 URL query 同步) ---------------- */
const keyword = ref('')
const districtCode = ref('all')
const categoryCode = ref('all')
const taxMin = ref('')
const taxMax = ref('')
const riskLevels = ref<RiskLevel[]>([])
const statuses = ref<ClueStatus[]>([])
const page = ref(1)
const pageSize = ref(20)

function readQuery() {
  const q = route.query
  keyword.value = typeof q.keyword === 'string' ? q.keyword : ''
  districtCode.value = typeof q.district === 'string' ? q.district : 'all'
  categoryCode.value = typeof q.category === 'string' ? q.category : 'all'
  taxMin.value = typeof q.taxMin === 'string' ? q.taxMin : ''
  taxMax.value = typeof q.taxMax === 'string' ? q.taxMax : ''
  riskLevels.value = typeof q.risk === 'string' && q.risk ? (q.risk.split(',') as RiskLevel[]) : []
  statuses.value = typeof q.status === 'string' && q.status ? (q.status.split(',') as ClueStatus[]) : []
  page.value = typeof q.page === 'string' ? Math.max(1, parseInt(q.page, 10) || 1) : 1
}

function writeQuery() {
  const q: Record<string, string> = {}
  if (keyword.value) q.keyword = keyword.value
  if (districtCode.value !== 'all') q.district = districtCode.value
  if (categoryCode.value !== 'all') q.category = categoryCode.value
  if (taxMin.value) q.taxMin = taxMin.value
  if (taxMax.value) q.taxMax = taxMax.value
  if (riskLevels.value.length) q.risk = riskLevels.value.join(',')
  if (statuses.value.length) q.status = statuses.value.join(',')
  if (page.value > 1) q.page = String(page.value)
  router.replace({ query: q })
}

const query = computed<ClueQuery>(() => ({
  keyword: keyword.value,
  districtCode: districtCode.value,
  categoryCode: categoryCode.value,
  taxMin: taxMin.value === '' ? null : Number(taxMin.value),
  taxMax: taxMax.value === '' ? null : Number(taxMax.value),
  riskLevels: riskLevels.value,
  statuses: statuses.value,
  page: page.value,
  pageSize: pageSize.value,
}))

/* ---------------- 数据资源 ---------------- */
const filters = useResource(() => api.clues.getClueFilters())
const list = useResource(() => api.clues.getClues(query.value), { isEmpty: (d) => d.items.length === 0 })

function reload() {
  writeQuery()
  list.load()
}

onMounted(() => {
  readQuery()
  filters.load()
  list.load()
})

/* ---------------- 筛选交互 ---------------- */
function search() {
  page.value = 1
  reload()
}
function reset() {
  keyword.value = ''
  districtCode.value = 'all'
  categoryCode.value = 'all'
  taxMin.value = ''
  taxMax.value = ''
  riskLevels.value = []
  statuses.value = []
  page.value = 1
  reload()
}
function toggleRisk(level: RiskLevel) {
  const i = riskLevels.value.indexOf(level)
  if (i >= 0) riskLevels.value.splice(i, 1)
  else riskLevels.value.push(level)
  search()
}
function toggleStatus(s: ClueStatus) {
  const i = statuses.value.indexOf(s)
  if (i >= 0) statuses.value.splice(i, 1)
  else statuses.value.push(s)
  search()
}
function onPageChange(p: number) {
  page.value = p
  reload()
}
function onPageSizeChange(size: number) {
  pageSize.value = size
  page.value = 1
  reload()
}

/* ---------------- 选择 / 跳转 / 派发 ---------------- */
const selectedKeys = ref<string[]>([])
const hasSelection = computed(() => selectedKeys.value.length > 0)

/** 进入核查处置工作台整页 */
function openWorkbench(row: ClueRow) {
  router.push({ path: '/clues', query: { taskId: row.id } })
}

/** 纳税人名称 → 该户一户式档案(与整行点击的目的地不同,故需阻止冒泡) */
function openArchive(row: ClueRow) {
  router.push(`/archive?taxpayerId=${encodeURIComponent(row.taxId)}`)
}

/* 派发确认(《交互说明》4.3) */
const dispatchOpen = ref(false)
const dispatchRow = ref<ClueRow | null>(null)
const dispatchBatch = ref(false)
const toastVisible = ref(false)
const toastText = ref('')

function askDispatch(row: ClueRow) {
  dispatchRow.value = row
  dispatchBatch.value = false
  dispatchOpen.value = true
}
function askBatchDispatch() {
  if (!hasSelection.value) return
  dispatchBatch.value = true
  dispatchOpen.value = true
}
function confirmDispatch() {
  dispatchOpen.value = false
  toastText.value = dispatchBatch.value
    ? `已派发 ${selectedKeys.value.length} 条线索`
    : `线索 ${dispatchRow.value ? dispatchRow.value.id : ''} 已派发`
  toastVisible.value = true
  if (dispatchBatch.value) selectedKeys.value = []
}
const dispatchTitle = computed(() =>
  dispatchBatch.value ? `确认派发选中的 ${selectedKeys.value.length} 条线索?` : '确认派发该线索?',
)

/* ---------------- 表格列 ---------------- */
const columns: TableColumn[] = [
  { key: 'id', label: '线索编号', width: '132px', numeric: true },
  { key: 'taxpayerName', label: '纳税人名称', ellipsis: true },
  { key: 'riskLevel', label: '风险等级', width: '88px' },
  { key: 'hitRuleCount', label: '命中规则', width: '82px', align: 'center', numeric: true },
  { key: 'estimatedTax', label: '预估税款(万)', width: '112px', align: 'right', numeric: true },
  { key: 'createdDate', label: '生成日期', width: '106px', numeric: true },
  { key: 'status', label: '处置状态', width: '96px' },
  { key: 'actions', label: '操作', width: '120px' },
]

const clueRowKey = (r: ClueRow) => r.id
const rows = computed(() => (list.data.value ? list.data.value.items : []))
const total = computed(() => (list.data.value ? list.data.value.total : 0))
</script>

<template>
  <div class="pool">
    <PageHeader title="风险线索池" breadcrumb="首页 / 风险管理 / 风险线索池">
      <template #actions>
        <span v-if="filters.status.value === 'ready'" class="pool__updated num">
          数据更新 {{ filters.data.value!.updatedAt }}
        </span>
        <span class="pool__avatar">李</span>
      </template>
    </PageHeader>

    <div class="pool__body">
      <FilterBar>
        <FilterField label="纳税人名称 / 识别号">
          <BaseInput v-model="keyword" placeholder="请输入关键字" width="220px" @enter="search" />
        </FilterField>
        <FilterField label="所属区县">
          <BaseSelect
            v-model="districtCode"
            :options="filters.data.value ? filters.data.value.districts : []"
            width="150px"
            @update:model-value="search"
          />
        </FilterField>
        <FilterField label="规则类别">
          <BaseSelect
            v-model="categoryCode"
            :options="filters.data.value ? filters.data.value.categories : []"
            width="150px"
            @update:model-value="search"
          />
        </FilterField>
        <FilterField label="预估税款(万元)">
          <BaseInput v-model="taxMin" placeholder="最小" numeric width="88px" @enter="search" />
          <span class="pool__range-sep">—</span>
          <BaseInput v-model="taxMax" placeholder="最大" numeric width="88px" @enter="search" />
        </FilterField>
        <div class="pool__actions">
          <button type="button" class="btn btn--primary" @click="search">查询</button>
          <button type="button" class="btn" @click="reset">重置</button>
        </div>

        <template #chips>
          <div class="pool__chip-group">
            <span class="pool__chip-label">风险等级</span>
            <FilterChip
              v-for="r in filters.data.value ? filters.data.value.riskLevels : []"
              :key="r.value"
              :active="riskLevels.indexOf(r.value as RiskLevel) >= 0"
              :dot-tone="RISK_TONE[r.value as RiskLevel]"
              :count="r.count"
              @toggle="toggleRisk(r.value as RiskLevel)"
            >
              {{ r.label }}
            </FilterChip>
          </div>
          <div class="pool__chip-divider"></div>
          <div class="pool__chip-group">
            <span class="pool__chip-label">任务状态</span>
            <FilterChip
              v-for="s in filters.data.value ? filters.data.value.statuses : []"
              :key="s.value"
              :active="statuses.indexOf(s.value as ClueStatus) >= 0"
              @toggle="toggleStatus(s.value as ClueStatus)"
            >
              {{ s.label }}
            </FilterChip>
          </div>
        </template>
      </FilterBar>

      <div class="pool__list">
        <div class="pool__toolbar">
          <span class="pool__toolbar-title">线索列表</span>
          <span class="pool__toolbar-total num">共 {{ total }} 条</span>
          <span v-if="hasSelection" class="pool__toolbar-sel num">已选 {{ selectedKeys.length }} 项</span>
          <div class="pool__toolbar-actions">
            <button
              type="button"
              class="btn"
              :class="{ 'btn--primary': hasSelection }"
              :disabled="!hasSelection"
              @click="askBatchDispatch"
            >
              批量派发
            </button>
            <button type="button" class="btn" :disabled="!hasSelection">批量退回</button>
            <button type="button" class="btn">导出</button>
          </div>
        </div>

        <StateBlock
          v-if="list.status.value === 'empty' || list.status.value === 'error'"
          :status="list.status.value"
          :error="list.error.value"
          empty-text="未查询到符合条件的风险线索"
          empty-hint="可尝试放宽筛选条件"
          @retry="list.load()"
        />
        <DataTable
          v-else
          :columns="columns"
          :rows="rows"
          :row-key="clueRowKey"
          density="compact"
          selectable
          clickable
          :selected-keys="selectedKeys"
          :loading="list.status.value === 'loading' || list.status.value === 'idle'"
          :skeleton-rows="15"
          @update:selected-keys="selectedKeys = $event"
          @row-click="openWorkbench"
        >
          <template #cell-id="{ row }">
            <span class="pool__id">{{ row.id }}</span>
          </template>
          <template #cell-taxpayerName="{ row }">
            <span class="pool__tp" title="查看该户一户式档案" @click.stop="openArchive(row)">
              {{ row.taxpayerName }}
            </span>
          </template>
          <template #cell-riskLevel="{ row }">
            <BaseBadge :tone="RISK_TONE[row.riskLevel]">{{ RISK_LABEL[row.riskLevel] }}</BaseBadge>
          </template>
          <template #cell-estimatedTax="{ row }">{{ row.estimatedTax.toFixed(2) }}万</template>
          <template #cell-status="{ row }">
            <BaseBadge :tone="CLUE_STATUS_TONE[row.status]" variant="dot">
              {{ CLUE_STATUS_LABEL[row.status] }}
            </BaseBadge>
          </template>
          <template #cell-actions="{ row }">
            <span class="pool__link" @click.stop="askDispatch(row)">派发</span>
            <span class="pool__link pool__link--sub" @click.stop="openWorkbench(row)">核查</span>
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

    <ConfirmModal
      :open="dispatchOpen"
      :title="dispatchTitle"
      message="派发后线索将进入核查处置流程,分派至主管税务所核查人员。"
      confirm-text="确认派发"
      @confirm="confirmDispatch"
      @cancel="dispatchOpen = false"
    />
    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.pool {
  --pool-min-h: 940px;
  height: 100%;
  min-height: var(--pool-min-h);
  display: flex;
  flex-direction: column;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.pool__updated {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.pool__avatar {
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: 50%;
  background: var(--color-primary-tint);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--fw-semibold);
  font-size: var(--fs-label);
}
.pool__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: var(--space-4) 20px;
  gap: var(--space-4);
}
.pool__range-sep {
  color: var(--color-neutral-500);
}
.pool__actions {
  margin-left: auto;
  display: flex;
  gap: var(--space-2);
}
.pool__actions .btn {
  height: 32px;
}
.pool__chip-group {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pool__chip-label {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  flex: none;
}
.pool__chip-divider {
  width: 1px;
  height: 20px;
  background: var(--color-neutral-200);
}
.pool__list {
  flex: 1;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.pool__toolbar {
  height: 46px;
  flex: none;
  border-bottom: var(--border-line);
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: var(--space-3);
}
.pool__toolbar-title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.pool__toolbar-total {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.pool__toolbar-sel {
  font-size: var(--fs-label);
  color: var(--color-primary);
  background: var(--color-primary-tint);
  padding: 3px 10px;
  border-radius: var(--radius-control);
}
.pool__toolbar-actions {
  margin-left: auto;
  display: flex;
  gap: var(--space-2);
}
.pool__toolbar-actions .btn {
  height: 32px;
  padding: 0 14px;
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.pool__id {
  color: var(--color-primary);
  font-weight: var(--fw-medium);
}
/* 纳税人名称可点:跳该户档案 */
.pool__tp {
  cursor: pointer;
}
.pool__tp:hover {
  color: var(--color-primary);
  text-decoration: underline;
}
.pool__link {
  color: var(--color-primary);
  cursor: pointer;
  margin-right: var(--space-3);
}
.pool__link--sub {
  color: var(--color-neutral-700);
  margin-right: 0;
}
.pool__link:hover {
  text-decoration: underline;
}
</style>

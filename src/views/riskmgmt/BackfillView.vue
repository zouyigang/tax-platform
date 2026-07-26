<script setup lang="ts">
/**
 * 风险管理 · 结果回填(《需求文档》7.4)
 * 无设计稿;回填「工作队列」视角:KPI + 状态芯片 + 任务列表(逾期高亮),
 * 点击行右滑抽屉直接回填 —— 表单复用核查处置工作台的 DisposalForm(同一套 7.4 校验)。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { BackfillQuery, BackfillRow } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FilterBar from '@/components/common/FilterBar.vue'
import FilterField from '@/components/common/FilterField.vue'
import FilterChip from '@/components/common/FilterChip.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import DataTable from '@/components/common/DataTable.vue'
import Pagination from '@/components/common/Pagination.vue'
import SideDrawer from '@/components/common/SideDrawer.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import Toast from '@/components/common/Toast.vue'
import DisposalForm from '@/components/clues/DisposalForm.vue'
import type { TableColumn } from '@/components/common/table'
import {
  BACKFILL_STATUS_LABEL,
  BACKFILL_STATUS_TONE,
  RISK_LABEL,
  RISK_TONE,
} from '@/components/common/tone'

const router = useRouter()

const keyword = ref('')
const status = ref('all')
const page = ref(1)
const pageSize = ref(20)

const filters = useResource(() => api.riskmgmt.getBackfillFilters())
const query = computed<BackfillQuery>(() => ({
  keyword: keyword.value,
  status: status.value,
  page: page.value,
  pageSize: pageSize.value,
}))
const list = useResource(() => api.riskmgmt.getBackfillList(query.value), {
  isEmpty: (d) => d.items.length === 0,
})
/** 回填表单选项(与核查处置工作台同一接口) */
const options = useResource(() => api.clues.getClueDisposalOptions())

onMounted(() => {
  filters.load()
  list.load()
})

function search() {
  page.value = 1
  list.load()
}
function reset() {
  keyword.value = ''
  status.value = 'all'
  page.value = 1
  list.load()
}
function pickStatus(v: string) {
  status.value = status.value === v ? 'all' : v
  search()
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

/* 抽屉回填 */
const openRow = ref<BackfillRow | null>(null)
function openDrawer(row: BackfillRow) {
  openRow.value = row
  if (options.status.value === 'idle') options.load()
}
function closeDrawer() {
  openRow.value = null
}

const submitOpen = ref(false)
const toastVisible = ref(false)
const toastText = ref('')
const toastTone = ref<'success' | 'primary'>('success')
function toast(text: string, tone: 'success' | 'primary' = 'success') {
  toastText.value = text
  toastTone.value = tone
  toastVisible.value = true
}
function onFormSubmit() {
  // DisposalForm 内部已完成整表校验,通过才触发
  submitOpen.value = true
}
function confirmSubmit() {
  submitOpen.value = false
  toast(`任务 ${openRow.value ? openRow.value.id : ''} 回填已提交`)
  closeDrawer()
  list.load()
  filters.load()
}
function onSaveDraft() {
  toast('草稿已保存', 'primary')
}
/** 跳转到核查处置整页(查看风险点与时间线) */
function gotoWorkbench(row: BackfillRow) {
  router.push(`/clues/${row.clueId}`)
}

const columns: TableColumn[] = [
  { key: 'id', label: '任务编号', width: '124px', numeric: true },
  { key: 'clueId', label: '关联线索', width: '124px', numeric: true },
  { key: 'taxpayerName', label: '纳税人名称', ellipsis: true },
  { key: 'riskLevel', label: '风险等级', width: '88px' },
  { key: 'assignee', label: '承办人', width: '86px' },
  { key: 'dueDate', label: '回填期限', width: '106px', numeric: true },
  { key: 'daysLeft', label: '剩余', width: '92px', align: 'right', numeric: true },
  { key: 'status', label: '状态', width: '88px' },
  { key: 'actions', label: '操作', width: '110px' },
]
const rowKey = (r: BackfillRow) => r.id
const rows = computed(() => (list.data.value ? list.data.value.items : []))
const total = computed(() => (list.data.value ? list.data.value.total : 0))
</script>

<template>
  <div class="bf">
    <PageHeader title="结果回填" breadcrumb="首页 / 风险管理 / 结果回填">
      <template #actions>
        <span v-if="filters.status.value === 'ready'" class="bf__upd num">
          数据更新 {{ filters.data.value!.updatedAt }}
        </span>
        <button type="button" class="btn">导出台账</button>
      </template>
    </PageHeader>

    <div class="bf__body">
      <div v-if="filters.data.value" class="bf__kpis">
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
        <FilterField label="纳税人名称 / 任务编号 / 线索编号">
          <BaseInput v-model="keyword" placeholder="请输入关键字" width="240px" @enter="search" />
        </FilterField>
        <div class="bf__actions">
          <button type="button" class="btn btn--primary" @click="search">查询</button>
          <button type="button" class="btn" @click="reset">重置</button>
        </div>
        <template #chips>
          <div class="bf__chips">
            <span class="bf__chip-label">回填状态</span>
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
        </template>
      </FilterBar>

      <div class="bf__list">
        <div class="bf__toolbar">
          <span class="bf__toolbar-title">回填任务队列</span>
          <span class="bf__toolbar-total num">共 {{ total }} 条</span>
        </div>

        <StateBlock
          v-if="list.status.value === 'empty' || list.status.value === 'error'"
          :status="list.status.value"
          :error="list.error.value"
          empty-text="暂无回填任务"
          empty-hint="可尝试放宽筛选条件"
          @retry="list.load()"
        />
        <DataTable
          v-else
          :columns="columns"
          :rows="rows"
          :row-key="rowKey"
          density="compact"
          clickable
          :active-key="openRow ? openRow.id : ''"
          :loading="list.status.value === 'loading' || list.status.value === 'idle'"
          :skeleton-rows="12"
          @row-click="openDrawer"
        >
          <template #cell-id="{ row }">
            <span class="bf__id">{{ row.id }}</span>
          </template>
          <template #cell-clueId="{ row }">
            <span class="bf__link" @click.stop="gotoWorkbench(row)">{{ row.clueId }}</span>
          </template>
          <template #cell-riskLevel="{ row }">
            <BaseBadge :tone="RISK_TONE[row.riskLevel]">{{ RISK_LABEL[row.riskLevel] }}</BaseBadge>
          </template>
          <template #cell-daysLeft="{ row }">
            <span :class="row.daysLeft < 0 ? 'val-neg' : row.daysLeft <= 1 ? 'val-warn' : ''">
              {{ row.daysLeft < 0 ? `逾期 ${-row.daysLeft} 天` : `${row.daysLeft} 天` }}
            </span>
          </template>
          <template #cell-status="{ row }">
            <BaseBadge :tone="BACKFILL_STATUS_TONE[row.status]" variant="dot">
              {{ BACKFILL_STATUS_LABEL[row.status] }}
            </BaseBadge>
          </template>
          <template #cell-actions="{ row }">
            <span class="bf__link" @click.stop="openDrawer(row)">回填</span>
            <span class="bf__link bf__link--sub" @click.stop="gotoWorkbench(row)">查看线索</span>
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

      <!-- 回填抽屉:复用 7.4 结果回填表单 -->
      <SideDrawer :open="!!openRow" width="620px" @close="closeDrawer">
        <template #header>
          <div class="dh">
            <div class="dh__main">
              <div class="dh__line">
                <span class="dh__id num">{{ openRow ? openRow.id : '' }}</span>
                <BaseBadge v-if="openRow" :tone="RISK_TONE[openRow.riskLevel]">
                  {{ RISK_LABEL[openRow.riskLevel] }}
                </BaseBadge>
                <BaseBadge v-if="openRow" :tone="BACKFILL_STATUS_TONE[openRow.status]" variant="dot">
                  {{ BACKFILL_STATUS_LABEL[openRow.status] }}
                </BaseBadge>
              </div>
              <div v-if="openRow" class="dh__name">{{ openRow.taxpayerName }}</div>
              <div v-if="openRow" class="dh__meta num">
                关联线索 {{ openRow.clueId }} · 承办人 {{ openRow.assignee }} · 期限 {{ openRow.dueDate }}
              </div>
            </div>
            <span class="dh__close" @click="closeDrawer">✕</span>
          </div>
        </template>

        <StateBlock :status="options.status.value" :error="options.error.value" @retry="options.load()">
          <DisposalForm
            v-if="options.data.value"
            :options="options.data.value"
            @submit="onFormSubmit"
            @save-draft="onSaveDraft"
          />
        </StateBlock>
      </SideDrawer>
    </div>

    <ConfirmModal
      :open="submitOpen"
      title="确认提交回填结果?"
      message="提交后任务状态更新为「已提交」,进入复核环节,回填内容不可再修改。"
      confirm-text="确认提交"
      @confirm="confirmSubmit"
      @cancel="submitOpen = false"
    />
    <Toast :visible="toastVisible" :text="toastText" :tone="toastTone" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.bf {
  --bf-min-h: 940px;
  height: 100%;
  min-height: var(--bf-min-h);
  display: flex;
  flex-direction: column;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.bf__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  white-space: nowrap;
  margin-right: 6px;
}
.bf__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: var(--space-4) 20px;
  gap: var(--space-4);
  position: relative;
}
.bf__kpis {
  flex: none;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}
.bf__actions {
  margin-left: auto;
  display: flex;
  gap: var(--space-2);
}
.bf__actions .btn {
  height: 32px;
}
.bf__chips {
  display: flex;
  align-items: center;
  gap: 10px;
}
.bf__chip-label {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  flex: none;
}
.bf__list {
  flex: 1;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.bf__toolbar {
  height: 46px;
  flex: none;
  border-bottom: var(--border-line);
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: var(--space-3);
}
.bf__toolbar-title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.bf__toolbar-total {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.bf__id {
  color: var(--color-primary);
  font-weight: var(--fw-medium);
}
.bf__link {
  color: var(--color-primary);
  cursor: pointer;
  margin-right: var(--space-3);
}
.bf__link--sub {
  color: var(--color-neutral-700);
  margin-right: 0;
}
.bf__link:hover {
  text-decoration: underline;
}
.val-neg {
  color: var(--color-risk-high);
  font-weight: var(--fw-semibold);
}
.val-warn {
  color: var(--color-status-pending);
  font-weight: var(--fw-semibold);
}

/* 抽屉头 */
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
</style>

<script setup lang="ts">
/**
 * 风险管理 · 结果回填(《需求文档》7.4)
 * 定位调整:回填表单本质上是核查处置工作台的一个区域,不该在这里再实现一套入口。
 * 本页只做「待回填任务列表」—— 列出处置完成但结果尚未提交的任务并催办,
 * 点击某条跳到 /clues?taskId=xxx&tab=result,由工作台承载唯一的一份回填表单。
 * 此前本页虽然复用了 DisposalForm,但仍是第二个提交入口,状态与校验容易漂移。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { BackfillQuery, BackfillRow } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import MetricCard from '@/components/common/MetricCard.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import DataTable from '@/components/common/DataTable.vue'
import Pagination from '@/components/common/Pagination.vue'
import type { TableColumn } from '@/components/common/table'
import { BACKFILL_STATUS_LABEL, BACKFILL_STATUS_TONE, RISK_LABEL, RISK_TONE } from '@/components/common/tone'

const router = useRouter()

/* ---------------- 筛选 ---------------- */
/** 默认只看未回填的:本页的作用是催办,已提交的不该占版面 */
const status = ref('open')
const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)

const query = computed<BackfillQuery>(() => ({
  keyword: keyword.value,
  status: status.value,
  page: page.value,
  pageSize: pageSize.value,
}))

const filters = useResource(() => api.riskmgmt.getBackfillFilters())
const list = useResource(() => api.riskmgmt.getBackfillList(query.value), { isEmpty: (d) => d.items.length === 0 })

const ft = computed(() => filters.data.value)

onMounted(() => {
  filters.load()
  list.load()
})

function search() {
  page.value = 1
  list.load()
}
function pickStatus(v: string) {
  status.value = v
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

/** 跳到工作台的结果回填区办理 */
function openBackfill(row: BackfillRow) {
  router.push({ path: '/clues', query: { taskId: row.clueId, tab: 'result' } })
}

/* ---------------- 表格 ---------------- */
const columns: TableColumn[] = [
  { key: 'id', label: '任务编号', width: '124px', numeric: true },
  { key: 'clueId', label: '关联线索', width: '132px', numeric: true },
  { key: 'taxpayerName', label: '纳税人名称', ellipsis: true },
  { key: 'riskLevel', label: '风险等级', width: '88px' },
  { key: 'assignee', label: '承办人', width: '92px' },
  { key: 'dueDate', label: '回填期限', width: '110px', numeric: true },
  { key: 'daysLeft', label: '剩余时限', width: '114px' },
  { key: 'status', label: '回填状态', width: '96px' },
  { key: 'actions', label: '操作', width: '96px' },
]
const rowKey = (r: BackfillRow) => r.id
const rows = computed(() => (list.data.value ? list.data.value.items : []))
const total = computed(() => (list.data.value ? list.data.value.total : 0))

function limitTone(days: number) {
  return days < 0 ? 'danger' : days <= 2 ? 'warn' : 'neutral'
}
function limitText(days: number) {
  if (days < 0) return `已逾期 ${Math.abs(days)} 天`
  if (days === 0) return '今日到期'
  return `剩余 ${days} 天`
}
</script>

<template>
  <div class="bf">
    <PageHeader title="结果回填" breadcrumb="首页 / 风险管理 / 结果回填">
      <template #actions>
        <span v-if="ft" class="bf__upd num">数据更新 {{ ft.updatedAt }}</span>
      </template>
    </PageHeader>

    <div class="bf__body">
      <div v-if="ft" class="bf__kpis">
        <MetricCard
          v-for="k in ft.kpis"
          :key="k.label"
          :label="k.label"
          :value="k.value"
          :unit="k.unit"
          :accent="k.accent"
          variant="card"
        />
      </div>

      <div class="bf__list">
        <div class="bf__toolbar">
          <span
            v-for="s in ft ? ft.statuses : []"
            :key="s.value"
            class="chip"
            :class="{ 'chip--on': status === s.value }"
            @click="pickStatus(s.value)"
          >
            {{ s.label }}<b class="num">{{ s.count }}</b>
          </span>
          <div class="bf__toolbar-right">
            <BaseInput v-model="keyword" placeholder="纳税人 / 任务编号" width="200px" @enter="search" />
            <button type="button" class="btn btn--primary" @click="search">查询</button>
          </div>
        </div>

        <div class="bf__note">
          本页只列任务、不办理。回填表单在核查处置工作台内,点击任一任务将直接定位到该任务的结果回填区。
        </div>

        <StateBlock
          v-if="list.status.value === 'empty' || list.status.value === 'error'"
          :status="list.status.value"
          :error="list.error.value"
          empty-text="没有待回填的任务"
          empty-hint="可切换状态查看已提交的任务"
          @retry="list.load()"
        />
        <DataTable
          v-else
          :columns="columns"
          :rows="rows"
          :row-key="rowKey"
          density="compact"
          clickable
          :loading="list.status.value === 'loading' || list.status.value === 'idle'"
          :skeleton-rows="10"
          @row-click="openBackfill"
        >
          <template #cell-id="{ row }">
            <span class="bf__id">{{ row.id }}</span>
          </template>
          <template #cell-clueId="{ row }">
            <span class="bf__clue">{{ row.clueId }}</span>
          </template>
          <template #cell-riskLevel="{ row }">
            <BaseBadge :tone="RISK_TONE[row.riskLevel]">{{ RISK_LABEL[row.riskLevel] }}</BaseBadge>
          </template>
          <template #cell-daysLeft="{ row }">
            <span class="bf__limit" :class="`tone-${limitTone(row.daysLeft)}`">{{ limitText(row.daysLeft) }}</span>
          </template>
          <template #cell-status="{ row }">
            <BaseBadge :tone="BACKFILL_STATUS_TONE[row.status]" variant="dot">
              {{ BACKFILL_STATUS_LABEL[row.status] }}
            </BaseBadge>
          </template>
          <template #cell-actions="{ row }">
            <span class="bf__link" @click.stop="openBackfill(row)">
              {{ row.status === 'submitted' ? '查看结果' : '去回填' }}
            </span>
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
  </div>
</template>

<style scoped>
.bf {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.bf__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.bf__body {
  flex: 1;
  overflow: auto;
  min-height: 0;
  padding: var(--space-4) 20px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.bf__body > * {
  flex: none;
}
.bf__kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}
.bf__list {
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
}
.bf__toolbar {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) 18px;
  border-bottom: var(--border-line);
  flex-wrap: wrap;
}
.chip {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  font-size: var(--fs-label);
  color: var(--color-neutral-700);
  border: var(--border-line);
  border-radius: var(--radius-control);
  padding: 3px 12px;
  cursor: pointer;
}
.chip:hover {
  border-color: var(--color-primary);
}
.chip--on {
  background: var(--color-primary-tint);
  border-color: var(--color-primary);
  color: var(--color-primary-deep);
  font-weight: var(--fw-semibold);
}
.chip b {
  font-weight: var(--fw-semibold);
}
.bf__toolbar-right {
  margin-left: auto;
  display: flex;
  gap: var(--space-2);
}
.bf__toolbar-right .btn {
  height: 32px;
}
.bf__note {
  flex: none;
  padding: 7px 18px;
  background: var(--color-primary-tint);
  border-bottom: 1px solid var(--color-neutral-200);
  font-size: var(--fs-micro);
  color: var(--color-primary-deep);
}
.bf__id {
  color: var(--color-neutral-800);
}
.bf__clue {
  color: var(--color-primary);
}
.bf__limit {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--tone-text);
  background: var(--tone-tint);
  border-radius: var(--radius-control);
  padding: 1px 8px;
}
.bf__link {
  color: var(--color-primary);
  cursor: pointer;
}
.bf__link:hover {
  text-decoration: underline;
}
</style>

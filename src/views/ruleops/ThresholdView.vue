<script setup lang="ts">
/**
 * 规则库管理 · 阈值参数管理(《需求文档》3.1.4)
 * 无设计稿;跨规则「参数集中管理」视角:筛选 + 可编辑参数表(改动待保存高亮)
 * + 右侧变更记录审计栏。保存走二次确认。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '@/api/client'
import type { ThresholdQuery, ThresholdRow } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FilterBar from '@/components/common/FilterBar.vue'
import FilterField from '@/components/common/FilterField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import PanelCard from '@/components/common/PanelCard.vue'
import DataTable from '@/components/common/DataTable.vue'
import Pagination from '@/components/common/Pagination.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import Toast from '@/components/common/Toast.vue'
import type { TableColumn } from '@/components/common/table'

const keyword = ref('')
const industry = ref('all')
const page = ref(1)
const pageSize = ref(20)

const filters = useResource(() => api.ruleops.getThresholdFilters())
const query = computed<ThresholdQuery>(() => ({
  keyword: keyword.value,
  industry: industry.value,
  page: page.value,
  pageSize: pageSize.value,
}))
const list = useResource(() => api.ruleops.getThresholds(query.value), {
  isEmpty: (d) => d.items.length === 0,
})

/** 可编辑副本:id → 当前输入值;与原值不同即视为待保存 */
const edits = ref<Record<string, string>>({})
/** 原值快照,用于判断是否改动 */
const originals = ref<Record<string, string>>({})

watch(
  () => list.data.value,
  (d) => {
    if (!d) return
    const o: Record<string, string> = {}
    const e: Record<string, string> = {}
    d.items.forEach((r) => {
      o[r.id] = r.value
      // 保留用户已改但未保存的值
      e[r.id] = edits.value[r.id] !== undefined ? edits.value[r.id] : r.value
    })
    originals.value = o
    edits.value = e
  },
)

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
  industry.value = 'all'
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

/** 是否改动 */
function isDirty(id: string) {
  return edits.value[id] !== undefined && edits.value[id] !== originals.value[id]
}
const dirtyIds = computed(() => Object.keys(edits.value).filter((id) => isDirty(id)))
const dirtyCount = computed(() => dirtyIds.value.length)

/* 保存 */
const saveOpen = ref(false)
const toastVisible = ref(false)
const toastText = ref('')
function confirmSave() {
  saveOpen.value = false
  toastText.value = `已保存 ${dirtyCount.value} 项参数变更`
  toastVisible.value = true
  // 演示环境:保存后以新值作为原值
  dirtyIds.value.forEach((id) => {
    originals.value[id] = edits.value[id]
  })
  filters.load()
}
function discardAll() {
  Object.keys(originals.value).forEach((id) => {
    edits.value[id] = originals.value[id]
  })
}

const columns: TableColumn[] = [
  { key: 'ruleId', label: '规则编号', width: '112px', numeric: true },
  { key: 'ruleName', label: '规则名称', ellipsis: true },
  { key: 'paramName', label: '参数名', width: '96px' },
  { key: 'industry', label: '适用行业', width: '96px' },
  { key: 'scale', label: '纳税人规模', width: '104px' },
  { key: 'value', label: '当前取值', width: '150px' },
  { key: 'updatedAt', label: '最近修改', width: '104px', numeric: true },
  { key: 'updatedBy', label: '修改人', width: '86px' },
]
const rowKey = (r: ThresholdRow) => r.id
const rows = computed(() => (list.data.value ? list.data.value.items : []))
const total = computed(() => (list.data.value ? list.data.value.total : 0))
</script>

<template>
  <div class="th">
    <PageHeader title="阈值参数管理" breadcrumb="首页 / 规则库管理 / 阈值参数管理">
      <template #actions>
        <span v-if="filters.status.value === 'ready'" class="th__upd num">
          数据更新 {{ filters.data.value!.updatedAt }}
        </span>
        <button type="button" class="btn" :disabled="dirtyCount === 0" @click="discardAll">撤销改动</button>
        <button type="button" class="btn btn--primary" :disabled="dirtyCount === 0" @click="saveOpen = true">
          保存{{ dirtyCount > 0 ? ` (${dirtyCount})` : '' }}
        </button>
      </template>
    </PageHeader>

    <div class="th__body">
      <div class="th__main">
        <!-- 左:参数表 -->
        <div class="th__left">
          <FilterBar>
            <FilterField label="规则名称 / 参数名 / 规则编号">
              <BaseInput v-model="keyword" placeholder="请输入关键字" width="220px" @enter="search" />
            </FilterField>
            <FilterField label="适用行业">
              <BaseSelect
                v-model="industry"
                :options="filters.data.value ? filters.data.value.industries : []"
                width="140px"
                @update:model-value="search"
              />
            </FilterField>
            <div class="th__actions">
              <button type="button" class="btn btn--primary" @click="search">查询</button>
              <button type="button" class="btn" @click="reset">重置</button>
            </div>
          </FilterBar>

          <div class="th__list">
            <div class="th__toolbar">
              <span class="th__toolbar-title">阈值参数</span>
              <span class="th__toolbar-total num">共 {{ total }} 项</span>
              <span v-if="dirtyCount > 0" class="th__dirty num">{{ dirtyCount }} 项待保存</span>
            </div>

            <StateBlock
              v-if="list.status.value === 'empty' || list.status.value === 'error'"
              :status="list.status.value"
              :error="list.error.value"
              empty-text="未查询到符合条件的参数"
              empty-hint="可尝试放宽筛选条件"
              @retry="list.load()"
            />
            <DataTable
              v-else
              :columns="columns"
              :rows="rows"
              :row-key="rowKey"
              density="compact"
              :loading="list.status.value === 'loading' || list.status.value === 'idle'"
              :skeleton-rows="15"
            >
              <template #cell-ruleId="{ row }">
                <span class="th__rid">{{ row.ruleId }}</span>
              </template>
              <template #cell-value="{ row }">
                <div class="val" :class="{ 'val--dirty': isDirty(row.id) }">
                  <BaseInput v-model="edits[row.id]" numeric width="80px" />
                  <span class="val__unit">{{ row.unit }}</span>
                  <span v-if="isDirty(row.id)" class="num val__from">原 {{ originals[row.id] }}</span>
                </div>
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

        <!-- 右:变更记录 -->
        <PanelCard title="参数变更记录" subtitle="近期" class="th__side">
          <div v-if="filters.data.value" class="logs">
            <div v-for="(l, i) in filters.data.value.changeLogs" :key="i" class="log">
              <div class="log__head">
                <span class="log__rule">{{ l.ruleName }}</span>
                <span class="num log__time">{{ l.time }}</span>
              </div>
              <div class="log__change">
                <span class="log__param">{{ l.paramName }}</span>
                <span class="num log__from">{{ l.from }}</span>
                <span class="log__arrow">→</span>
                <span class="num log__to">{{ l.to }}</span>
              </div>
              <div class="log__reason">{{ l.reason }}</div>
              <div class="log__op">操作人 {{ l.operator }}</div>
            </div>
          </div>
        </PanelCard>
      </div>
    </div>

    <ConfirmModal
      :open="saveOpen"
      title="确认保存参数变更?"
      :message="`本次将保存 ${dirtyCount} 项阈值变更。保存后规则按新阈值执行,建议先在「规则试跑与灰度」验证影响面。`"
      confirm-text="确认保存"
      @confirm="confirmSave"
      @cancel="saveOpen = false"
    />
    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.th {
  --th-min-h: 940px;
  height: 100%;
  min-height: var(--th-min-h);
  display: flex;
  flex-direction: column;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.th__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  white-space: nowrap;
  margin-right: 6px;
}
.th__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: var(--space-4) 20px;
}
.th__main {
  flex: 1;
  display: flex;
  gap: var(--space-4);
  min-height: 0;
}
.th__left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-height: 0;
}
.th__side {
  width: 320px;
  flex: none;
}
.th__actions {
  margin-left: auto;
  display: flex;
  gap: var(--space-2);
}
.th__actions .btn {
  height: 32px;
}
.th__list {
  flex: 1;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.th__toolbar {
  height: 46px;
  flex: none;
  border-bottom: var(--border-line);
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: var(--space-3);
}
.th__toolbar-title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.th__toolbar-total {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.th__dirty {
  margin-left: auto;
  font-size: var(--fs-label);
  color: var(--color-status-pending-text);
  background: var(--color-status-pending-tint);
  padding: 3px 10px;
  border-radius: var(--radius-control);
}
.th__rid {
  color: var(--color-primary);
  font-weight: var(--fw-medium);
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* 取值单元格 */
.val {
  display: flex;
  align-items: center;
  gap: 6px;
}
.val__unit {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.val--dirty :deep(.input) {
  border-color: var(--color-status-pending);
  background: var(--color-status-pending-tint);
}
.val__from {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  text-decoration: line-through;
}

/* 变更记录 */
.logs {
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: auto;
  min-height: 0;
}
.log {
  border-left: 2px solid var(--color-neutral-300);
  padding-left: 12px;
}
.log__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}
.log__rule {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.log__time {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  white-space: nowrap;
  flex: none;
}
.log__change {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: var(--fs-label);
}
.log__param {
  color: var(--color-neutral-600);
}
.log__from {
  color: var(--color-neutral-500);
  text-decoration: line-through;
}
.log__arrow {
  color: var(--color-neutral-400);
}
.log__to {
  color: var(--color-primary);
  font-weight: var(--fw-semibold);
}
.log__reason {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  margin-top: 3px;
  line-height: 1.5;
}
.log__op {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  margin-top: 3px;
}
</style>

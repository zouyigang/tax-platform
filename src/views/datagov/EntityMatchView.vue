<script setup lang="ts">
/**
 * 数据治理 · 主体识别与匹配(《需求文档》2.3)
 * 无设计稿;布局参照「风险线索池」列表范式:筛选栏 + 列表 + 右滑详情抽屉。
 * 抽屉内展示多源标识归并、匹配依据与字段冲突。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { EntityMatchQuery, EntityMatchRow } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FilterBar from '@/components/common/FilterBar.vue'
import FilterField from '@/components/common/FilterField.vue'
import FilterChip from '@/components/common/FilterChip.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import DataTable from '@/components/common/DataTable.vue'
import Pagination from '@/components/common/Pagination.vue'
import SideDrawer from '@/components/common/SideDrawer.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import Toast from '@/components/common/Toast.vue'
import type { TableColumn } from '@/components/common/table'
import { MATCH_STATUS_LABEL, MATCH_STATUS_TONE } from '@/components/common/tone'

const route = useRoute()
const router = useRouter()

const keyword = ref('')
const status = ref('all')
const page = ref(1)
const pageSize = ref(20)

function readQuery() {
  const q = route.query
  keyword.value = typeof q.keyword === 'string' ? q.keyword : ''
  status.value = typeof q.status === 'string' && q.status ? q.status : 'all'
  page.value = typeof q.page === 'string' ? Math.max(1, parseInt(q.page, 10) || 1) : 1
}
function writeQuery() {
  const q: Record<string, string> = {}
  if (keyword.value) q.keyword = keyword.value
  if (status.value !== 'all') q.status = status.value
  if (page.value > 1) q.page = String(page.value)
  router.replace({ query: q })
}

const query = computed<EntityMatchQuery>(() => ({
  keyword: keyword.value,
  status: status.value,
  page: page.value,
  pageSize: pageSize.value,
}))

const filters = useResource(() => api.datagov.getEntityMatchFilters())
const list = useResource(() => api.datagov.getEntityMatches(query.value), {
  isEmpty: (d) => d.items.length === 0,
})

function reload() {
  writeQuery()
  list.load()
}
onMounted(() => {
  readQuery()
  filters.load()
  list.load()
})

function search() {
  page.value = 1
  reload()
}
function reset() {
  keyword.value = ''
  status.value = 'all'
  page.value = 1
  reload()
}
function pickStatus(v: string) {
  status.value = status.value === v ? 'all' : v
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

/* 抽屉 */
const openId = ref('')
const detail = useResource(() => api.datagov.getEntityMatchDetail(openId.value))
function openDrawer(row: EntityMatchRow) {
  openId.value = row.id
  detail.load()
}
function closeDrawer() {
  openId.value = ''
}

/* 确认 + 反馈 */
const confirmOpen = ref(false)
const toastVisible = ref(false)
const toastText = ref('')
function confirmMerge() {
  confirmOpen.value = false
  toastText.value = `主体 ${openId.value} 已确认归并`
  toastVisible.value = true
}

const columns: TableColumn[] = [
  { key: 'id', label: '归并编号', width: '128px', numeric: true },
  { key: 'name', label: '主体名称', ellipsis: true },
  { key: 'taxId', label: '纳税人识别号', width: '140px', numeric: true },
  { key: 'sourceCount', label: '涉及数据源', width: '96px', align: 'center', numeric: true },
  { key: 'identifierCount', label: '关联标识', width: '86px', align: 'center', numeric: true },
  { key: 'confidence', label: '置信度', width: '150px' },
  { key: 'status', label: '匹配状态', width: '96px' },
  { key: 'updatedAt', label: '更新时间', width: '136px', numeric: true },
  { key: 'actions', label: '操作', width: '72px' },
]
const rowKey = (r: EntityMatchRow) => r.id
const rows = computed(() => (list.data.value ? list.data.value.items : []))
const total = computed(() => (list.data.value ? list.data.value.total : 0))
/** 置信度取色:≥90 优 / ≥75 中 / 其余低 */
function confTone(c: number) {
  return c >= 90 ? 'success' : c >= 75 ? 'gold' : 'danger'
}
</script>

<template>
  <div class="em">
    <PageHeader title="主体识别与匹配" breadcrumb="首页 / 数据治理 / 主体识别与匹配">
      <template #actions>
        <span v-if="filters.status.value === 'ready'" class="em__upd num">
          数据更新 {{ filters.data.value!.updatedAt }}
        </span>
        <button type="button" class="btn">匹配规则</button>
        <button type="button" class="btn btn--primary">重新识别</button>
      </template>
    </PageHeader>

    <div class="em__body">
      <FilterBar>
        <FilterField label="主体名称 / 识别号 / 编号">
          <BaseInput v-model="keyword" placeholder="请输入关键字" width="240px" @enter="search" />
        </FilterField>
        <div class="em__actions">
          <button type="button" class="btn btn--primary" @click="search">查询</button>
          <button type="button" class="btn" @click="reset">重置</button>
        </div>
        <template #chips>
          <div class="em__chips">
            <span class="em__chip-label">匹配状态</span>
            <FilterChip
              v-for="s in filters.data.value ? filters.data.value.statuses : []"
              :key="s.value"
              :active="status === s.value || (s.value === 'all' && status === 'all')"
              :count="s.count"
              @toggle="pickStatus(s.value)"
            >
              {{ s.label }}
            </FilterChip>
          </div>
        </template>
      </FilterBar>

      <div class="em__list">
        <div class="em__toolbar">
          <span class="em__toolbar-title">归并主体列表</span>
          <span class="em__toolbar-total num">共 {{ total }} 条</span>
          <div class="em__toolbar-actions">
            <button type="button" class="btn">导出</button>
          </div>
        </div>

        <StateBlock
          v-if="list.status.value === 'empty' || list.status.value === 'error'"
          :status="list.status.value"
          :error="list.error.value"
          empty-text="未查询到符合条件的归并主体"
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
          :active-key="openId"
          :loading="list.status.value === 'loading' || list.status.value === 'idle'"
          :skeleton-rows="15"
          @row-click="openDrawer"
        >
          <template #cell-id="{ row }">
            <span class="em__id">{{ row.id }}</span>
          </template>
          <template #cell-confidence="{ row }">
            <div class="conf">
              <div class="conf__track">
                <div class="conf__fill" :class="`tone-${confTone(row.confidence)}`" :style="{ width: row.confidence + '%' }"></div>
              </div>
              <span class="num conf__pct">{{ row.confidence.toFixed(1) }}%</span>
            </div>
          </template>
          <template #cell-status="{ row }">
            <BaseBadge :tone="MATCH_STATUS_TONE[row.status]" variant="dot">
              {{ MATCH_STATUS_LABEL[row.status] }}
            </BaseBadge>
          </template>
          <template #cell-actions="{ row }">
            <span class="em__link" @click.stop="openDrawer(row)">详情</span>
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

      <!-- 详情抽屉 -->
      <SideDrawer :open="!!openId" width="560px" @close="closeDrawer">
        <template #header>
          <div class="dh">
            <div class="dh__main">
              <div class="dh__line">
                <span v-if="detail.data.value" class="dh__id num">{{ detail.data.value.id }}</span>
                <span v-else class="skeleton dh__skel"></span>
                <BaseBadge v-if="detail.data.value" :tone="MATCH_STATUS_TONE[detail.data.value.status]" variant="dot">
                  {{ MATCH_STATUS_LABEL[detail.data.value.status] }}
                </BaseBadge>
              </div>
              <div v-if="detail.data.value" class="dh__name">{{ detail.data.value.name }}</div>
              <div v-if="detail.data.value" class="dh__meta num">
                识别号 {{ detail.data.value.taxId }} · 置信度 {{ detail.data.value.confidence.toFixed(1) }}%
              </div>
            </div>
            <span class="dh__close" @click="closeDrawer">✕</span>
          </div>
        </template>

        <StateBlock :status="detail.status.value" :error="detail.error.value" @retry="detail.load()">
          <template v-if="detail.data.value">
            <section class="sec">
              <div class="sec__title">匹配依据</div>
              <ul class="basis">
                <li v-for="(b, i) in detail.data.value.basis" :key="i" class="basis__item">
                  <span class="basis__mark">▹</span>{{ b }}
                </li>
              </ul>
            </section>

            <section class="sec">
              <div class="sec__title">各来源标识({{ detail.data.value.identifiers.length }})</div>
              <div class="ids">
                <div v-for="(d, i) in detail.data.value.identifiers" :key="i" class="idrow">
                  <div class="idrow__head">
                    <span class="idrow__source">{{ d.source }}</span>
                    <BaseBadge :tone="d.merged ? 'success' : 'warn'" variant="soft">
                      {{ d.merged ? '已归并' : '待归并' }}
                    </BaseBadge>
                  </div>
                  <div class="idrow__body">
                    <div class="idrow__kv"><span class="idrow__k">{{ d.idType }}</span><span class="num idrow__v">{{ d.idValue }}</span></div>
                    <div class="idrow__kv"><span class="idrow__k">登记名称</span><span class="idrow__v">{{ d.name }}</span></div>
                  </div>
                </div>
              </div>
            </section>

            <section v-if="detail.data.value.conflicts.length" class="sec">
              <div class="sec__title sec__title--danger">
                字段冲突({{ detail.data.value.conflicts.length }})· 需人工确认
              </div>
              <div class="conflicts">
                <div v-for="(c, i) in detail.data.value.conflicts" :key="i" class="conflict">
                  <div class="conflict__field">{{ c.field }}</div>
                  <div class="conflict__cmp">
                    <div class="conflict__cell">
                      <div class="conflict__label">主档值</div>
                      <div class="conflict__value">{{ c.masterValue }}</div>
                    </div>
                    <div class="conflict__cell conflict__cell--alert">
                      <div class="conflict__label">{{ c.source }}</div>
                      <div class="conflict__value conflict__value--alert">{{ c.sourceValue }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </template>
        </StateBlock>

        <template #footer>
          <button type="button" class="btn">排除该主体</button>
          <button type="button" class="btn btn--primary" @click="confirmOpen = true">确认归并</button>
        </template>
      </SideDrawer>
    </div>

    <ConfirmModal
      :open="confirmOpen"
      title="确认归并该主体?"
      message="归并后各来源标识将统一挂接到同一主档,后续风险分析以该主档为准。"
      confirm-text="确认归并"
      @confirm="confirmMerge"
      @cancel="confirmOpen = false"
    />
    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.em {
  --em-min-h: 940px;
  height: 100%;
  min-height: var(--em-min-h);
  display: flex;
  flex-direction: column;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.em__upd {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
  white-space: nowrap;
  margin-right: 6px;
}
.em__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: var(--space-4) 20px;
  gap: var(--space-4);
  position: relative;
}
.em__actions {
  margin-left: auto;
  display: flex;
  gap: var(--space-2);
}
.em__actions .btn {
  height: 32px;
}
.em__chips {
  display: flex;
  align-items: center;
  gap: 10px;
}
.em__chip-label {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  flex: none;
}

.em__list {
  flex: 1;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.em__toolbar {
  height: 46px;
  flex: none;
  border-bottom: var(--border-line);
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: var(--space-3);
}
.em__toolbar-title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.em__toolbar-total {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.em__toolbar-actions {
  margin-left: auto;
}
.em__toolbar-actions .btn {
  height: 32px;
  padding: 0 14px;
}
.em__id {
  color: var(--color-primary);
  font-weight: var(--fw-medium);
}
.em__link {
  color: var(--color-primary);
  cursor: pointer;
}
.em__link:hover {
  text-decoration: underline;
}

/* 置信度条 */
.conf {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.conf__track {
  flex: 1;
  height: 8px;
  background: var(--color-neutral-200);
  border-radius: 1px;
  min-width: 0;
}
.conf__fill {
  height: 8px;
  border-radius: 1px;
  background: var(--tone-main);
}
.conf__pct {
  width: 48px;
  text-align: right;
  flex: none;
  font-weight: var(--fw-medium);
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
.dh__skel {
  display: block;
  height: 14px;
  width: 110px;
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

/* 抽屉内容 */
.sec {
  margin-bottom: 18px;
}
.sec__title {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-600);
  margin-bottom: var(--space-2);
}
.sec__title--danger {
  color: var(--color-risk-high-text);
}
.basis {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.basis__item {
  display: flex;
  gap: var(--space-2);
  font-size: var(--fs-aux);
  color: var(--color-neutral-800);
}
.basis__mark {
  color: var(--color-primary);
  flex: none;
}

.ids {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.idrow {
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  background: var(--color-panel);
}
.idrow__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: 8px 14px;
  border-bottom: 1px solid var(--color-neutral-200);
}
.idrow__source {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.idrow__body {
  padding: 8px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.idrow__kv {
  display: flex;
  gap: var(--space-3);
  font-size: var(--fs-label);
}
.idrow__k {
  width: 116px;
  flex: none;
  color: var(--color-neutral-600);
}
.idrow__v {
  color: var(--color-neutral-900);
}

.conflicts {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.conflict {
  border: 1px solid var(--color-neutral-200);
  border-left: 3px solid var(--color-risk-high);
  border-radius: var(--radius-control);
  overflow: hidden;
}
.conflict__field {
  padding: 8px 14px;
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  border-bottom: 1px solid var(--color-neutral-200);
}
.conflict__cmp {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: var(--color-neutral-200);
}
.conflict__cell {
  background: var(--color-panel);
  padding: 8px 14px;
}
.conflict__cell--alert {
  background: var(--color-risk-high-tint);
}
.conflict__label {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  margin-bottom: 2px;
}
.conflict__value {
  font-size: var(--fs-aux);
}
.conflict__value--alert {
  color: var(--color-risk-high-text);
  font-weight: var(--fw-semibold);
}
</style>

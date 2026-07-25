<script setup lang="ts">
/**
 * 规则配置(规则库管理)
 * 布局范式:参照「风险线索池」——顶栏 + 筛选栏 + 列表 + 详情抽屉;
 * 增设左侧规则分类树。取数一律经 @/api/client;筛选条件写入 URL query。
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import type { RuleQuery, RuleRow } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import FilterBar from '@/components/common/FilterBar.vue'
import FilterField from '@/components/common/FilterField.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import DataTable from '@/components/common/DataTable.vue'
import Pagination from '@/components/common/Pagination.vue'
import RuleCategoryTree from '@/components/rules/RuleCategoryTree.vue'
import RuleDetailDrawer from '@/components/rules/RuleDetailDrawer.vue'
import type { TableColumn } from '@/components/common/table'
import { RISK_LABEL, RISK_TONE, RULE_STATUS_LABEL, RULE_STATUS_TONE } from '@/components/common/tone'

const route = useRoute()
const router = useRouter()

/* ---------------- 筛选状态(与 URL query 同步) ---------------- */
const keyword = ref('')
const categoryCode = ref('all')
const status = ref('all')
const taxType = ref('all')
const riskLevel = ref('all')
const model = ref('all')
const page = ref(1)
const pageSize = ref(20)

function readQuery() {
  const q = route.query
  const str = (v: unknown, d: string) => (typeof v === 'string' && v ? v : d)
  keyword.value = str(q.keyword, '')
  categoryCode.value = str(q.category, 'all')
  status.value = str(q.status, 'all')
  taxType.value = str(q.tax, 'all')
  riskLevel.value = str(q.risk, 'all')
  model.value = str(q.model, 'all')
  page.value = typeof q.page === 'string' ? Math.max(1, parseInt(q.page, 10) || 1) : 1
}

function writeQuery() {
  const q: Record<string, string> = {}
  if (keyword.value) q.keyword = keyword.value
  if (categoryCode.value !== 'all') q.category = categoryCode.value
  if (status.value !== 'all') q.status = status.value
  if (taxType.value !== 'all') q.tax = taxType.value
  if (riskLevel.value !== 'all') q.risk = riskLevel.value
  if (model.value !== 'all') q.model = model.value
  if (page.value > 1) q.page = String(page.value)
  router.replace({ query: q })
}

const query = computed<RuleQuery>(() => ({
  keyword: keyword.value,
  categoryCode: categoryCode.value,
  status: status.value,
  taxType: taxType.value,
  riskLevel: riskLevel.value,
  model: model.value,
  page: page.value,
  pageSize: pageSize.value,
}))

/* ---------------- 数据资源 ---------------- */
const filters = useResource(() => api.rules.getRuleFilters())
const list = useResource(() => api.rules.getRules(query.value), { isEmpty: (d) => d.items.length === 0 })

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
  categoryCode.value = 'all'
  status.value = 'all'
  taxType.value = 'all'
  riskLevel.value = 'all'
  model.value = 'all'
  page.value = 1
  reload()
}
function selectCategory(code: string) {
  categoryCode.value = code
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

/* ---------------- 抽屉 ---------------- */
const openId = ref('')
const detail = useResource(() => api.rules.getRuleDetail(openId.value))
function openDrawer(row: RuleRow) {
  openId.value = row.id
  detail.load()
}
function closeDrawer() {
  openId.value = ''
}

/* ---------------- 表格列 ---------------- */
const columns: TableColumn[] = [
  { key: 'id', label: '规则编号', width: '118px', numeric: true },
  { key: 'name', label: '规则名称', ellipsis: true },
  { key: 'categoryName', label: '类别', width: '86px' },
  { key: 'taxTypes', label: '涉及税种', width: '128px', ellipsis: true },
  { key: 'modelLabel', label: '比对范式', width: '104px' },
  { key: 'riskLevel', label: '风险等级', width: '80px' },
  { key: 'status', label: '状态', width: '78px' },
  { key: 'monthHit', label: '本月命中', width: '82px', align: 'right', numeric: true },
  { key: 'hitRate', label: '命中率', width: '78px', align: 'right', numeric: true },
  { key: 'actions', label: '操作', width: '86px' },
]

const ruleRowKey = (r: RuleRow) => r.id
const rows = computed(() => (list.data.value ? list.data.value.items : []))
const total = computed(() => (list.data.value ? list.data.value.total : 0))
</script>

<template>
  <div class="rules">
    <PageHeader title="规则配置" breadcrumb="首页 / 规则库管理 / 规则配置">
      <template #actions>
        <span v-if="filters.status.value === 'ready'" class="rules__updated num">
          数据更新 {{ filters.data.value!.updatedAt }}
        </span>
        <span class="rules__avatar">李</span>
      </template>
    </PageHeader>

    <div class="rules__body">
      <!-- ══ 左侧分类树 ══ -->
      <RuleCategoryTree
        :nodes="filters.data.value ? filters.data.value.categoryTree : []"
        :active-code="categoryCode"
        @select="selectCategory"
      />

      <!-- ══ 右侧主区域 ══ -->
      <div class="rules__main">
        <FilterBar>
          <FilterField label="规则名称 / 编号">
            <BaseInput v-model="keyword" placeholder="请输入关键字" width="200px" @enter="search" />
          </FilterField>
          <FilterField label="规则状态">
            <BaseSelect
              v-model="status"
              :options="filters.data.value ? filters.data.value.statuses : []"
              width="128px"
              @update:model-value="search"
            />
          </FilterField>
          <FilterField label="涉及税种">
            <BaseSelect
              v-model="taxType"
              :options="filters.data.value ? filters.data.value.taxTypes : []"
              width="132px"
              @update:model-value="search"
            />
          </FilterField>
          <FilterField label="风险等级">
            <BaseSelect
              v-model="riskLevel"
              :options="filters.data.value ? filters.data.value.riskLevels : []"
              width="118px"
              @update:model-value="search"
            />
          </FilterField>
          <FilterField label="比对范式">
            <BaseSelect
              v-model="model"
              :options="filters.data.value ? filters.data.value.models : []"
              width="132px"
              @update:model-value="search"
            />
          </FilterField>
          <div class="rules__actions">
            <button type="button" class="btn btn--primary" @click="search">查询</button>
            <button type="button" class="btn" @click="reset">重置</button>
          </div>
        </FilterBar>

        <div class="rules__list">
          <div class="rules__toolbar">
            <span class="rules__toolbar-title">规则列表</span>
            <span class="rules__toolbar-total num">共 {{ total }} 条</span>
            <div class="rules__toolbar-actions">
              <button type="button" class="btn btn--primary">+ 新建规则</button>
              <button type="button" class="btn">导入</button>
              <button type="button" class="btn">导出</button>
            </div>
          </div>

          <StateBlock
            v-if="list.status.value === 'empty' || list.status.value === 'error'"
            :status="list.status.value"
            :error="list.error.value"
            empty-text="未查询到符合条件的规则"
            empty-hint="可切换分类或放宽筛选条件"
            @retry="list.load()"
          />
          <DataTable
            v-else
            :columns="columns"
            :rows="rows"
            :row-key="ruleRowKey"
            density="compact"
            clickable
            :active-key="openId"
            :loading="list.status.value === 'loading' || list.status.value === 'idle'"
            :skeleton-rows="15"
            @row-click="openDrawer"
          >
            <template #cell-id="{ row }">
              <span class="rules__id">{{ row.id }}</span>
            </template>
            <template #cell-taxTypes="{ row }">{{ row.taxTypes.join('、') }}</template>
            <template #cell-riskLevel="{ row }">
              <BaseBadge :tone="RISK_TONE[row.riskLevel]">{{ RISK_LABEL[row.riskLevel] }}</BaseBadge>
            </template>
            <template #cell-status="{ row }">
              <BaseBadge :tone="RULE_STATUS_TONE[row.status]" variant="dot">
                {{ RULE_STATUS_LABEL[row.status] }}
              </BaseBadge>
            </template>
            <template #cell-monthHit="{ row }">{{ row.monthHit }}</template>
            <template #cell-hitRate="{ row }">
              {{ row.hitRate === 0 ? '—' : row.hitRate.toFixed(1) + '%' }}
            </template>
            <template #cell-actions="{ row }">
              <span class="rules__link" @click.stop="openDrawer(row)">配置</span>
              <span class="rules__link rules__link--sub" @click.stop>试跑</span>
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

        <!-- ══ 详情抽屉 ══ -->
        <RuleDetailDrawer
          :open="!!openId"
          :status="detail.status.value"
          :error="detail.error.value"
          :detail="detail.data.value"
          @close="closeDrawer"
          @retry="detail.load()"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.rules {
  /* 与工作台一致的最小高度,保证一屏 15 行在任何视口下成立 */
  --rules-min-h: 940px;
  height: 100%;
  min-height: var(--rules-min-h);
  display: flex;
  flex-direction: column;
  font-size: var(--fs-aux);
  line-height: 1.55;
}

.rules__updated {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
  white-space: nowrap;
}
.rules__avatar {
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

/* 主体:左树 + 右主区 */
.rules__body {
  flex: 1;
  display: flex;
  min-height: 0;
  padding: var(--space-4) 20px;
  gap: var(--space-4);
}
.rules__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-height: 0;
  /* 抽屉相对主区定位,覆盖列表而不重排 */
  position: relative;
}

.rules__actions {
  margin-left: auto;
  display: flex;
  gap: var(--space-2);
}
.rules__actions .btn {
  height: 32px;
}

/* 列表卡片 */
.rules__list {
  flex: 1;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.rules__toolbar {
  height: 46px;
  flex: none;
  border-bottom: var(--border-line);
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: var(--space-3);
}
.rules__toolbar-title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.rules__toolbar-total {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.rules__toolbar-actions {
  margin-left: auto;
  display: flex;
  gap: var(--space-2);
}
.rules__toolbar-actions .btn {
  height: 32px;
  padding: 0 14px;
}

/* 表格内联 */
.rules__id {
  color: var(--color-primary);
  font-weight: var(--fw-medium);
}
.rules__link {
  color: var(--color-primary);
  cursor: pointer;
  margin-right: var(--space-3);
}
.rules__link--sub {
  color: var(--color-neutral-700);
  margin-right: 0;
}
.rules__link:hover {
  text-decoration: underline;
}
</style>

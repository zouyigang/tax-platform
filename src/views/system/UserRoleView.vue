<script setup lang="ts">
/**
 * 系统管理 · 用户与权限(《需求文档》10.2)
 * 标准 RBAC,基础实现:
 *   用户管理 —— 左角色列表 / 右该角色下的用户;
 *   角色管理 —— 角色 × 菜单 的功能权限矩阵,区分查看 / 编辑 / 导出三种动作。
 * 数据权限(能看哪些机构、哪些户、哪些字段)不在本页,见「数据权限配置」。
 */
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { PermAction, RolePermRow, SysUserRow, UserStatus } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import TabNav from '@/components/common/TabNav.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseBadge from '@/components/common/BaseBadge.vue'
import BaseCheckbox from '@/components/common/BaseCheckbox.vue'
import DataTable from '@/components/common/DataTable.vue'
import Toast from '@/components/common/Toast.vue'
import type { TableColumn } from '@/components/common/table'

const TABS = [
  { value: 'user', label: '用户管理' },
  { value: 'role', label: '角色管理' },
]
const tab = ref('user')

const roleId = ref('role-source-manager')
const keyword = ref('')

const roles = useResource(() => api.system.getSysRoles())
const users = useResource(() => api.system.getSysUsers(roleId.value), { isEmpty: (d) => d.length === 0 })
const matrix = useResource(() => api.system.getRolePermMatrix(roleId.value))

const roleList = computed(() => roles.data.value || [])
const mx = computed(() => matrix.data.value)

onMounted(async () => {
  await roles.load()
  users.load()
  matrix.load()
})

function pickRole(id: string) {
  if (roleId.value === id) return
  roleId.value = id
  users.load()
  matrix.load()
}
function changeTab(v: string) {
  tab.value = v
  if (v === 'role') matrix.load()
}

/* ---------------- 用户列表 ---------------- */
const userRows = computed(() => {
  const list = users.data.value || []
  const kw = keyword.value.trim()
  if (!kw) return list
  return list.filter((u) => u.name.indexOf(kw) >= 0 || u.empNo.indexOf(kw) >= 0 || u.dept.indexOf(kw) >= 0)
})
const columns: TableColumn[] = [
  { key: 'name', label: '姓名', width: '96px' },
  { key: 'empNo', label: '工号', width: '110px', numeric: true },
  { key: 'dept', label: '所属单位', ellipsis: true },
  { key: 'roleName', label: '角色', width: '132px' },
  { key: 'status', label: '状态', width: '92px' },
  { key: 'lastLogin', label: '最后登录时间', width: '150px', numeric: true },
  { key: 'actions', label: '操作', width: '120px' },
]
const rowKey = (r: SysUserRow) => r.id
const STATUS_LABEL: Record<UserStatus, string> = { active: '正常', disabled: '停用', locked: '锁定' }
const STATUS_TONE: Record<UserStatus, 'success' | 'neutral' | 'danger'> = {
  active: 'success',
  disabled: 'neutral',
  locked: 'danger',
}

/* ---------------- 权限矩阵 ---------------- */
const ACTIONS: Array<{ key: PermAction; label: string }> = [
  { key: 'view', label: '查看' },
  { key: 'edit', label: '编辑' },
  { key: 'export', label: '导出' },
]
const dirty = ref(false)
function toggleAction(row: RolePermRow, action: PermAction) {
  row.actions[action] = !row.actions[action]
  // 取消查看时,编辑与导出一并失效 —— 看不到就谈不上改和导
  if (action === 'view' && !row.actions.view) {
    row.actions.edit = false
    row.actions.export = false
  }
  dirty.value = true
}
/** 整列全选 / 全不选 */
function toggleColumn(action: PermAction) {
  if (!mx.value) return
  const all = mx.value.rows.every((r) => r.actions[action])
  mx.value.rows.forEach((r) => {
    r.actions[action] = !all
    if (action === 'view' && all) {
      r.actions.edit = false
      r.actions.export = false
    }
  })
  dirty.value = true
}
/** 各动作的已授权菜单数 */
function grantedOf(action: PermAction) {
  return mx.value ? mx.value.rows.filter((r) => r.actions[action]).length : 0
}
function saveMatrix() {
  dirty.value = false
  toast('角色权限已保存,变更已记入操作日志')
}
function resetMatrix() {
  matrix.load()
  dirty.value = false
}

const toastVisible = ref(false)
const toastText = ref('')
function toast(text: string) {
  toastText.value = text
  toastVisible.value = true
}
</script>

<template>
  <div class="ur">
    <PageHeader title="用户与权限" breadcrumb="首页 / 系统管理 / 用户与权限">
      <template #actions>
        <span class="ur__note">数据权限(可见机构 / 纳税人 / 字段)在「数据权限配置」页设置</span>
        <button type="button" class="btn" @click="toast('演示环境:新增用户需连接统一身份认证')">新增用户</button>
      </template>
    </PageHeader>

    <div class="ur__tabs">
      <TabNav :model-value="tab" :tabs="TABS" @update:model-value="changeTab" />
    </div>

    <div class="ur__body">
      <!-- 左:角色列表(两个标签页共用) -->
      <aside class="roles">
        <div class="roles__head">角色<span class="num">{{ roleList.length }}</span></div>
        <StateBlock :status="roles.status.value" :error="roles.error.value" @retry="roles.load()">
          <div class="roles__list">
            <div
              v-for="r in roleList"
              :key="r.id"
              class="role"
              :class="{ 'role--on': roleId === r.id }"
              @click="pickRole(r.id)"
            >
              <div class="role__top">
                <span class="role__name">{{ r.name }}</span>
                <span class="role__count num">{{ r.userCount }} 人</span>
              </div>
              <div class="role__desc">{{ r.desc }}</div>
            </div>
          </div>
        </StateBlock>
      </aside>

      <!-- 右:用户列表 / 权限矩阵 -->
      <section class="main">
        <!-- 用户管理 -->
        <template v-if="tab === 'user'">
          <div class="main__head">
            <span class="main__title">用户列表</span>
            <span class="main__sub num">共 {{ userRows.length }} 人</span>
            <div class="main__right">
              <BaseInput v-model="keyword" placeholder="姓名 / 工号 / 单位" width="200px" />
            </div>
          </div>
          <StateBlock
            v-if="users.status.value !== 'ready'"
            :status="users.status.value"
            :error="users.error.value"
            empty-text="该角色下暂无用户"
            @retry="users.load()"
          />
          <DataTable v-else :columns="columns" :rows="userRows" :row-key="rowKey" density="compact">
            <template #cell-status="{ row }">
              <BaseBadge :tone="STATUS_TONE[row.status as UserStatus]" variant="dot">
                {{ STATUS_LABEL[row.status as UserStatus] }}
              </BaseBadge>
            </template>
            <template #cell-lastLogin="{ row }">
              <span v-if="row.lastLogin">{{ row.lastLogin }}</span>
              <span v-else class="ur__never">从未登录</span>
            </template>
            <template #cell-actions>
              <span class="ur__link" @click="toast('演示环境:编辑用户需连接统一身份认证')">编辑</span>
              <span class="ur__link" @click="toast('演示环境:重置密码需连接统一身份认证')">重置密码</span>
            </template>
          </DataTable>
        </template>

        <!-- 角色管理:权限矩阵 -->
        <template v-else>
          <div class="main__head">
            <span class="main__title">{{ mx ? mx.roleName : '角色' }} · 功能权限</span>
            <span v-if="mx" class="main__sub num">
              查看 {{ grantedOf('view') }} / 编辑 {{ grantedOf('edit') }} / 导出 {{ grantedOf('export') }} 项
            </span>
            <span v-if="dirty" class="main__dirty">有未保存的改动</span>
            <div class="main__right">
              <button type="button" class="btn" :disabled="!dirty" @click="resetMatrix">重置</button>
              <button type="button" class="btn btn--primary" :disabled="!dirty" @click="saveMatrix">保存权限</button>
            </div>
          </div>

          <StateBlock :status="matrix.status.value" :error="matrix.error.value" @retry="matrix.load()">
            <div v-if="mx" class="mx">
              <div class="mx__head">
                <span class="mc mc--group">所属模块</span>
                <span class="mc mc--menu">菜单</span>
                <span
                  v-for="a in ACTIONS"
                  :key="a.key"
                  class="mc mc--act"
                  title="点击整列全选 / 全不选"
                  @click="toggleColumn(a.key)"
                >{{ a.label }}</span>
              </div>
              <div v-for="r in mx.rows" :key="r.menuKey" class="mx__row">
                <span class="mc mc--group">{{ r.groupName }}</span>
                <span class="mc mc--menu">{{ r.menuName }}</span>
                <span v-for="a in ACTIONS" :key="a.key" class="mc mc--act">
                  <BaseCheckbox
                    :model-value="r.actions[a.key]"
                    @update:model-value="toggleAction(r, a.key)"
                  />
                </span>
              </div>
            </div>
          </StateBlock>
          <p class="mx__note">取消「查看」时,该菜单的编辑与导出一并失效 —— 看不到就谈不上改和导。</p>
        </template>
      </section>
    </div>

    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.ur {
  --ur-roles: 260px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.ur__note {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.ur__tabs {
  flex: none;
  background: var(--color-panel);
  border-bottom: var(--border-line);
  padding: 0 20px;
}
.ur__body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) 20px;
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* 左:角色 */
.roles {
  width: var(--ur-roles);
  flex: none;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.roles__head {
  flex: none;
  height: 40px;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-3);
  border-bottom: var(--border-line);
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.roles__head .num {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.roles__list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: var(--space-2);
}
.role {
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-control);
  padding: 8px 12px;
  margin-bottom: 6px;
  cursor: pointer;
}
.role:hover {
  background: var(--color-row-hover);
}
.role--on {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
}
.role__top {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}
.role__name {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  flex: 1;
  min-width: 0;
}
.role__count {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.role__desc {
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  line-height: 1.5;
  margin-top: 2px;
}

/* 右:主区 */
.main {
  flex: 1;
  min-width: 0;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.main__head {
  flex: none;
  height: 46px;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 18px;
  border-bottom: var(--border-line);
}
.main__title {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.main__sub {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}
.main__dirty {
  font-size: var(--fs-label);
  color: var(--color-risk-mid-text);
  background: var(--color-risk-mid-tint);
  border-radius: var(--radius-control);
  padding: 2px 10px;
}
.main__right {
  margin-left: auto;
  display: flex;
  gap: var(--space-2);
}
.main__right .btn {
  height: 30px;
}
.ur__never {
  color: var(--color-neutral-500);
}
.ur__link {
  color: var(--color-primary);
  cursor: pointer;
  margin-right: var(--space-3);
}
.ur__link:hover {
  text-decoration: underline;
}

/* 权限矩阵 */
.mx {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.mx__head,
.mx__row {
  display: grid;
  grid-template-columns: 132px 1fr 90px 90px 90px;
  align-items: center;
  padding: 7px 18px;
}
.mx__head {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--color-neutral-100);
  border-bottom: var(--border-line);
}
.mx__row {
  border-bottom: 1px solid var(--color-neutral-200);
}
.mx__row:hover {
  background: var(--color-row-hover);
}
.mc {
  font-size: var(--fs-aux);
}
.mx__head .mc {
  font-size: var(--fs-label);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-600);
}
.mc--group {
  color: var(--color-neutral-600);
}
.mc--act {
  text-align: center;
  justify-self: center;
}
.mx__head .mc--act {
  cursor: pointer;
}
.mx__head .mc--act:hover {
  color: var(--color-primary);
}
.mx__note {
  flex: none;
  margin: 0;
  padding: 7px 18px;
  border-top: 1px solid var(--color-neutral-200);
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
</style>

<script setup lang="ts">
/**
 * 系统管理 · 系统参数
 * 最简实现:左侧分组导航 + 右侧该组表单 + 底部保存 / 重置。
 * 参数值统一以字符串承载(开关用 '1' / '0'),由 type 决定渲染哪种控件,
 * 这样新增参数只需改 mock,不必动页面代码。
 */
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import type { ParamGroup, SysParam } from '@/api/types'
import { useResource } from '@/composables/useResource'
import StateBlock from '@/components/StateBlock.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import Toast from '@/components/common/Toast.vue'

const groups = useResource(() => api.system.getSysParamGroups())
/** 本地可编辑副本 */
const local = ref<ParamGroup[]>([])
const activeKey = ref('basic')
const dirty = ref(false)

const activeGroup = computed(() => local.value.filter((g) => g.key === activeKey.value)[0])
/** 各分组的改动数量,显示在左侧导航上 */
const dirtyCount = computed(() => {
  const src = groups.data.value || []
  const map: Record<string, number> = {}
  local.value.forEach((g) => {
    const origin = src.filter((o) => o.key === g.key)[0]
    if (!origin) return
    map[g.key] = g.params.filter((p, i) => origin.params[i] && origin.params[i].value !== p.value).length
  })
  return map
})
const totalDirty = computed(() => Object.keys(dirtyCount.value).reduce((s, k) => s + dirtyCount.value[k], 0))

function clone() {
  local.value = (groups.data.value || []).map((g) => ({ ...g, params: g.params.map((p) => ({ ...p })) }))
  dirty.value = false
}

onMounted(async () => {
  await groups.load()
  clone()
  if (local.value.length) activeKey.value = local.value[0].key
})

function setValue(p: SysParam, v: string) {
  p.value = v
  dirty.value = true
}
function toggleSwitch(p: SysParam) {
  setValue(p, p.value === '1' ? '0' : '1')
}
/** 某项是否相对已保存值发生了改动 */
function isChanged(groupKey: string, index: number): boolean {
  const origin = (groups.data.value || []).filter((g) => g.key === groupKey)[0]
  if (!origin || !origin.params[index]) return false
  const cur = local.value.filter((g) => g.key === groupKey)[0]
  return origin.params[index].value !== cur.params[index].value
}

const saveOpen = ref(false)
function confirmSave() {
  saveOpen.value = false
  // 演示环境不落库:把本地副本当作新的已保存值,改动标记随之清零
  groups.data.value = local.value.map((g) => ({ ...g, params: g.params.map((p) => ({ ...p })) }))
  dirty.value = false
  toast('系统参数已保存,变更已记入操作日志')
}
function resetAll() {
  clone()
  toast('已恢复为当前生效的参数值')
}

const toastVisible = ref(false)
const toastText = ref('')
function toast(text: string) {
  toastText.value = text
  toastVisible.value = true
}
</script>

<template>
  <div class="sp">
    <PageHeader title="系统参数" breadcrumb="首页 / 系统管理 / 系统参数">
      <template #actions>
        <span v-if="totalDirty" class="sp__dirty num">{{ totalDirty }} 项待保存</span>
        <span v-else class="sp__clean">当前无未保存改动</span>
      </template>
    </PageHeader>

    <div class="sp__body">
      <!-- 左:分组导航 -->
      <aside class="nav">
        <div class="nav__head">参数分组</div>
        <StateBlock :status="groups.status.value" :error="groups.error.value" @retry="groups.load()">
          <div class="nav__list">
            <div
              v-for="g in local"
              :key="g.key"
              class="nav__item"
              :class="{ 'nav__item--on': activeKey === g.key }"
              @click="activeKey = g.key"
            >
              <span class="nav__name">{{ g.name }}</span>
              <span v-if="dirtyCount[g.key]" class="nav__badge num">{{ dirtyCount[g.key] }}</span>
              <span v-else class="nav__count num">{{ g.params.length }}</span>
            </div>
          </div>
        </StateBlock>
      </aside>

      <!-- 右:表单 -->
      <section class="form">
        <template v-if="activeGroup">
          <div class="form__head">
            <span class="form__title">{{ activeGroup.name }}</span>
            <span class="form__desc">{{ activeGroup.desc }}</span>
          </div>

          <div class="form__body">
            <div
              v-for="(p, i) in activeGroup.params"
              :key="p.key"
              class="pf"
              :class="{ 'pf--changed': isChanged(activeGroup.key, i) }"
            >
              <div class="pf__label">
                <span class="pf__name">{{ p.label }}</span>
                <span v-if="isChanged(activeGroup.key, i)" class="pf__flag">已修改</span>
                <span class="pf__desc">{{ p.desc }}</span>
              </div>
              <div class="pf__control">
                <BaseSelect
                  v-if="p.type === 'select'"
                  :model-value="p.value"
                  :options="p.options"
                  width="240px"
                  @update:model-value="setValue(p, $event)"
                />
                <span v-else-if="p.type === 'switch'" class="sw" :class="{ 'sw--on': p.value === '1' }" @click="toggleSwitch(p)">
                  <i class="sw__knob"></i>
                  <b class="sw__text">{{ p.value === '1' ? '已启用' : '已关闭' }}</b>
                </span>
                <template v-else>
                  <BaseInput
                    :model-value="p.value"
                    :numeric="p.type === 'number'"
                    :width="p.type === 'number' ? '120px' : '360px'"
                    @update:model-value="setValue(p, $event)"
                  />
                  <span v-if="p.unit" class="pf__unit">{{ p.unit }}</span>
                </template>
              </div>
            </div>
          </div>

          <div class="form__foot">
            <button type="button" class="btn" :disabled="!totalDirty" @click="resetAll">重置</button>
            <button type="button" class="btn btn--primary" :disabled="!totalDirty" @click="saveOpen = true">
              保存参数
            </button>
            <span class="form__note">参数修改即时生效,变更内容与操作人将记入操作日志审计。</span>
          </div>
        </template>
      </section>
    </div>

    <ConfirmModal
      :open="saveOpen"
      :title="`确认保存 ${totalDirty} 项参数改动?`"
      message="部分参数(同步时间窗口、批处理并发数、模型重训周期)将影响后台任务调度,保存后于下一调度周期生效。"
      confirm-text="确认保存"
      @confirm="confirmSave"
      @cancel="saveOpen = false"
    />
    <Toast :visible="toastVisible" :text="toastText" @close="toastVisible = false" />
  </div>
</template>

<style scoped>
.sp {
  --sp-nav: 200px;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  font-size: var(--fs-aux);
  line-height: 1.55;
}
.sp__dirty {
  font-size: var(--fs-label);
  color: var(--color-risk-mid-text);
  background: var(--color-risk-mid-tint);
  border-radius: var(--radius-control);
  padding: 2px 10px;
}
.sp__clean {
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
}
.sp__body {
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

/* 左:分组导航 */
.nav {
  width: var(--sp-nav);
  flex: none;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.nav__head {
  flex: none;
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-3);
  border-bottom: var(--border-line);
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.nav__list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: var(--space-2) 0;
}
.nav__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 9px var(--space-3);
  cursor: pointer;
  border-left: 3px solid transparent;
}
.nav__item:hover {
  background: var(--color-row-hover);
}
.nav__item--on {
  background: var(--color-primary-tint);
  border-left-color: var(--color-primary);
}
.nav__name {
  flex: 1;
  min-width: 0;
}
.nav__item--on .nav__name {
  color: var(--color-primary-deep);
  font-weight: var(--fw-semibold);
}
.nav__count {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
.nav__badge {
  font-size: var(--fs-micro);
  color: var(--color-text-inverse);
  background: var(--color-risk-mid);
  border-radius: var(--radius-control);
  padding: 0 6px;
}

/* 右:表单 */
.form {
  flex: 1;
  min-width: 0;
  background: var(--color-panel);
  border: var(--border-line);
  border-radius: var(--radius-control);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.form__head {
  flex: none;
  height: 46px;
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  padding: 0 20px;
  border-bottom: var(--border-line);
}
.form__title {
  align-self: center;
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
}
.form__desc {
  align-self: center;
  font-size: var(--fs-label);
  color: var(--color-neutral-500);
}
.form__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: var(--space-3) 20px;
}
.pf {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: var(--space-4);
  align-items: start;
  padding: 12px 10px;
  border-bottom: 1px solid var(--color-neutral-200);
  border-left: 3px solid transparent;
}
.pf:last-child {
  border-bottom: none;
}
/* 改动过的参数项标出来,保存前一眼能看到动了哪些 */
.pf--changed {
  background: var(--color-risk-mid-tint);
  border-left-color: var(--color-risk-mid);
}
.pf__name {
  font-size: var(--fs-aux);
  font-weight: var(--fw-semibold);
  color: var(--color-neutral-900);
}
.pf__flag {
  font-size: var(--fs-micro);
  color: var(--color-risk-mid-text);
  border: 1px solid var(--color-risk-mid);
  border-radius: var(--radius-control);
  padding: 0 5px;
  margin-left: 6px;
}
.pf__desc {
  display: block;
  font-size: var(--fs-micro);
  color: var(--color-neutral-600);
  line-height: 1.5;
  margin-top: 2px;
}
.pf__control {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.pf__unit {
  font-size: var(--fs-label);
  color: var(--color-neutral-600);
}

/* 开关(仅本页使用,不进公共组件目录) */
.sw {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}
.sw::before {
  content: '';
  width: 38px;
  height: 20px;
  border-radius: 10px;
  background: var(--color-neutral-300);
  transition: background var(--motion-fast) ease;
}
.sw--on::before {
  background: var(--color-primary);
}
.sw__knob {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-panel);
  margin-left: 2px;
  transition: margin-left var(--motion-fast) ease;
  pointer-events: none;
}
.sw--on .sw__knob {
  margin-left: 20px;
}
.sw {
  position: relative;
}
.sw__text {
  font-size: var(--fs-label);
  font-weight: var(--fw-regular);
  color: var(--color-neutral-700);
}
.sw--on .sw__text {
  color: var(--color-primary-deep);
  font-weight: var(--fw-semibold);
}

.form__foot {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) 20px;
  border-top: var(--border-line);
}
.form__note {
  margin-left: auto;
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
}
</style>

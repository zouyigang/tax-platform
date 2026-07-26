<script setup lang="ts">
/**
 * 全局布局:左侧固定侧栏(210px) + 右侧内容区(顶栏 + router-view)。
 * 顶栏常驻纳税人搜索:平台里几乎每条业务线索最终都要落到「某一户」,
 * 因此检索入口不应只存在于一户式档案页,而应全局可达(Ctrl+K 聚焦)。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { TaxpayerBrief } from '@/api/types'
import AppSidebar from '@/components/AppSidebar.vue'
import TaxpayerSearch from '@/components/common/TaxpayerSearch.vue'
import { useRecentTaxpayers } from '@/composables/useRecentTaxpayers'

const router = useRouter()
const { push: pushRecent } = useRecentTaxpayers()
const searchRef = ref<InstanceType<typeof TaxpayerSearch> | null>(null)

/** 选中即跳转到该户档案 */
function goArchive(t: TaxpayerBrief) {
  pushRecent(t.taxpayerId, t.name)
  router.push(`/archive?taxpayerId=${encodeURIComponent(t.taxpayerId)}`)
}

/** 未选中联想项直接回车:带关键词进档案页,由页面执行完整检索 */
function goSearch(keyword: string) {
  if (!keyword) return
  router.push(`/archive?keyword=${encodeURIComponent(keyword)}`)
}

/** Ctrl+K / ⌘K 聚焦全局搜索 */
function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    if (searchRef.value) searchRef.value.focus()
  }
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <main class="app-content">
      <div class="topbar">
        <TaxpayerSearch
          ref="searchRef"
          size="topbar"
          placeholder="搜索纳税人名称或识别号"
          @select="goArchive"
          @submit="goSearch"
        />
        <span class="topbar__kbd num">Ctrl K</span>
      </div>
      <div class="app-view">
        <router-view />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
.app-content {
  flex: 1;
  min-width: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

/* 全局顶栏:只放全局能力,业务操作仍在各页自己的 PageHeader 上 */
.topbar {
  flex: none;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: 0 20px;
  background: var(--color-panel);
  border-bottom: var(--border-line);
  /* 联想下拉需要浮在页面内容之上 */
  position: relative;
  z-index: 10;
}
.topbar__kbd {
  font-size: var(--fs-micro);
  color: var(--color-neutral-500);
  border: 1px solid var(--color-neutral-300);
  border-radius: var(--radius-control);
  padding: 1px 6px;
}

.app-view {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>

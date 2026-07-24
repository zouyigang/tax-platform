<script setup lang="ts">
// 全局布局:左侧固定侧栏(210px) + 右侧内容区(router-view)。
// 所有业务页共用本布局。
import AppSidebar from '@/components/AppSidebar.vue'
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <main class="app-content">
      <router-view />
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
  overflow: auto;
  background: var(--color-bg);
}
</style>

<script setup lang="ts">
// 占位页:本轮未实现的业务页统一落此,保持侧栏导航可用、不断链。
import { computed } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const name = computed(() => (route.meta.nav as string) || '页面')
</script>

<template>
  <div class="placeholder">
    <div class="placeholder__icon">▤</div>
    <div class="placeholder__title">{{ name }}</div>
    <div class="placeholder__desc">该页面将在后续轮次实现</div>
  </div>
</template>

<style scoped>
.placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--color-neutral-500);
}
.placeholder__icon {
  font-size: 48px;
  color: var(--color-neutral-400);
  line-height: 1;
}
.placeholder__title {
  font-size: var(--fs-h2);
  font-weight: var(--fw-h2);
  color: var(--color-neutral-700);
}
.placeholder__desc {
  font-size: var(--fs-aux);
  color: var(--color-neutral-600);
}
</style>

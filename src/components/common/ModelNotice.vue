<script setup lang="ts">
/**
 * 模型结果免责声明条 · 智能模型各页固定展示
 * 位置在页顶栏之下、内容之上,始终可见(不随内容滚动)。
 * 语气为提示而非报错:主色浅底 + 主色文字,不使用危险色。
 */
withDefaults(
  defineProps<{
    /** 声明文案;默认即《需求文档》要求的统一口径 */
    text?: string
    /** 右侧补充说明(如模型版本、评分批次),可空 */
    extra?: string
  }>(),
  {
    text: '模型输出仅用于风险提示与线索排序,不作为税务定性依据。',
    extra: '',
  },
)
</script>

<template>
  <div class="notice">
    <span class="notice__icon">ⓘ</span>
    <span class="notice__text">{{ text }}</span>
    <span v-if="extra" class="notice__extra num">{{ extra }}</span>
  </div>
</template>

<style scoped>
.notice {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 7px 20px;
  background: var(--color-primary-tint);
  border-bottom: 1px solid var(--color-neutral-300);
  font-size: var(--fs-label);
  color: var(--color-primary-deep);
}
.notice__icon {
  color: var(--color-primary);
  flex: none;
}
.notice__text {
  font-weight: var(--fw-medium);
}
.notice__extra {
  margin-left: auto;
  color: var(--color-neutral-600);
  white-space: nowrap;
}
</style>

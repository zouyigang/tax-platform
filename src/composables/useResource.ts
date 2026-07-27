/* ============================================================
 * 数据区块四态封装:加载中 → 有数据 / 空 / 错误
 * 依据《交互说明》第 2 节:每个数据区域(表格/卡片/图表)独立四态,
 * 局部失败不影响其他区块。
 * ============================================================ */
import { ref, shallowRef } from 'vue'

export type ResourceStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'forbidden'

export interface UseResourceOptions<T> {
  /** 判定「空态」:返回 true 时状态置为 empty */
  isEmpty?: (data: T) => boolean
}

export function useResource<T>(fetcher: () => Promise<T>, options: UseResourceOptions<T> = {}) {
  const data = shallowRef<T | null>(null)
  const status = ref<ResourceStatus>('idle')
  const error = ref('')

  // 竞态保护:仅采纳最后一次请求的结果
  let seq = 0

  async function load(): Promise<void> {
    const current = ++seq
    status.value = 'loading'
    error.value = ''
    try {
      const result = await fetcher()
      if (current !== seq) return
      data.value = result
      status.value = options.isEmpty && options.isEmpty(result) ? 'empty' : 'ready'
    } catch (e) {
      if (current !== seq) return
      // 面向业务人员的文案,不暴露堆栈
      error.value = e instanceof Error ? e.message : '数据加载失败'
      // 无权限与取数失败要分开:前者给「重试」没有意义,重试多少次结果都一样
      status.value = e instanceof Error && e.name === 'ForbiddenError' ? 'forbidden' : 'error'
    }
  }

  return { data, status, error, load }
}

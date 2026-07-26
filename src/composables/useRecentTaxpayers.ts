/* ============================================================
 * 最近查看的纳税人 · localStorage
 * 只存主键与名称,不存业务字段 —— 业务字段随时会变,
 * 真正展示时由 getTaxpayersByIds 回后端取当前值,避免展示过期信息。
 * 名称一并存下,仅用于接口未返回前的占位,不作为展示依据。
 * ============================================================ */
import { ref } from 'vue'

const STORAGE_KEY = 'tax-platform.recent-taxpayers'
/** 最多保留 8 户 */
const MAX = 8

export interface RecentTaxpayer {
  /** 纳税人主键 */
  taxpayerId: string
  /** 名称占位 */
  name: string
}

/** 单例:多处引用共享同一份内存副本,避免不同组件读到不一致的数据 */
const recent = ref<RecentTaxpayer[]>(read())

function read(): RecentTaxpayer[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x) => x && typeof x.taxpayerId === 'string')
      .slice(0, MAX)
      .map((x) => ({ taxpayerId: x.taxpayerId, name: typeof x.name === 'string' ? x.name : '' }))
  } catch {
    // 隐私模式或存储损坏时静默降级为空列表,不影响页面可用
    return []
  }
}

function write(list: RecentTaxpayer[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* 忽略写入失败(配额 / 隐私模式) */
  }
}

export function useRecentTaxpayers() {
  /** 记一次查看:已存在则提到最前,超出上限截断 */
  function push(taxpayerId: string, name: string): void {
    if (!taxpayerId) return
    const next = [{ taxpayerId, name }].concat(recent.value.filter((r) => r.taxpayerId !== taxpayerId))
    recent.value = next.slice(0, MAX)
    write(recent.value)
  }

  function clear(): void {
    recent.value = []
    write(recent.value)
  }

  return { recent, push, clear }
}

/* ============================================================
 * API 客户端入口 · 页面组件唯一取数出口
 * ------------------------------------------------------------
 * 页面只能 import { api } from '@/api/client'，不得直接引用任何 adapter。
 * 通过 VITE_API_MODE 在 mock / http 两套实现间切换（签名一致）。
 * ============================================================ */
import type { ApiClient } from './types'
import { mockClient } from './adapters/mock'
import { httpClient } from './adapters/http'

const mode = import.meta.env.VITE_API_MODE || 'mock'

/** 全局 API 客户端 */
export const api: ApiClient = mode === 'http' ? httpClient : mockClient

export default api

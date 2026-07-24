/// <reference types="vite/client" />

// Vue 单文件组件类型声明
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 环境变量契约
interface ImportMetaEnv {
  /** 取数模式:mock = 内置假数据;http = 真实后端接口 */
  readonly VITE_API_MODE: 'mock' | 'http'
  /** http 模式下的后端基地址,如 /api 或 https://host/api */
  readonly VITE_API_BASE_URL: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}

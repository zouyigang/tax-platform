import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 政务内网兼容:构建目标降级到较老的 Chromium/Edge/Firefox/Safari,
// 避免产出 :has()、容器查询(@container)等新特性;源码中亦不使用这些语法。
export default defineConfig({
  plugins: [vue()],
  resolve: {
    // 以项目根为基准的别名,避免引入 @types/node（内网环境少一个依赖）。
    // 别名匹配规则为 id === '@' 或以 '@/' 开头,故不会误伤 @vue/* 等作用域包。
    alias: {
      '@': '/src',
    },
  },
  build: {
    // JS 语法降级
    target: ['es2015', 'chrome80', 'edge80', 'firefox78', 'safari13'],
    // CSS 降级:阻止把手写的兼容 CSS 反向升级为新特性
    cssTarget: 'chrome80',
  },
})

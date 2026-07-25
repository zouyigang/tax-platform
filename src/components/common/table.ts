/** 表格列定义(与 DataTable.vue 配套) */
export interface TableColumn {
  /** 字段键;同时用作单元格插槽名 cell-<key> */
  key: string
  /** 表头文案 */
  label: string
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 列宽,如 '132px';不传则自适应 */
  width?: string
  /** 数值列:启用等宽数字 */
  numeric?: boolean
  /** 内容超宽时省略号截断 */
  ellipsis?: boolean
}

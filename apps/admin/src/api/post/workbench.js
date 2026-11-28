import request from '@/composables/useRequest';

// 工作台待办汇总：一个接口按权限逐项过滤返回（无权限源不出现，前端只渲染拿到的卡片），
// 避免前端并发查各模块列表接口对无权限模块 403 噪音；计数为各业务表待处理状态实时查询，
// 不建通用 todo 表；key 与首页待办卡片映射约定（report/feedback，文章审核上线时增量加项）
export function getWorkbenchSummary() {
  return request({ url: '/post/workbench/summary', method: 'get' });
}

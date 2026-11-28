import request from '@/composables/useRequest';

// 工作台待办汇总：一个接口按权限逐项过滤返回（无权限源不出现，前端只渲染拿到的卡片），
// 避免前端并发查各模块列表接口对无权限模块 403 噪音；计数为各业务表待处理状态实时查询，
// 不建通用 todo 表；key 与首页待办卡片映射约定（report/feedback，文章审核上线时增量加项）
export function getWorkbenchSummary() {
  return request({ url: '/post/workbench/summary', method: 'get' });
}

// 工作台统一待办队列：有权管理的源 UNION 归一化按提交时间倒序分页（source/id/summary/提交人/时间）；
// 行只读不承载处理（处理交互长在各自管理页），行点击由首页跳对应管理页（status=0 深链）
export function listWorkbenchTodos(params) {
  return request({ url: '/post/workbench/todos', method: 'get', params });
}

// 标记待办已读（行点击时调用；幂等——唯一索引 INSERT IGNORE 兜底，重复标记静默）
export function markTodoRead(data) {
  return request({ url: '/post/workbench/read', method: 'post', data });
}


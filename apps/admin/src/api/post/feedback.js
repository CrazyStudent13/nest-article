import request from '@/composables/useRequest';

// 用户反馈管理（交互管理/反馈管理）：列表/处理/批量删除；
// 提交入口在 client（POST /post/feedback 登录即可，无管理端新增）
export function listFeedback(query) {
  return request({ url: '/post/feedback/list', method: 'get', params: query });
}

// 处理反馈：status 1 已回复（replyContent 必填）/ 2 已关闭（replyContent 可选简短说明）；
// 终态不可重复处理（服务端 status='0' 条件更新乐观锁），处理结果走 sys_notice 定向通知（type=4 反馈回复）
export function handleFeedback(id, data) {
  return request({ url: `/post/feedback/handle/${id}`, method: 'put', data });
}

// 批量删除反馈记录（物理删除，同举报记录口径）
export function delFeedback(ids) {
  return request({ url: `/post/feedback/batch/${ids}`, method: 'delete' });
}

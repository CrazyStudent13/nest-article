// 用户反馈：提交（登录用户）。提交只要求登录（服务端不挂权限串），24h 窗口 10 条频控由服务端承担；
// 不做 pending 去重（多条不同反馈合法）。处理结果走 sys_notice 定向通知（type=4 反馈回复），
// 在通知中心「系统通知」栏承接（红色/绿色徽标区分），不经本域拉取；
// 反馈类型走字典 post_feedback_type（useDict 拉取，登录态可读非公开字典），前端不写死枚举
import type { FeedbackPayload, FeedbackSubmitResult } from '@nest-acticle/shared'

export const useFeedback = () => {
  // 提交反馈：type 为字典 post_feedback_type 的 dictValue；content 1-500 字
  const submitFeedback = async (data: FeedbackPayload) => {
    const res = await apiFetch<FeedbackSubmitResult>('/api/post/feedback', {
      method: 'POST',
      body: { type: data.type, content: data.content }
    })
    return res.data ?? { submitted: true }
  }

  return { submitFeedback }
}

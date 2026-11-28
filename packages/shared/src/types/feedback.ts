/**
 * 用户反馈相关的线格式类型
 *
 * 契约来源（修改任一侧时必须同步）：
 * - apps/server/src/module/post/feedback/feedback.service.ts（提交/管理列表/处理返回载荷）
 * - 数据库表 post_feedback：登录用户提交（24h 窗口 10 条频控，用户维度不做 pending 去重），
 *   管理端回复/关闭走 status='0' 条件更新乐观锁（终态不可重复处理）；
 *   反馈类型取字典 post_feedback_type 的 dictValue（登录态专用，不公开——游客不可提交）；
 *   处理通知走 sys_notice 定向通知（noticeType='4' 反馈回复），前台「系统通知」栏承接
 */

import { FeedbackStatusEnum, FeedbackTypeEnum } from '../enums';

/** 提交反馈载荷（客户端弹窗 → POST /post/feedback） */
export interface FeedbackPayload {
  /** 反馈类型（字典 post_feedback_type 的 dictValue） */
  type: FeedbackTypeEnum | string;
  /** 反馈内容（1-500 字） */
  content: string;
}

/** 提交反馈返回（ResultData.data） */
export interface FeedbackSubmitResult {
  submitted: boolean;
}

/** 提交人信息（管理端列表/处理弹窗回填展示） */
export interface FeedbackUserInfo {
  userId: number;
  nickName: string;
  avatar?: string | null;
}

/**
 * 反馈管理列表行（admin 端，attachUserInfo 回填提交人昵称头像）
 * 服务端回填 replyAdminName（处理人昵称），join sys_user 两次同举报列表口径
 */
export interface FeedbackAdminItem {
  id: number;
  /** 提交人用户 id */
  userId: number;
  /** 反馈类型（字典 post_feedback_type 的 dictValue） */
  type: string;
  /** 反馈内容 */
  content: string;
  /** 处理状态（0 待处理 1 已回复 2 已关闭） */
  status: FeedbackStatusEnum | string;
  /** 管理员回复内容（未处理为 null） */
  replyContent: string | null;
  /** 处理人用户 id（未处理为 null） */
  adminId: number | null;
  /** 处理人昵称（服务端联查回填，未处理为 null） */
  replyAdminName: string | null;
  /** 处理时间（毫秒粒度 datetime(3)，未处理为 null） */
  replyTime: string | null;
  /** 提交时间 */
  createTime: string;
  /** 提交人信息（attachUserInfo 批查回填：昵称+头像） */
  userInfo: FeedbackUserInfo | null;
}

/** 处理反馈载荷（admin 端 → PUT /post/feedback/handle/:id） */
export interface FeedbackHandlePayload {
  /** 处理结论：1 已回复（replyContent 必填）/ 2 已关闭（replyContent 可选简短说明） */
  status: FeedbackStatusEnum.REPLIED | FeedbackStatusEnum.CLOSED | string;
  /** 回复内容（status=1 必填且 1-500 字；status=2 可空） */
  replyContent?: string;
}

/**
 * 跨端共享的业务枚举
 *
 * 契约来源（修改任一侧时必须同步）：
 * - apps/server/src/module/post/article/dto/index.ts
 * - apps/server/src/common/enum/index.ts
 *
 * 注意：这些枚举描述的是数据库 char(1) 的存值约定，server 实体/DTO 的
 * 字段类型仍声明为 string（配合 @IsEnum 校验），前端线格式类型同样用
 * string 承载，枚举仅作为取值常量使用。
 */

/**
 * 发布状态：0 草稿 1 待发布 2 已发布 3 已下架
 */
export enum PublishStatusEnum {
  DRAFT = '0',
  PENDING = '1',
  PUBLISHED = '2',
  OFFLINE = '3',
}

/**
 * 审核状态：0 未提交 1 审核中 2 审核通过 3 审核拒绝
 */
export enum AuditStatusEnum {
  NOT_SUBMITTED = '0',
  AUDITING = '1',
  APPROVED = '2',
  REJECTED = '3',
}

/**
 * 文章来源/文章类型：0 原创 1 转载 2 翻译 3 整理（与字典 post_article_source 保持一致）
 */
export enum ArticleSourceEnum {
  ORIGINAL = '0',
  REPRINT = '1',
  TRANSLATION = '2',
  COMPILATION = '3',
}

/**
 * 文章来源展示文案：与字典 post_article_source 的 dictLabel 对齐（单一事实来源——
 * server init.sql 字典种子与 client 游客兜底映射均以此为准，改文案/增来源须同步 init.sql 字典区）
 */
export const ARTICLE_SOURCE_LABELS: Record<ArticleSourceEnum, string> = {
  [ArticleSourceEnum.ORIGINAL]: '原创',
  [ArticleSourceEnum.REPRINT]: '转载',
  [ArticleSourceEnum.TRANSLATION]: '翻译',
  [ArticleSourceEnum.COMPILATION]: '整理',
}

/**
 * 举报处理状态：0 待处理 1 成立 2 驳回
 * 举报理由/目标类型不走此枚举（运营可变数据，走字典 post_report_reason / post_report_target）
 */
export enum ReportStatusEnum {
  PENDING = '0',
  UPHELD = '1',
  DISMISSED = '2',
}

/**
 * 用户反馈类型：1 功能建议 2 问题反馈 3 其他（与字典 post_feedback_type 的 dictValue 保持一致）
 * 反馈类型是运营可扩值数据（走字典维护），此枚举仅作取值常量；反馈提交只要求登录不挂权限串
 */
export enum FeedbackTypeEnum {
  SUGGESTION = '1',
  BUG = '2',
  OTHER = '3',
}

/**
 * 反馈处理状态：0 待处理 1 已回复 2 已关闭（与字典 post_feedback_status 保持一致）
 * 终态（已回复/已关闭）不可重复处理：服务端按 status='0' 条件更新做乐观锁（同举报处理口径）
 */
export enum FeedbackStatusEnum {
  PENDING = '0',
  REPLIED = '1',
  CLOSED = '2',
}

/**
 * 排序规则：与 server PagingDto.isAsc 的取值约定一致
 */
export enum SortRuleEnum {
  ASCENDING = 'ascending',
  DESCENDING = 'descending',
}

/** 排序规则的字面量类型（前端拼查询参数时直接用字符串，绕开枚举字面量不可互相赋值的限制） */
export type SortRule = 'ascending' | 'descending';

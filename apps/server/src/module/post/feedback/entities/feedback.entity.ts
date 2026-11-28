import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { DeleteStatusEntity } from 'src/common/entities/base';

/**
 * 用户反馈实体类
 * 对应数据库表：post_feedback
 * 登录用户提交（身份已知，无 contact 字段）；不做 pending 去重（多条不同反馈合法），
 * 防刷靠用户维度 24h 窗口频控（service 层 count + idx_user_id/create_time 统计）；
 * 管理端删除为物理删除（同 post_report 口径），del_flag 仅为建表口径完整性保留（默认 '0'，业务不软删）。
 * 反馈类型存字典 dictValue（post_feedback_type），处理状态流转 0→1/2（终态不可重复处理，服务端条件更新门控）
 */
@Entity('post_feedback', { comment: '用户反馈库' })
@Index('idx_user_id', ['userId'])
@Index('idx_status', ['status'])
export class PostFeedbackEntity extends DeleteStatusEntity {
  @ApiProperty({ type: Number, description: '反馈 id' })
  @PrimaryGeneratedColumn({ name: 'id', comment: '反馈 id' })
  public id: number;

  @ApiProperty({ type: Number, description: '提交人用户ID' })
  @Column({ type: 'int', name: 'user_id', comment: '提交人用户ID（登录身份，无 contact 字段）' })
  public userId: number;

  @ApiProperty({ type: String, description: '反馈类型（字典 post_feedback_type 的 dictValue）' })
  @Column({ type: 'char', name: 'type', length: 1, comment: '反馈类型（1 功能建议 2 问题反馈 3 其他，字典 post_feedback_type）' })
  public type: string;

  @ApiProperty({ type: String, description: '反馈内容' })
  @Column({ type: 'varchar', name: 'content', length: 500, comment: '反馈内容（1-500 字）' })
  public content: string;

  @ApiProperty({ type: String, description: '截图附件（JSON 数组字符串）', required: false })
  // 存 JSON 数组字符串（如 '["/profile/upload/feedback/x.png"]'）：URL 全为 /profile/ 前缀的
  // 本站上传通道产物（服务端 DTO 校验前缀与张数），无附件为 null——不建关联表，
  // 反馈附件只随单据读写，无独立生命周期（同举报快照的单列口径）
  @Column({ type: 'varchar', name: 'attachments', length: 1000, nullable: true, comment: '截图附件（JSON 数组字符串，/profile/ 相对 URL，至多 3 张，无附件 null）' })
  public attachments: string;

  @ApiProperty({ type: String, description: '处理状态（0 待处理 1 已回复 2 已关闭）' })
  @Column({ type: 'char', name: 'status', length: 1, default: '0', comment: '处理状态（0 待处理 1 已回复 2 已关闭）' })
  public status: string;

  @ApiProperty({ type: String, description: '管理员回复内容', required: false })
  @Column({ type: 'varchar', name: 'reply_content', length: 500, nullable: true, comment: '管理员回复内容（回复必填，关闭可空说明）' })
  public replyContent: string;

  @ApiProperty({ type: Number, description: '处理人用户ID', required: false })
  @Column({ type: 'int', name: 'admin_id', nullable: true, comment: '处理人用户ID（未处理 null）' })
  public adminId: number;

  @ApiProperty({ type: Date, description: '处理时间', required: false })
  // precision 3 → datetime(3) 毫秒粒度：此列为反馈回复通知的定向投递时间依据，
  // 秒级粒度在同秒处理多条时会与通知水位比较口径混淆（同 post_report.handle_time 口径）
  @Column({ type: 'datetime', precision: 3, name: 'reply_time', nullable: true, comment: '处理时间（毫秒粒度）' })
  public replyTime: Date;

  @ApiProperty({ type: Date, description: '提交时间' })
  // precision 3 → datetime(3) 毫秒粒度（同 post_report.create_time 口径，24h 频控统计列）
  @CreateDateColumn({ type: 'datetime', precision: 3, name: 'create_time', comment: '提交时间（毫秒粒度，24h 频控统计列）' })
  public createTime: Date;
}

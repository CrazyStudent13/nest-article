import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 工作台待办逐条已读实体类
 * 对应数据库表：post_workbench_read
 * 已读口径：当前用户在工作区点击过该行（跳对应管理页查看）= 已读，未点击 = 未读（红点+摘要加粗）；
 * 与「处理过」无关（处理走各管理页）——待办/已办两 tab 统一口径，逐条标记（非水位模型）
 */
@Entity('post_workbench_read', { comment: '工作台待办逐条已读库' })
export class PostWorkbenchReadEntity {
  @ApiProperty({ type: Number, description: '自增 id' })
  @PrimaryGeneratedColumn({ type: 'int', comment: '自增 id' })
  public id: number;

  @ApiProperty({ type: Number, description: '标记人用户 id' })
  @Column({ type: 'int', name: 'user_id', comment: '标记人用户ID' })
  public userId: number;

  @ApiProperty({ type: String, description: '待办源（report 举报 / feedback 反馈）' })
  // source 与工作台源定义（TODO_SOURCE_DEFS）对齐：report/feedback，文章审核上线时扩展
  @Column({ type: 'varchar', name: 'source', length: 20, comment: '待办源（report 举报 / feedback 反馈）' })
  public source: string;

  @ApiProperty({ type: Number, description: '源记录 id' })
  @Column({ type: 'int', name: 'source_id', comment: '源记录 id（post_report.id / post_feedback.id）' })
  public sourceId: number;

  @ApiProperty({ type: Date, description: '标记时间' })
  // precision 3 → datetime(3) 毫秒粒度（同 post_feedback 口径）
  @CreateDateColumn({ type: 'datetime', precision: 3, name: 'read_time', comment: '标记时间（毫秒粒度）' })
  public readTime: Date;
}

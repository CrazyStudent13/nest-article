import { Column, CreateDateColumn, Entity, In, PrimaryGeneratedColumn, Repository } from 'typeorm';
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

/**
 * 按当前用户批查回填列表行已读状态（消费方：工作台队列 + 举报/反馈管理列表——逐条已读链路共用）
 * 无 (user, source, sourceId) 标记 = 未读（前端红点+摘要加粗）；list 行须含 id 与 isRead 字段，
 * source 为整批固定的待办源（管理列表整表同源；工作台混合源按源过滤后分次调用）
 * 一次 IN 批查替代逐行查（消 N+1）；无行直接返回不查询
 */
export async function attachWorkbenchReadState<T extends { id: number; isRead: boolean }>(
  list: T[],
  source: string,
  userId: number,
  readRepo: Repository<PostWorkbenchReadEntity>,
) {
  const ids = [...new Set(list.map((item) => item.id))];
  if (!ids.length) {
    return;
  }
  const rows = await readRepo.find({ where: { userId, source, sourceId: In(ids) }, select: ['sourceId'] });
  const readIds = new Set(rows.map((row) => row.sourceId));
  for (const item of list) {
    item.isRead = readIds.has(item.id);
  }
}

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base';

@Entity('sys_notice', {
  comment: '通知公告表',
})
export class SysNoticeEntity extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int', name: 'notice_id', comment: '公告ID' })
  public noticeId: number;

  @Column({ type: 'varchar', name: 'notice_title', length: 50, default: '', comment: '公告标题' })
  public noticeTitle: string;

  //公告类型（1通知 2公告 3举报反馈 4反馈回复，字典 sys_notice_type）
  @Column({ type: 'char', name: 'notice_type', length: 1, comment: '公告类型（1通知 2公告 3举报反馈 4反馈回复）' })
  public noticeType: string;

  @Column({ type: 'longtext', name: 'notice_content', default: null, comment: '公告内容' })
  public noticeContent: string;

  //定向接收人：null=全员公告；非 null=仅该用户可见的私密通知（举报反馈等系统私信，业务侧程序写入，
  //如 post/report 处理完成时给举报人与被下架作者的定向通知）
  @Column({ type: 'int', name: 'user_id', nullable: true, comment: '定向接收人用户ID（null 全员公告，非 null 仅该用户可见）' })
  public userId: number | null;
}

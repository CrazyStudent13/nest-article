import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ResultData } from 'src/common/utils/result';
import { hasPermission } from 'src/common/query';
import { UserDto } from 'src/module/system/user/user.decorator';
import { ReportStatusEnum, FeedbackStatusEnum } from '@nest-acticle/shared';
import { UserEntity } from 'src/module/system/user/entities/sys-user.entity';
import { ListTodoDto } from './dto/index';
import { PostReportService } from '../report/report.service';
import { PostFeedbackService } from '../feedback/feedback.service';

/**
 * 工作台服务：管理端首页待办源计数聚合 + 统一待办队列
 * 待办 = 各业务表待处理状态实时查询（举报/反馈 status='0'，未来文章审核 AuditStatusEnum.AUDITING），
 * 不建通用 todo 表（避免与各源状态机双向同步漂移）；待处理口径归各业务服务自管（countPending）
 * 服务层按 hasPermission（通配感知，同 article.service 口径）逐项过滤——不同管理员权限面不同，
 * 无权限的源不出现在计数与队列中，前端只渲染拿到的卡片/行（前端并发查各模块列表接口会对无权限模块 403 噪音）
 */
@Injectable()
export class WorkbenchService {
  constructor(
    private readonly reportService: PostReportService,
    private readonly feedbackService: PostFeedbackService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  /**
   * 待办汇总：按权限逐项过滤后的待处理计数列表（key + count）
   * 有权限的源并行计数（各一张表 COUNT），key 为前端卡片映射约定：report/feedback，文章审核上线时增量加项
   */
  async summary(user: UserDto) {
    const entries: Array<[string, Promise<number>]> = [];
    if (hasPermission(user, 'post:report:list')) {
      entries.push(['report', this.reportService.countPending()]);
    }
    if (hasPermission(user, 'post:feedback:list')) {
      entries.push(['feedback', this.feedbackService.countPending()]);
    }

    const counts = await Promise.all(entries.map(([, count]) => count));
    return ResultData.ok({ items: entries.map(([key], index) => ({ key, count: counts[index] })) });
  }

  /**
   * 统一待办队列：有权管理的源 UNION ALL 归一化（source/摘要/提交人/时间）后按提交时间倒序 DB 侧分页
   * 行只读不承载处理——处理交互长在各自管理页（举报弹窗/反馈抽屉），行点击由前端跳对应管理页（status=0 深链）
   * total 复用各源 countPending 相加（与 UNION 的 WHERE 同口径，省一次 UNION COUNT）
   * UNION 分支按权限拼接：无权限的源连行都不出现（同 summary 纪律）；分支内只有枚举常量参数，无外部输入
   */
  async findTodos(query: ListTodoDto, user: UserDto) {
    const branches: string[] = [];
    const params: string[] = [];
    const counts: Array<Promise<number>> = [];
    if (hasPermission(user, 'post:report:list')) {
      branches.push(
        "SELECT 'report' AS source, id, target_snapshot AS summary, reporter_id AS submitter_id, create_time FROM post_report WHERE status = ?",
      );
      params.push(ReportStatusEnum.PENDING);
      counts.push(this.reportService.countPending());
    }
    if (hasPermission(user, 'post:feedback:list')) {
      branches.push(
        "SELECT 'feedback' AS source, id, content AS summary, user_id AS submitter_id, create_time FROM post_feedback WHERE status = ?",
      );
      params.push(FeedbackStatusEnum.PENDING);
      counts.push(this.feedbackService.countPending());
    }
    if (!branches.length) {
      return ResultData.ok({ list: [], total: 0 });
    }

    const pageSize = query.pageSize ?? 10;
    const pageNum = query.pageNum ?? 1;
    const rows: Array<{ source: string; id: number; summary: string; submitter_id: number; create_time: Date }> =
      await this.userRepo.manager.query(
        `${branches.join(' UNION ALL ')} ORDER BY create_time DESC, id DESC LIMIT ?, ?`,
        [...params, (pageNum - 1) * pageSize, pageSize],
      );
    const total = (await Promise.all(counts)).reduce((sum, count) => sum + count, 0);

    const list = rows.map((row) => ({
      source: row.source,
      id: row.id,
      summary: row.summary,
      submitterId: row.submitter_id,
      submitterName: null as string | null,
      createTime: row.create_time,
    }));
    await this.attachSubmitterNames(list);

    return ResultData.ok({ list, total });
  }

  /**
   * 批量回填提交人昵称：举报人与反馈提交人都是 sys_user，一次 IN 批查替代逐行查（消 N+1）
   * 不过滤 delFlag——与举报/反馈管理列表的 leftJoin 口径一致，注销账号的待办行仍显示昵称
   */
  private async attachSubmitterNames(list: Array<{ submitterId: number; submitterName: string | null }>) {
    const ids = [...new Set(list.map((item) => item.submitterId))];
    if (!ids.length) {
      return;
    }
    const users = await this.userRepo.find({ where: { userId: In(ids) }, select: ['userId', 'nickName'] });
    const nameMap = new Map<number, string>(users.map((user) => [user.userId, user.nickName] as [number, string]));
    for (const item of list) {
      item.submitterName = nameMap.get(item.submitterId) ?? null;
    }
  }
}

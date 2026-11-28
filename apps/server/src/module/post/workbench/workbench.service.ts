import { Injectable } from '@nestjs/common';
import { ResultData } from 'src/common/utils/result';
import { hasPermission } from 'src/common/query';
import { UserDto } from 'src/module/system/user/user.decorator';
import { PostReportService } from '../report/report.service';
import { PostFeedbackService } from '../feedback/feedback.service';

/**
 * 工作台服务：管理端首页待办源计数聚合
 * 待办 = 各业务表待处理状态实时计数（举报/反馈 status='0'，未来文章审核 AuditStatusEnum.AUDITING），
 * 不建通用 todo 表（避免与各源状态机双向同步漂移）；待处理口径归各业务服务自管（countPending）
 * 服务层按 hasPermission（通配感知，同 article.service 口径）逐项过滤——不同管理员权限面不同，
 * 无权限的源不出现在响应中，前端只渲染拿到的卡片（前端并发查各模块列表接口会对无权限模块 403 噪音）
 */
@Injectable()
export class WorkbenchService {
  constructor(
    private readonly reportService: PostReportService,
    private readonly feedbackService: PostFeedbackService,
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
}

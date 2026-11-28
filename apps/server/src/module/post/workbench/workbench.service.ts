import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ResultData } from 'src/common/utils/result';
import { hasPermission } from 'src/common/query';
import { UserDto } from 'src/module/system/user/user.decorator';
import { ReportStatusEnum, FeedbackStatusEnum } from '@nest-acticle/shared';
import { UserEntity } from 'src/module/system/user/entities/sys-user.entity';
import { ListTodoDto, MarkTodoReadDto, WorkbenchTodoTabEnum } from './dto/index';
import { PostWorkbenchReadEntity } from './entities/workbench-read.entity';
import { PostReportService } from '../report/report.service';
import { PostFeedbackService } from '../feedback/feedback.service';

/**
 * 待办源分支定义：UNION 归一化的表/列映射 + 两 tab 的 status 条件与参数 + 服务端管理权限串
 * report 摘要 = 举报时快照（文章标题+简介/用户昵称），历史/直插数据无快照时用举报理由内容兜底（COALESCE 空串也算空）；
 * 新增待办源（文章审核等）在此加一条定义 + 各业务服务补 countPending/countDone，聚合层零改动
 */
const TODO_SOURCE_DEFS = {
  report: {
    table: 'post_report',
    summary: "COALESCE(NULLIF(target_snapshot, ''), reason_content)",
    submitter: 'reporter_id',
    finishTime: 'handle_time',
    pending: { cond: 'status = ?', params: [ReportStatusEnum.PENDING] },
    done: { cond: 'status IN (?, ?)', params: [ReportStatusEnum.UPHELD, ReportStatusEnum.DISMISSED] },
    listPerm: 'post:report:list',
  },
  feedback: {
    table: 'post_feedback',
    summary: 'content',
    submitter: 'user_id',
    finishTime: 'reply_time',
    pending: { cond: 'status = ?', params: [FeedbackStatusEnum.PENDING] },
    done: { cond: 'status IN (?, ?)', params: [FeedbackStatusEnum.REPLIED, FeedbackStatusEnum.CLOSED] },
    listPerm: 'post:feedback:list',
  },
} as const;

type TodoSourceKey = keyof typeof TODO_SOURCE_DEFS;

/**
 * 工作台服务：管理端首页统一待办队列（待办/已办双 tab）
 * 待办 = 各业务表待处理状态实时查询，不建通用 todo 表（避免与各源状态机双向同步漂移）；
 * 已办 = 全部已处理记录（团队视角，A 处理的 B 可见——内容队列不是个人任务系统）
 * 服务层按 hasPermission（通配感知，同 article.service 口径）逐源过滤——无权限的源连 UNION 分支都不拼，
 * 前端只渲染拿到的行（前端并发查各模块列表接口会对无权限模块 403 噪音）
 */
@Injectable()
export class WorkbenchService {
  constructor(
    private readonly reportService: PostReportService,
    private readonly feedbackService: PostFeedbackService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(PostWorkbenchReadEntity)
    private readonly readRepo: Repository<PostWorkbenchReadEntity>,
  ) {}

  /**
   * 待办汇总：按权限逐项过滤后的待处理计数列表（key + count）
   * 首页改版后前端已不再消费（tab 徽标改由 todos 响应捎回），接口保留给二期侧栏菜单待办角标复用
   */
  async summary(user: UserDto) {
    const sources = this.permittedSources(user);
    const entries: Array<[string, Promise<number>]> = sources.map((source) => [
      source,
      source === 'report' ? this.reportService.countPending() : this.feedbackService.countPending(),
    ]);

    const counts = await Promise.all(entries.map(([, count]) => count));
    return ResultData.ok({ items: entries.map(([key], index) => ({ key, count: counts[index] })) });
  }

  /**
   * 统一待办队列（待办/已办双 tab）：有权源 UNION ALL 归一化（source/摘要/提交人/提交时间/办结时间）
   * 按提交时间排序 DB 侧分页；tab/来源/时间范围筛选进同一谓词，total 对 UNION 子查询 COUNT 与列表同口径
   * 行只读不承载处理——处理交互长在各自管理页（举报弹窗/反馈抽屉），行点击由前端跳对应管理页：
   * 待办行带 status=0 深链预置筛选，已办行不带筛选（已办混两种终态，带 0 跳过去看的是待处理反直觉）
   * tabs 徽标计数 = 有权源全局计数（不受来源/时间筛选影响），随响应捎回供 tab 标签展示
   */
  async findTodos(query: ListTodoDto, user: UserDto) {
    const permitted = this.permittedSources(user);
    // 来源筛选与权限取交集：筛选了无权限的源等于没得选，返回空
    const sources = permitted.filter((source) => !query.source || query.source === source);
    if (!sources.length) {
      return ResultData.ok({ list: [], total: 0, tabs: { pending: 0, done: 0 } });
    }

    const tab = query.tab ?? WorkbenchTodoTabEnum.PENDING;
    const beginTime = query.params?.beginTime;
    const endTime = query.params?.endTime;

    const branches: string[] = [];
    const params: string[] = [];
    for (const source of sources) {
      const def = TODO_SOURCE_DEFS[source];
      const statusDef = tab === WorkbenchTodoTabEnum.DONE ? def.done : def.pending;
      let branch = `SELECT '${source}' AS source, id, ${def.summary} AS summary, ${def.submitter} AS submitter_id, create_time AS submit_time, ${def.finishTime} AS finish_time FROM ${def.table} WHERE ${statusDef.cond}`;
      params.push(...statusDef.params);
      if (beginTime && endTime) {
        branch += ' AND create_time BETWEEN ? AND ?';
        params.push(beginTime, endTime);
      }
      branches.push(branch);
    }
    const unionSql = branches.join(' UNION ALL ');

    const countRows: Array<{ cnt: number }> = await this.userRepo.manager.query(`SELECT COUNT(*) AS cnt FROM ( ${unionSql} ) t`, params);
    const total = Number(countRows[0]?.cnt || 0);

    const pageSize = query.pageSize ?? 10;
    const pageNum = query.pageNum ?? 1;
    // 固定按提交时间倒序（排序方向切换已删：分页兜底查找，查详情去对应管理页）；id 同向兜底同刻记录的稳定序
    const rows: Array<{ source: string; id: number; summary: string; submitter_id: number; submit_time: Date; finish_time: Date | null }> =
      await this.userRepo.manager.query(
        `${unionSql} ORDER BY submit_time DESC, id DESC LIMIT ?, ?`,
        [...params, (pageNum - 1) * pageSize, pageSize],
      );

    const list = rows.map((row) => ({
      source: row.source,
      id: row.id,
      summary: row.summary,
      submitterId: row.submitter_id,
      submitterName: null as string | null,
      submitTime: row.submit_time,
      finishTime: row.finish_time,
      isRead: false,
    }));
    await this.attachSubmitterNames(list);
    await this.attachReadState(list, user.userId);

    // tab 徽标计数：有权源全局计数并行相加（与列表查询解耦，切筛选徽标不动）
    const countAcrossSources = async (method: 'countPending' | 'countDone') => {
      const counts = await Promise.all(
        permitted.map((source) => (source === 'report' ? this.reportService[method]() : this.feedbackService[method]())),
      );
      return counts.reduce((sum, count) => sum + count, 0);
    };
    const [pending, done] = await Promise.all([countAcrossSources('countPending'), countAcrossSources('countDone')]);

    return ResultData.ok({ list, total, tabs: { pending, done } });
  }

  /**
   * 标记待办已读（工作区行点击时调用）
   * 唯一索引 INSERT IGNORE 幂等：重复标记静默（同举报去重的落库口径）；
   * 个人视图状态写入无内容返回——仅登录不校验源权限（对不可见源标记无泄露无意义），source 枚举由 DTO 校验
   */
  async markRead(dto: MarkTodoReadDto, userId: number) {
    await this.userRepo.manager.query(
      'INSERT IGNORE INTO post_workbench_read (user_id, source, source_id) VALUES (?, ?, ?)',
      [userId, dto.source, dto.id],
    );
    return ResultData.ok();
  }

  /**
   * 当前用户有权管理的待办源 key 列表（服务层权限过滤的唯一入口，通配感知）
   */
  private permittedSources(user: UserDto): TodoSourceKey[] {
    return (Object.keys(TODO_SOURCE_DEFS) as TodoSourceKey[]).filter((source) => hasPermission(user, TODO_SOURCE_DEFS[source].listPerm));
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

  /**
   * 批量回填当前用户的已读状态：无 (user, source, sourceId) 标记 = 未读（前端红点+摘要加粗）
   * 分页不依赖已读状态，后置批查回填不碰 UNION；按源分组两段 IN 合并一次 Or 查询（消 N+1）
   */
  private async attachReadState(list: Array<{ source: string; id: number; isRead: boolean }>, userId: number) {
    const idsBySource = new Map<string, number[]>();
    for (const item of list) {
      idsBySource.set(item.source, [...(idsBySource.get(item.source) || []), item.id]);
    }
    if (!idsBySource.size) {
      return;
    }
    const rows = await this.readRepo.find({
      where: [...idsBySource.entries()].map(([source, ids]) => ({ userId, source, sourceId: In(ids) })),
      select: ['source', 'sourceId'],
    });
    const readKeys = new Set(rows.map((row) => `${row.source}:${row.sourceId}`));
    for (const item of list) {
      item.isRead = readKeys.has(`${item.source}:${item.id}`);
    }
  }
}

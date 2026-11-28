import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Not, Repository } from 'typeorm';
import { ResultData } from 'src/common/utils/result';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { applyLike, paginate } from 'src/common/query';
import { PublishStatusEnum, ReportStatusEnum } from '@nest-acticle/shared';
import { PostReportEntity } from './entities/report.entity';
import { CreateReportDto, HandleReportDto, ListReportDto, ReportHandleActionEnum, ReportTargetTypeEnum } from './dto/index';
import { PostArticleEntity } from '../article/entities/article.entity';
import { UserEntity } from 'src/module/system/user/entities/sys-user.entity';
import { SysNoticeEntity } from 'src/module/system/notice/entities/notice.entity';
import { DictService } from 'src/module/system/dict/dict.service';
import { UserService } from 'src/module/system/user/user.service';
import { StatusEnum } from 'src/common/enum/index';
import { SYS_USER_TYPE } from 'src/common/constant/index';

/** 单用户 24h 内跨目标举报上限（防刷；同目标重复由唯一索引挡住，这里管的是「换目标刷举报」） */
const MAX_REPORTS_PER_DAY = 10;

/**
 * 文章自动下架阈值：同一文章的**不同用户**待处理举报达到该人数时，提交举报事务内自动下架。
 * 自动下架是保护性措施（先下架防扩散）——举报记录保持待处理由管理员复核，可恢复上架；
 * 阈值以内的人工举报不触发，作者自恢复被挡的口径见 article.service.update（同阈值拦截）
 */
export const AUTO_OFFLINE_REPORTERS = 100;

/**
 * 举报服务
 * 去重语义：同一人对同一目标**同时至多一条待处理举报**（uk_reporter_pending 唯一索引 +
 * pending_flag 的 NULL 豁免——待处理中 INSERT IGNORE 被拦下，处理完成后可再次举报），
 * affectedRows=0 即「已有待处理的举报」报错返回（不同于关注动作的幂等静默，重复举报是调用方错误）
 * 管理端处理统一走事务：结论流转用 status='0' 的条件更新做乐观锁（并发处理只有一方生效），
 * 处置动作（下架文章/停用用户）与结论同事务落库，避免「成立但忘了执行」的不一致
 */
@Injectable()
export class PostReportService {
  private readonly logger = new Logger(PostReportService.name);

  constructor(
    @InjectRepository(PostReportEntity)
    private readonly reportRepo: Repository<PostReportEntity>,
    @InjectRepository(PostArticleEntity)
    private readonly articleRepo: Repository<PostArticleEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly dictService: DictService,
    private readonly userService: UserService,
  ) {}

  /**
   * 提交举报（登录用户）
   * 目标存在性校验 → 禁止举报自己/自己的文章 → 24h 频控 → INSERT IGNORE 落库
   * 文章仅允许举报对外可见（已发布）的，已删除/草稿/已下架一律按不存在处理（不泄露未公开内容存在性）；
   * 用户目标只接受未注销账号（同 guest/profile 的 delFlag 口径）
   * 理由/目标类型的合法性按字典缓存校验（后端流程对具体 value 保持中性，运营扩理由不发版）
   */
  async create(dto: CreateReportDto, userId: number) {
    await this.assertDictValues(dto.targetType, dto.reasonType);

    // 举报时快照（文章标题+简介 / 用户昵称）：目标后续被编辑或删除后，管理端仍能还原被举报内容
    let targetSnapshot = '';
    if (dto.targetType === ReportTargetTypeEnum.POST) {
      const article = await this.articleRepo.findOne({
        where: { id: dto.targetId, delFlag: '0' },
        select: ['id', 'userId', 'title', 'desc', 'publishStatus'],
      });
      if (!article) {
        throw new BusinessException(500, '举报的文章不存在或已删除');
      }
      if (article.userId === userId) {
        throw new BusinessException(500, '不能举报自己的文章');
      }
      if (article.publishStatus !== PublishStatusEnum.PUBLISHED) {
        throw new BusinessException(500, '举报的文章不存在或已下架');
      }
      targetSnapshot = `${article.title}${article.desc ? ` · ${article.desc}` : ''}`;
    } else {
      if (dto.targetId === userId) {
        throw new BusinessException(500, '不能举报自己');
      }
      const target = await this.userRepo.findOne({
        where: { userId: dto.targetId, delFlag: '0' },
        select: ['userId', 'nickName'],
      });
      if (!target) {
        throw new BusinessException(500, '举报的用户不存在');
      }
      targetSnapshot = target.nickName;
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await this.reportRepo.count({
      where: { reporterId: userId, createTime: MoreThan(since) },
    });
    if (recent >= MAX_REPORTS_PER_DAY) {
      throw new BusinessException(500, '举报过于频繁，请 24 小时后再试');
    }

    return this.userRepo.manager.transaction(async (manager) => {
      // 参数化 INSERT IGNORE + 待处理唯一索引（pending_flag=1，处理完置 NULL 豁免）：
      // 并发重复提交由数据库兜底——同一目标同时至多一条待处理举报，处理完成后可再次举报
      const res = await manager.query(
        'INSERT IGNORE INTO post_report (target_type, target_id, reporter_id, reason_type, reason_content, target_snapshot, pending_flag) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [dto.targetType, dto.targetId, userId, dto.reasonType, dto.reasonContent || null, targetSnapshot],
      );
      if (res.affectedRows === 0) {
        throw new BusinessException(500, '该内容已有待处理的举报，请耐心等待处理结果');
      }

      // 文章目标：不同用户待处理举报达到阈值时自动下架（保护性措施，人工复核在举报管理）
      if (dto.targetType === ReportTargetTypeEnum.POST) {
        await this.autoOfflineIfThresholdReached(manager, dto.targetId, userId);
      }

      this.logger.log(`用户 ${userId} 举报 ${dto.targetType} ${dto.targetId}（理由 ${dto.reasonType}）`);
      return ResultData.ok({ reported: true });
    });
  }

  /**
   * 当前用户对目标是否有待处理的举报（举报按钮「已举报」置灰态）
   * 只看待处理：处理完成（成立/驳回）后按钮恢复可点，可就新情况再次举报
   */
  async statusByTarget(targetType: string, targetId: number, userId: number) {
    const reported = !!(await this.reportRepo.findOne({
      where: { reporterId: userId, targetType, targetId, status: ReportStatusEnum.PENDING },
      select: ['id'],
    }));
    return ResultData.ok({ reported });
  }

  /**
   * 待处理举报计数（工作台待办源；物理删除口径无 delFlag 过滤）
   */
  async countPending() {
    return this.reportRepo.count({ where: { status: ReportStatusEnum.PENDING } });
  }

  /**
   * 已处理举报计数（工作台已办 tab 徽标；成立/驳回均计，团队视角不区分处理人）
   */
  async countDone() {
    return this.reportRepo.count({ where: { status: Not(ReportStatusEnum.PENDING) } });
  }

  /**
   * 举报管理列表（管理端，联举报人/处理人昵称；目标摘要按类型批查回填）
   * 取数走 getRawAndEntities：report 实体 + join 出的两端用户展示列手动拼平
   */
  async findAdminList(query: ListReportDto) {
    const entity = this.reportRepo.createQueryBuilder('report');
    entity
      .leftJoin(UserEntity, 'reporter', 'reporter.userId = report.reporterId')
      .leftJoin(UserEntity, 'handler', 'handler.userId = report.handlerId')
      .addSelect(['reporter.nickName', 'handler.nickName'])
      .where('1 = 1');

    if (query.targetType) {
      entity.andWhere('report.targetType = :targetType', { targetType: query.targetType });
    }
    if (query.reasonType) {
      entity.andWhere('report.reasonType = :reasonType', { reasonType: query.reasonType });
    }
    if (query.status) {
      entity.andWhere('report.status = :status', { status: query.status });
    }
    applyLike(entity, 'reporter.nickName', query.reporterName);

    if (query.params?.beginTime && query.params?.endTime) {
      entity.andWhere('report.createTime BETWEEN :start AND :end', {
        start: query.params.beginTime,
        end: query.params.endTime,
      });
    }

    paginate(entity, query);

    entity.orderBy('report.createTime', 'DESC');

    const { raw } = await entity.getRawAndEntities();
    const total = await entity.getCount();

    // raw 键格式为「别名_数据库列名」（非实体属性名）
    const list = raw.map((row: Record<string, any>) => ({
      id: row.report_id,
      targetType: row.report_target_type,
      targetId: row.report_target_id,
      targetSnapshot: row.report_target_snapshot,
      reporterId: row.report_reporter_id,
      reporterName: row.reporter_nick_name,
      reasonType: row.report_reason_type,
      reasonContent: row.report_reason_content,
      status: row.report_status,
      handleAction: row.report_handle_action,
      handleRemark: row.report_handle_remark,
      handlerName: row.handler_nick_name,
      handleTime: row.report_handle_time,
      createTime: row.report_create_time,
      targetTitle: null as string | null,
      targetName: null as string | null,
    }));
    await this.attachTargetInfo(list);

    return ResultData.ok({ list, total });
  }

  /**
   * 处理举报（管理端）：结论流转 + 可选处置动作同事务落库
   * - 成立时动作可选：unpublish 下架文章 / disableUser 停用用户，须与目标类型匹配
   * - 驳回不携带处置动作（服务端强制置空）
   * - 停用系统内置账号（userType=SYS）拒绝，同管理端用户启停口径
   * - 同事务写入 sys_notice 定向通知（type=3 举报反馈）：处理结果发给举报人，下架处置另发被下架文章作者——
   *   前台「系统通知」栏可见，scope 过滤保证私密通知只对本人可见
 * - 停用后的会话处置在事务提交后执行（改写会话快照为停用态 + 删键，两步互为兜底，失败仅记日志不阻断处理结果）
 */
  async handle(id: number, dto: HandleReportDto, handlerUserId: number) {
    // 驳回强制无动作；成立时按勾选执行
    const action: string | null = dto.status === ReportStatusEnum.UPHELD ? dto.handleAction || null : null;
    // 停用动作的事务后置步骤：提交后改写目标用户会话快照为停用态并删键（身份验证按快照 status 校验，
    // 两步任一成功停用即生效，不依赖删键全部成功）
    let disableTargetId: number | null = null;

    const result = await this.userRepo.manager.transaction(async (manager) => {
      const report = await manager.findOne(PostReportEntity, { where: { id } });
      if (!report) {
        throw new BusinessException(500, '举报记录不存在');
      }
      if (report.status !== ReportStatusEnum.PENDING) {
        throw new BusinessException(500, '该举报已处理，请勿重复操作');
      }

      // 目标摘要（通知文案用）：文章取标题/作者，用户取昵称；unpublish 时作者 id 供下架通知定向
      let targetDesc = '';
      let offlineAuthorId: number | null = null;
      let offlineTitle = '';
      let unpublishApplied = false;
      if (report.targetType === ReportTargetTypeEnum.POST) {
        const article = await manager.findOne(PostArticleEntity, {
          where: { id: report.targetId },
          select: ['id', 'title', 'userId', 'delFlag', 'publishStatus'],
        });
        targetDesc = article ? `文章《${article.title}》` : `文章 #${report.targetId}`;
        offlineTitle = article?.title || '';
        offlineAuthorId = article?.userId ?? null;
      } else {
        const target = await manager.findOne(UserEntity, {
          where: { userId: report.targetId },
          select: ['userId', 'nickName'],
        });
        targetDesc = target ? `用户 @${target.nickName}` : `用户 #${report.targetId}`;
      }

      if (action === ReportHandleActionEnum.UNPUBLISH) {
        if (report.targetType !== ReportTargetTypeEnum.POST) {
          throw new BusinessException(500, '下架动作仅适用于文章举报');
        }
        // 条件更新（未删除 + 仍在架）：已下架/已删除的文章不重复动作，也不给作者发「已下架」通知
        const offline = await manager.update(
          PostArticleEntity,
          { id: report.targetId, delFlag: '0', publishStatus: PublishStatusEnum.PUBLISHED },
          { publishStatus: PublishStatusEnum.OFFLINE },
        );
        unpublishApplied = !!offline.affected;
      } else if (action === ReportHandleActionEnum.DISABLE_USER) {
        if (report.targetType !== ReportTargetTypeEnum.USER) {
          throw new BusinessException(500, '停用动作仅适用于用户举报');
        }
        const target = await manager.findOne(UserEntity, { where: { userId: report.targetId }, select: ['userId', 'userType'] });
        if (!target) {
          throw new BusinessException(500, '被举报用户不存在');
        }
        if (target.userType === SYS_USER_TYPE.SYS) {
          throw new BusinessException(500, '系统角色不可停用');
        }
        // 停用原因/时间随状态落库：被停用用户只能通过登录拦截获知处置说明（站内信收不到）
        await manager.update(
          UserEntity,
          { userId: report.targetId },
          {
            status: StatusEnum.STOP,
            stopReason: dto.stopReason?.trim() || '举报核实成立，内容违规',
            stopTime: new Date(),
          },
        );
        disableTargetId = report.targetId;
      }

      // 条件更新（status='0'）做乐观锁：并发处理只有一方生效，重复处理报错返回；
      // pending_flag 同步置 NULL，解除该举报人对该目标的待处理占用（可再次举报）
      const res = await manager.update(
        PostReportEntity,
        { id, status: ReportStatusEnum.PENDING },
        {
          status: dto.status,
          handleAction: action,
          handleRemark: dto.handleRemark || null,
          handlerId: handlerUserId,
          handleTime: new Date(),
          pendingFlag: null,
        },
      );
      if (!res.affected) {
        throw new BusinessException(500, '该举报已处理，请勿重复操作');
      }

      // 定向通知：处理结果必发举报人；下架处置再发被下架文章作者（Markdown 正文，通知详情页渲染）
      // 驳回不向举报人明说「未成立」（B 站口径），改为承诺持续关注，避免打击后续举报意愿
      const actionText =
        action === ReportHandleActionEnum.UNPUBLISH ? '，内容已下架' : action === ReportHandleActionEnum.DISABLE_USER ? '，该用户已被停用' : '';
      await manager.insert(SysNoticeEntity, {
        noticeTitle: '你举报的内容已处理',
        noticeType: '3',
        noticeContent:
          dto.status === ReportStatusEnum.UPHELD
            ? `你举报的${targetDesc}已完成处理：**举报成立**${actionText}。感谢你帮助维护社区环境。`
            : `你举报的${targetDesc}已完成处理，我们会重点持续关注该内容。感谢你帮助维护社区环境。`,
        userId: report.reporterId,
        status: StatusEnum.NORMAL,
        createBy: 'system',
      });
      if (action === ReportHandleActionEnum.UNPUBLISH && unpublishApplied && offlineAuthorId) {
        await manager.insert(SysNoticeEntity, {
          noticeTitle: `你的文章《${offlineTitle}》已下架`,
          noticeType: '3',
          noticeContent: `你的文章《${offlineTitle}》因举报核实成立已被下架。如有疑问，请联系管理员申诉。`,
          userId: offlineAuthorId,
          status: StatusEnum.NORMAL,
          createBy: 'system',
        });
      }

      this.logger.log(`举报 ${id} 处理完成：结论 ${dto.status}，动作 ${action ?? '无'}，处理人 ${handlerUserId}`);
      return ResultData.ok();
    });

    if (disableTargetId) {
      try {
        await this.userService.disableUserSessions([disableTargetId]);
      } catch (error) {
        this.logger.error(`举报处理停用用户 ${disableTargetId} 后处置会话失败`, error as Error);
      }
    }

    return result;
  }

  /**
   * 管理端批量删除举报记录：物理删除（同 post_follow 口径），仅清理历史/待处理记录本身；
   * 重复举报的去重由待处理唯一索引承担，与删除动作无关（处理完本就可再次举报）
   */
  async removeByIds(ids: number[]) {
    return this.reportRepo.manager.transaction(async (manager) => {
      const rows = await manager.find(PostReportEntity, { where: { id: In(ids) } });
      if (!rows.length) {
        return ResultData.ok();
      }

      await manager.delete(PostReportEntity, { id: In(rows.map((row) => row.id)) });

      this.logger.log(`管理员删除举报记录 ${rows.length} 条`);
      return ResultData.ok();
    });
  }

  /**
   * 文章自动下架：不同用户待处理举报达到 AUTO_OFFLINE_REPORTERS 时触发
   * - 条件更新只在该文章仍对外可见（已发布）时生效——已下架（含人工处置）不重复动作、不发通知
   * - 举报记录保持待处理，管理员复核后决定维持或恢复；作者自恢复被同阈值拦截（article.service.update）
   * - 事务内执行：下架与本条举报原子落库；通知写在下架成功之后（affected 门控，防重复发送）
   */
  private async autoOfflineIfThresholdReached(manager: any, articleId: number, justReportedBy: number) {
    const pendingRows: Array<{ cnt: string }> = await manager.query(
      'SELECT COUNT(DISTINCT reporter_id) AS cnt FROM post_report WHERE target_type = ? AND target_id = ? AND status = ?',
      [ReportTargetTypeEnum.POST, articleId, ReportStatusEnum.PENDING],
    );
    const distinctReporters = Number(pendingRows[0]?.cnt || 0);
    if (distinctReporters < AUTO_OFFLINE_REPORTERS) {
      return;
    }

    // 条件更新补 delFlag='0'，与 handle() 人工下架口径对齐：已软删文章不再触发自动下架动作与作者通知
    const offline = await manager.update(
      PostArticleEntity,
      { id: articleId, delFlag: '0', publishStatus: PublishStatusEnum.PUBLISHED },
      { publishStatus: PublishStatusEnum.OFFLINE },
    );
    if (!offline.affected) {
      return;
    }

    const article = await manager.findOne(PostArticleEntity, {
      where: { id: articleId },
      select: ['id', 'title', 'userId'],
    });
    if (article?.userId) {
      await manager.insert(SysNoticeEntity, {
        noticeTitle: `你的文章《${article.title}》已自动下架`,
        noticeType: '3',
        noticeContent: `你的文章《${article.title}》已被 ${distinctReporters} 位用户举报，为避免争议内容扩散已自动下架，待管理员复核。如有疑问，请联系管理员申诉。`,
        userId: article.userId,
        status: StatusEnum.NORMAL,
        createBy: 'system',
      });
    }

    this.logger.warn(`文章 ${articleId} 被 ${distinctReporters} 位用户举报（含用户 ${justReportedBy} 本条），达到阈值自动下架`);
  }

  /**
   * 举报目标类型/理由的合法性校验：dictValue 必须存在于对应字典类型的启用项中
   * 走 DictService 全量字典缓存（Redis），高频提交路径零额外查询压力
   */
  private async assertDictValues(targetType: string, reasonType: string) {
    const [targetRes, reasonRes] = await Promise.all([
      this.dictService.findOneDataType('post_report_target'),
      this.dictService.findOneDataType('post_report_reason'),
    ]);
    const activeValues = (res: { data?: any[] }) =>
      ((res.data || []) as Array<{ dictValue: string; status: string }>).filter((item) => item.status === StatusEnum.NORMAL).map((item) => item.dictValue);

    if (!activeValues(targetRes).includes(targetType)) {
      throw new BusinessException(500, '举报目标类型无效');
    }
    if (!activeValues(reasonRes).includes(reasonType)) {
      throw new BusinessException(500, '举报理由无效');
    }
  }

  /**
   * 批量回填目标摘要：post 行查文章标题、user 行查被举报人昵称（一次 IN 批查替代逐行 findOne，消 N+1）
   * 消费方：举报反馈列表（前台）与举报管理列表（管理端）
   */
  private async attachTargetInfo(
    list: Array<{ targetType: string; targetId: number; targetTitle: string | null; targetName: string | null }>,
  ) {
    if (!list.length) {
      return;
    }
    const postIds = list.filter((item) => item.targetType === ReportTargetTypeEnum.POST).map((item) => item.targetId);
    const userIds = list.filter((item) => item.targetType === ReportTargetTypeEnum.USER).map((item) => item.targetId);

    const [posts, users] = await Promise.all([
      postIds.length ? this.articleRepo.find({ where: { id: In(postIds) }, select: ['id', 'title'] }) : [],
      userIds.length ? this.userRepo.find({ where: { userId: In(userIds) }, select: ['userId', 'nickName'] }) : [],
    ]);
    // 显式元组类型：map 返回二维数组会推断成 (string|number)[][]，Map 构造拿不到键值类型
    const titleMap = new Map<number, string>(posts.map((post) => [post.id, post.title] as [number, string]));
    const nameMap = new Map<number, string>(users.map((user) => [user.userId, user.nickName] as [number, string]));

    for (const item of list) {
      if (item.targetType === ReportTargetTypeEnum.POST) {
        item.targetTitle = titleMap.get(item.targetId) ?? null;
      } else {
        item.targetName = nameMap.get(item.targetId) ?? null;
      }
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Not, Repository } from 'typeorm';
import { ResultData } from 'src/common/utils/result';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { applyLike, attachUserInfo, paginate } from 'src/common/query';
import { FeedbackStatusEnum } from '@nest-acticle/shared';
import { PostFeedbackEntity } from './entities/feedback.entity';
import { attachWorkbenchReadState, PostWorkbenchReadEntity } from '../workbench/entities/workbench-read.entity';
import { CreateFeedbackDto, HandleFeedbackDto, ListFeedbackDto } from './dto/index';
import { UserEntity } from 'src/module/system/user/entities/sys-user.entity';
import { SysNoticeEntity } from 'src/module/system/notice/entities/notice.entity';
import { DictService } from 'src/module/system/dict/dict.service';
import { StatusEnum } from 'src/common/enum/index';

/** 单用户 24h 内反馈提交上限（防刷；不做 pending 去重——多条不同反馈合法，这里只管「连环刷」） */
const MAX_FEEDBACKS_PER_DAY = 10;

/** 通知正文引用的反馈内容摘要长度：500 字全文进通知不可读，截断留摘要（详情在反馈管理后台） */
const NOTICE_CONTENT_SUMMARY_LENGTH = 40;

/**
 * 用户反馈服务
 * 提交：登录即可（不挂权限串，反馈是所有登录用户的基本能力，同点赞/关注/举报登录路径口径），
 * 类型合法性按字典缓存校验，24h 窗口频控防刷
 * 管理端处理统一走事务：结论流转用 status='0' 的条件更新做乐观锁（终态不可重复处理，并发处理只有一方生效），
 * 回复/关闭通知与结论同事务落库（sys_notice 定向通知 noticeType='4' 反馈回复），
 * 前台「系统通知」栏承接，逐条已读模型（post_notify_read category='n:<noticeId>'）——不新增通知分类
 */
@Injectable()
export class PostFeedbackService {
  private readonly logger = new Logger(PostFeedbackService.name);

  constructor(
    @InjectRepository(PostFeedbackEntity)
    private readonly feedbackRepo: Repository<PostFeedbackEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(PostWorkbenchReadEntity)
    private readonly readRepo: Repository<PostWorkbenchReadEntity>,
    private readonly dictService: DictService,
  ) {}

  /**
   * 提交反馈（登录用户）
   * 类型字典校验 → 24h 频控 → 单条插入
   * 无 contact 字段（登录身份已知）、不做 pending 去重（多条不同反馈合法，服务端不做任何合并）；
   * 截图附件经 DTO 前缀/张数校验后归一化（去空去重）序列化为 JSON 落库
   */
  async create(dto: CreateFeedbackDto, userId: number) {
    await this.assertDictValue(dto.type);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await this.feedbackRepo.count({
      where: { userId, createTime: MoreThan(since) },
    });
    if (recent >= MAX_FEEDBACKS_PER_DAY) {
      throw new BusinessException(500, '反馈提交过于频繁，请 24 小时后再试');
    }

    await this.feedbackRepo.insert({
      userId,
      type: dto.type,
      content: dto.content,
      attachments: this.serializeAttachments(dto.attachments),
      status: FeedbackStatusEnum.PENDING,
    });

    this.logger.log(`用户 ${userId} 提交反馈（类型 ${dto.type}，附件 ${dto.attachments?.length || 0} 张）`);
    return ResultData.ok({ submitted: true });
  }

  /**
   * 待处理反馈计数（工作台待办源；物理删除口径无 delFlag 过滤）
   */
  async countPending() {
    return this.feedbackRepo.count({ where: { status: FeedbackStatusEnum.PENDING } });
  }

  /**
   * 已处理反馈计数（工作台已办 tab 徽标；已回复/已关闭均计，团队视角不区分处理人）
   */
  async countDone() {
    return this.feedbackRepo.count({ where: { status: Not(FeedbackStatusEnum.PENDING) } });
  }

  /**
   * 反馈管理列表（管理端，联提交人/处理人昵称 + attachUserInfo 回填提交人昵称头像）
   * 取数走 getRawAndEntities：feedback 实体 + join 出的两端用户展示列手动拼平；
   * 行回填当前用户 isRead（工作区/管理页共用 30 号逐条已读，打开详情抽屉即标记已读）
   */
  async findAdminList(query: ListFeedbackDto, userId: number) {
    const entity = this.feedbackRepo.createQueryBuilder('feedback');
    entity
      .leftJoin(UserEntity, 'submitter', 'submitter.userId = feedback.userId')
      .leftJoin(UserEntity, 'replyAdmin', 'replyAdmin.userId = feedback.adminId')
      .addSelect(['submitter.nickName', 'replyAdmin.nickName'])
      .where('1 = 1');

    if (query.type) {
      entity.andWhere('feedback.type = :type', { type: query.type });
    }
    if (query.status) {
      entity.andWhere('feedback.status = :status', { status: query.status });
    }
    applyLike(entity, 'submitter.nickName', query.userName);

    if (query.params?.beginTime && query.params?.endTime) {
      entity.andWhere('feedback.createTime BETWEEN :start AND :end', {
        start: query.params.beginTime,
        end: query.params.endTime,
      });
    }

    paginate(entity, query);

    entity.orderBy('feedback.createTime', 'DESC');

    const { raw } = await entity.getRawAndEntities();
    const total = await entity.getCount();

    // raw 键格式为「别名_数据库列名」（非实体属性名）
    const list = raw.map((row: Record<string, any>) => ({
      id: row.feedback_id,
      userId: row.feedback_user_id,
      type: row.feedback_type,
      content: row.feedback_content,
      attachments: this.parseAttachments(row.feedback_attachments),
      status: row.feedback_status,
      replyContent: row.feedback_reply_content,
      adminId: row.feedback_admin_id,
      replyAdminName: row.replyAdmin_nick_name,
      replyTime: row.feedback_reply_time,
      createTime: row.feedback_create_time,
      isRead: false,
    }));
    // attachUserInfo 返回新数组（追加 userInfo 字段），须接住返回值而非原 list
    const listWithUser = await attachUserInfo(list, this.userRepo);
    await attachWorkbenchReadState(listWithUser, 'feedback', userId, this.readRepo);

    return ResultData.ok({ list: listWithUser, total });
  }

  /**
   * 处理反馈（管理端）：结论流转 + 定向通知同事务落库
   * - 已回复（status=1）：replyContent 必填，通知正文带管理员回复全文
   * - 已关闭（status=2）：replyContent 可选简短说明，通知正文为简短关闭文案
   * - 终态不可重复处理：先查行再按 status='0' 条件更新做乐观锁（并发处理只有一方生效，同举报处理口径）
   */
  async handle(id: number, dto: HandleFeedbackDto, adminUserId: number) {
    // 回复结论必须携带回复内容（关闭可不填，留空则通知里不带说明）
    const replyContent = dto.replyContent?.trim() || null;
    if (dto.status === FeedbackStatusEnum.REPLIED && !replyContent) {
      throw new BusinessException(500, '回复内容不能为空');
    }

    const result = await this.userRepo.manager.transaction(async (manager) => {
      const feedback = await manager.findOne(PostFeedbackEntity, { where: { id } });
      if (!feedback) {
        throw new BusinessException(500, '反馈记录不存在');
      }
      if (feedback.status !== FeedbackStatusEnum.PENDING) {
        throw new BusinessException(500, '该反馈已处理，请勿重复操作');
      }

      // 条件更新（status='0'）做乐观锁：并发处理只有一方生效，重复处理报错返回
      const res = await manager.update(
        PostFeedbackEntity,
        { id, status: FeedbackStatusEnum.PENDING },
        {
          status: dto.status,
          replyContent,
          adminId: adminUserId,
          replyTime: new Date(),
        },
      );
      if (!res.affected) {
        throw new BusinessException(500, '该反馈已处理，请勿重复操作');
      }

      // 定向通知（sys_notice.noticeType='4' 反馈回复，Markdown 正文，通知详情页渲染）：
      // 结果发反馈提交人，前台「系统通知」栏可见，scope 过滤保证私密通知只对本人可见
      const summary = this.summarize(feedback.content);
      const isReply = dto.status === FeedbackStatusEnum.REPLIED;
      await manager.insert(SysNoticeEntity, {
        noticeTitle: isReply ? '你的反馈已回复' : '你的反馈已关闭',
        noticeType: '4',
        noticeContent: isReply
          ? `你提交的反馈「${summary}」已由管理员回复：**${replyContent}**。感谢你帮助改进站点体验。`
          : `你提交的反馈「${summary}」已由管理员关闭。${replyContent ? `说明：${replyContent}` : ''}感谢你的反馈，欢迎继续提出建议。`,
        userId: feedback.userId,
        status: StatusEnum.NORMAL,
        createBy: 'system',
      });

      this.logger.log(`反馈 ${id} 处理完成：结论 ${dto.status}，处理人 ${adminUserId}`);
      return ResultData.ok();
    });

    return result;
  }

  /**
   * 管理端批量删除反馈记录：物理删除（同 post_report 口径），仅清理记录本身；
   * del_flag 不参与（反馈不做软删，物理删除即从列表消失，用户侧反馈通知不受影响）
   */
  async removeByIds(ids: number[]) {
    return this.feedbackRepo.manager.transaction(async (manager) => {
      const rows = await manager.find(PostFeedbackEntity, { where: { id: In(ids) } });
      if (!rows.length) {
        return ResultData.ok();
      }

      await manager.delete(PostFeedbackEntity, { id: In(rows.map((row) => row.id)) });

      this.logger.log(`管理员删除反馈记录 ${rows.length} 条`);
      return ResultData.ok();
    });
  }

  /**
   * 反馈类型的合法性校验：dictValue 必须存在于 post_feedback_type 的启用项中
   * 走 DictService 全量字典缓存（Redis），高频提交路径零额外查询压力
   */
  private async assertDictValue(type: string) {
    const typeRes = await this.dictService.findOneDataType('post_feedback_type');
    const activeValues = ((typeRes.data || []) as Array<{ dictValue: string; status: string }>)
      .filter((item) => item.status === StatusEnum.NORMAL)
      .map((item) => item.dictValue);

    if (!activeValues.includes(type)) {
      throw new BusinessException(500, '反馈类型无效');
    }
  }

  /** 通知正文用的反馈内容摘要：超长截断加省略号 */
  private summarize(content: string) {
    return content.length > NOTICE_CONTENT_SUMMARY_LENGTH ? `${content.slice(0, NOTICE_CONTENT_SUMMARY_LENGTH)}…` : content;
  }

  /** 附件归一化（去空白、去重）后序列化为 JSON 字符串；无附件返回 null */
  private serializeAttachments(attachments?: string[]) {
    const urls = [...new Set((attachments || []).map((item) => (item || '').trim()).filter(Boolean))];
    return urls.length ? JSON.stringify(urls) : null;
  }

  /** 库内附件 JSON 字符串反序列化为 URL 数组：解析失败或非法形态一律兜底空数组（脏数据不影响列表展示） */
  private parseAttachments(raw: unknown) {
    if (!raw || typeof raw !== 'string') {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
    } catch {
      return [];
    }
  }
}

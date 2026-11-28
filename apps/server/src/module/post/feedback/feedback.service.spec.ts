import { PostFeedbackService } from './feedback.service';
import { PostFeedbackEntity } from './entities/feedback.entity';

/**
 * 用户反馈服务核心路径：
 * - 提交：类型字典校验、24h 窗口频控（用户维度，不做 pending 去重）、提交绑定登录身份
 *   （登录要求由全局 JwtAuthGuard 兜底，controller 无 @RequirePermission——service 级单测以
 *   「记录绑定传入 userId、无 contact 字段」口径覆盖，与举报登录路径同款）
 * - 处理：回复必填校验、结论流转、终态不可重复处理（status='0' 条件更新乐观锁）、定向通知（type=4）
 * - 批量物理删除
 * 事务/查询构建器 mock 与 report/notify spec 同款
 */
describe('PostFeedbackService', () => {
  // 事务内 manager：各动作独立 mock，测试内按需覆写返回值
  const makeManager = () => ({
    findOne: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    insert: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    find: jest.fn().mockResolvedValue([]),
  });

  const feedbackRepo = {
    count: jest.fn(),
    insert: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: { transaction: jest.fn() },
  };
  const userRepo = { find: jest.fn(), manager: { transaction: jest.fn() } };
  const dictService = { findOneDataType: jest.fn() };

  let manager: ReturnType<typeof makeManager>;
  let service: PostFeedbackService;

  beforeEach(() => {
    jest.resetAllMocks();
    manager = makeManager();
    userRepo.manager.transaction.mockImplementation((cb: (m: unknown) => unknown) => cb(manager));
    feedbackRepo.manager.transaction.mockImplementation((cb: (m: unknown) => unknown) => cb(manager));

    // 字典缓存默认命中：post_feedback_type 三项均为启用项
    dictService.findOneDataType.mockResolvedValue({
      data: [
        { dictValue: '1', status: '0' },
        { dictValue: '2', status: '0' },
        { dictValue: '3', status: '0' },
      ],
    });

    service = new PostFeedbackService(feedbackRepo as any, userRepo as any, dictService as any);
  });

  const baseDto = { type: '2', content: '文章保存时偶尔报错' };

  describe('create', () => {
    it('提交成功：记录绑定登录身份（userId 落库、无 contact 字段），status 落待处理', async () => {
      feedbackRepo.count.mockResolvedValue(0);

      const res = await service.create(baseDto, 7);

      expect(feedbackRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 7, type: '2', content: '文章保存时偶尔报错', status: '0' }),
      );
      const inserted = feedbackRepo.insert.mock.calls[0][0] as Record<string, unknown>;
      expect(Object.keys(inserted)).not.toContain('contact');
      expect(res.data).toEqual({ submitted: true });
    });

    it('字典值非法：拒绝提交且不进频控', async () => {
      dictService.findOneDataType.mockResolvedValue({ data: [] });

      await expect(service.create(baseDto, 7)).rejects.toMatchObject({ msg: '反馈类型无效' });
      expect(feedbackRepo.count).not.toHaveBeenCalled();
    });

    it('字典项存在但已停用：拒绝提交', async () => {
      dictService.findOneDataType.mockResolvedValue({ data: [{ dictValue: '2', status: '1' }] });

      await expect(service.create(baseDto, 7)).rejects.toMatchObject({ msg: '反馈类型无效' });
    });

    it('24 小时窗口内提交达到上限：频控拒绝', async () => {
      feedbackRepo.count.mockResolvedValue(10);

      await expect(service.create(baseDto, 7)).rejects.toMatchObject({ msg: '反馈提交过于频繁，请 24 小时后再试' });
      expect(feedbackRepo.insert).not.toHaveBeenCalled();
      // 频控按用户维度统计（含 userId 条件）
      expect(feedbackRepo.count).toHaveBeenCalledWith({ where: { userId: 7, createTime: expect.anything() } });
    });

    it('不做 pending 去重：窗口内未达上限时多条不同反馈均放行', async () => {
      feedbackRepo.count.mockResolvedValue(3);

      await service.create(baseDto, 7);
      await service.create({ type: '1', content: '建议加个夜间模式' }, 7);

      expect(feedbackRepo.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('findAdminList', () => {
    // 链式 qb：join/条件/分页自返回，末端取 raw 与总数
    const makeChain = () => {
      const chain: Record<string, jest.Mock> = {};
      for (const step of ['select', 'addSelect', 'leftJoin', 'where', 'andWhere', 'skip', 'take', 'orderBy']) {
        chain[step] = jest.fn().mockReturnValue(chain);
      }
      chain.getRawAndEntities = jest.fn().mockResolvedValue({ raw: [], entities: [] });
      chain.getCount = jest.fn().mockResolvedValue(0);
      return chain;
    };
    let chain: ReturnType<typeof makeChain>;

    beforeEach(() => {
      chain = makeChain();
      feedbackRepo.createQueryBuilder.mockReturnValue(chain);
    });

    it('raw 拼平提交人/处理人昵称，attachUserInfo 回填提交人昵称头像', async () => {
      const createTime = new Date('2026-11-28T10:00:00.000+08:00');
      chain.getRawAndEntities.mockResolvedValue({
        raw: [
          {
            feedback_id: 1,
            feedback_user_id: 7,
            feedback_type: '2',
            feedback_content: '文章保存时偶尔报错',
            feedback_status: '0',
            feedback_reply_content: null,
            feedback_admin_id: null,
            replyAdmin_nick_name: null,
            feedback_reply_time: null,
            feedback_create_time: createTime,
          },
          {
            feedback_id: 2,
            feedback_user_id: 9,
            feedback_type: '1',
            feedback_content: '建议加个夜间模式',
            feedback_status: '1',
            feedback_reply_content: '已在 roadmap',
            feedback_admin_id: 99,
            replyAdmin_nick_name: '管理员乙',
            feedback_reply_time: createTime,
            feedback_create_time: createTime,
          },
        ],
      });
      chain.getCount.mockResolvedValue(2);
      userRepo.find.mockResolvedValue([
        { userId: 7, nickName: '用户甲', avatar: 'a.png' },
        { userId: 9, nickName: '用户乙', avatar: null },
      ]);

      const res = await service.findAdminList({ pageNum: 1, pageSize: 10 } as any);
      const list = res.data.list as Array<Record<string, any>>;

      expect(res.data.total).toBe(2);
      expect(list[0]).toMatchObject({
        userId: 7,
        status: '0',
        replyAdminName: null,
        userInfo: { userId: 7, nickName: '用户甲', avatar: 'a.png' },
      });
      expect(list[1]).toMatchObject({
        replyContent: '已在 roadmap',
        replyAdminName: '管理员乙',
        userInfo: { userId: 9, nickName: '用户乙', avatar: null },
      });
    });
  });

  describe('handle', () => {
    const pendingFeedback = { id: 1, status: '0', userId: 7, type: '2', content: '文章保存时偶尔报错' };

    it('回复：replyContent 必填，条件更新落结论，同事务定向通知（type=4）发给提交人', async () => {
      manager.findOne.mockResolvedValue(pendingFeedback);

      await service.handle(1, { status: '1', replyContent: '问题已定位，下个版本修复' } as any, 99);

      expect(manager.update).toHaveBeenCalledWith(
        PostFeedbackEntity,
        { id: 1, status: '0' },
        { status: '1', replyContent: '问题已定位，下个版本修复', adminId: 99, replyTime: expect.any(Date) },
      );
      expect(manager.insert).toHaveBeenCalledTimes(1);
      const notice = manager.insert.mock.calls[0][1] as Record<string, any>;
      expect(notice.userId).toBe(7);
      expect(notice.noticeType).toBe('4');
      expect(notice.noticeTitle).toBe('你的反馈已回复');
      expect(String(notice.noticeContent)).toContain('问题已定位，下个版本修复');
    });

    it('回复未填内容：抛异常，不落结论不发通知', async () => {
      await expect(service.handle(1, { status: '1', replyContent: '  ' } as any, 99)).rejects.toMatchObject({
        msg: '回复内容不能为空',
      });
      expect(userRepo.manager.transaction).not.toHaveBeenCalled();
    });

    it('关闭：replyContent 可空，通知为简短关闭文案（不含回复全文）', async () => {
      manager.findOne.mockResolvedValue(pendingFeedback);

      await service.handle(1, { status: '2' } as any, 99);

      expect(manager.update).toHaveBeenCalledWith(
        PostFeedbackEntity,
        { id: 1, status: '0' },
        { status: '2', replyContent: null, adminId: 99, replyTime: expect.any(Date) },
      );
      const notice = manager.insert.mock.calls[0][1] as Record<string, any>;
      expect(notice.noticeTitle).toBe('你的反馈已关闭');
      expect(notice.noticeType).toBe('4');
    });

    it('关闭附带说明：说明写入结论与通知', async () => {
      manager.findOne.mockResolvedValue(pendingFeedback);

      await service.handle(1, { status: '2', replyContent: '与已知问题重复' } as any, 99);

      expect(manager.update).toHaveBeenCalledWith(
        PostFeedbackEntity,
        { id: 1, status: '0' },
        expect.objectContaining({ status: '2', replyContent: '与已知问题重复' }),
      );
      const notice = manager.insert.mock.calls[0][1] as Record<string, any>;
      expect(String(notice.noticeContent)).toContain('与已知问题重复');
    });

    it('终态不可重复处理：先查行拦截（status 非 0 报错，不发通知）', async () => {
      manager.findOne.mockResolvedValue({ ...pendingFeedback, status: '1' });

      await expect(service.handle(1, { status: '2' } as any, 99)).rejects.toMatchObject({ msg: '该反馈已处理，请勿重复操作' });
      expect(manager.update).not.toHaveBeenCalled();
      expect(manager.insert).not.toHaveBeenCalled();
    });

    it('并发处理（条件更新 affected=0）：后到者报错', async () => {
      manager.findOne.mockResolvedValue(pendingFeedback);
      manager.update.mockResolvedValue({ affected: 0 });

      await expect(service.handle(1, { status: '2' } as any, 99)).rejects.toMatchObject({ msg: '该反馈已处理，请勿重复操作' });
      expect(manager.insert).not.toHaveBeenCalled();
    });

    it('反馈记录不存在：抛异常', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(service.handle(1, { status: '1', replyContent: 'ok' } as any, 99)).rejects.toMatchObject({
        msg: '反馈记录不存在',
      });
    });

    it('通知正文引用反馈内容：超 40 字截断加省略号', async () => {
      manager.findOne.mockResolvedValue({ ...pendingFeedback, content: '长'.repeat(60) });

      await service.handle(1, { status: '2' } as any, 99);

      const notice = manager.insert.mock.calls[0][1] as Record<string, any>;
      expect(String(notice.noticeContent)).toContain('…');
      expect(String(notice.noticeContent).length).toBeLessThan(80);
    });
  });

  describe('removeByIds', () => {
    it('物理删除命中的反馈记录', async () => {
      manager.find.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      await service.removeByIds([1, 2]);

      expect(manager.delete).toHaveBeenCalledWith(PostFeedbackEntity, { id: expect.anything() });
    });

    it('无命中记录：直接返回，不发删除', async () => {
      manager.find.mockResolvedValue([]);

      await service.removeByIds([999]);

      expect(manager.delete).not.toHaveBeenCalled();
    });
  });
});

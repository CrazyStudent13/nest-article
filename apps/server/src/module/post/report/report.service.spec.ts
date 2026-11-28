import { PublishStatusEnum } from '@nest-acticle/shared';
import { PostReportService, AUTO_OFFLINE_REPORTERS } from './report.service';
import { PostReportEntity } from './entities/report.entity';
import { PostArticleEntity } from '../article/entities/article.entity';
import { UserEntity } from 'src/module/system/user/entities/sys-user.entity';

/**
 * 举报服务核心路径：
 * - 提交：目标存在性/自查拦截、24h 频控、待处理唯一索引（INSERT IGNORE affectedRows=0）去重
 * - 文章多人举报达阈值时事务内自动下架（条件更新 + 通知作者）
 * - 处理：结论/动作与目标类型匹配、pending_flag 置 NULL 释放举报资格、乐观锁并发保护、定向通知
 * - 停用用户的事务后置会话清理、批量物理删除
 * 事务/查询构建器 mock 与 follow/notify spec 同款
 */
describe('PostReportService', () => {
  // 事务内 manager：各动作独立 mock，测试内按需覆写返回值
  const makeManager = () => ({
    findOne: jest.fn().mockResolvedValue(null),
    query: jest.fn().mockResolvedValue({ affectedRows: 1 }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    insert: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    find: jest.fn().mockResolvedValue([]),
  });

  const reportRepo = {
    count: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: { transaction: jest.fn() },
  };
  const articleRepo = { findOne: jest.fn(), find: jest.fn() };
  const userRepo = { findOne: jest.fn(), find: jest.fn(), manager: { transaction: jest.fn() } };
  const dictService = { findOneDataType: jest.fn() };
  const userService = { disableUserSessions: jest.fn() };

  let manager: ReturnType<typeof makeManager>;
  let service: PostReportService;

  beforeEach(() => {
    jest.resetAllMocks();
    manager = makeManager();
    userRepo.manager.transaction.mockImplementation((cb: (m: unknown) => unknown) => cb(manager));
    reportRepo.manager.transaction.mockImplementation((cb: (m: unknown) => unknown) => cb(manager));

    // 字典缓存默认命中：目标类型 post/user，理由 spam 均为启用项
    dictService.findOneDataType.mockImplementation((type: string) =>
      Promise.resolve({
        data:
          type === 'post_report_target'
            ? [
                { dictValue: 'post', status: '0' },
                { dictValue: 'user', status: '0' },
              ]
            : [{ dictValue: 'spam', status: '0' }],
      }),
    );

    service = new PostReportService(reportRepo as any, articleRepo as any, userRepo as any, dictService as any, userService as any);
  });

  const baseDto = { targetType: 'post' as any, targetId: 10, reasonType: 'spam' };

  // 举报目标只接受已发布文章：默认 mock 已发布，按用例覆写状态
  const publishedPost = (overrides: Record<string, any> = {}) => ({
    id: 10,
    userId: 2,
    title: '被举报文章',
    desc: '简介',
    publishStatus: PublishStatusEnum.PUBLISHED,
    ...overrides,
  });

  describe('create', () => {
    it('文章举报成功：参数化 INSERT IGNORE 落库（含快照），返回 reported', async () => {
      articleRepo.findOne.mockResolvedValue(publishedPost());
      reportRepo.count.mockResolvedValue(0);
      // 第一次 INSERT，第二次是自动下架阈值统计（未达阈值）
      manager.query.mockResolvedValueOnce({ affectedRows: 1 }).mockResolvedValueOnce([{ cnt: '1' }]);

      const res = await service.create(baseDto, 7);

      expect(manager.query.mock.calls[0][1]).toEqual(['post', 10, 7, 'spam', null, '被举报文章 · 简介']);
      expect(res.data).toEqual({ reported: true });
    });

    it('文章未发布（草稿/已下架）：按不存在拒绝，不进入频控与落库', async () => {
      articleRepo.findOne.mockResolvedValue(publishedPost({ publishStatus: PublishStatusEnum.OFFLINE }));

      await expect(service.create(baseDto, 7)).rejects.toMatchObject({ msg: '举报的文章不存在或已下架' });
      expect(reportRepo.count).not.toHaveBeenCalled();
    });

    it('已有待处理举报：affectedRows=0 抛业务异常（不同于关注幂等静默）', async () => {
      articleRepo.findOne.mockResolvedValue(publishedPost());
      reportRepo.count.mockResolvedValue(0);
      manager.query.mockResolvedValueOnce({ affectedRows: 0 });

      await expect(service.create(baseDto, 7)).rejects.toMatchObject({ msg: '该内容已有待处理的举报，请耐心等待处理结果' });
    });

    it('不能举报自己的文章', async () => {
      articleRepo.findOne.mockResolvedValue(publishedPost({ userId: 7 }));
      reportRepo.count.mockResolvedValue(0);

      await expect(service.create(baseDto, 7)).rejects.toMatchObject({ msg: '不能举报自己的文章' });
      expect(userRepo.manager.transaction).not.toHaveBeenCalled();
    });

    it('不能举报自己（用户目标）', async () => {
      await expect(service.create({ targetType: 'user' as any, targetId: 7, reasonType: 'spam' }, 7)).rejects.toMatchObject({
        msg: '不能举报自己',
      });
    });

    it('用户目标按 delFlag 过滤，已注销账号按不存在拒绝', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.create({ targetType: 'user' as any, targetId: 9, reasonType: 'spam' }, 7)).rejects.toMatchObject({
        msg: '举报的用户不存在',
      });
      expect(userRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 9, delFlag: '0' } }));
    });

    it('用户举报成功：昵称作为快照落库', async () => {
      userRepo.findOne.mockResolvedValue({ userId: 9, nickName: '用户B' });
      reportRepo.count.mockResolvedValue(0);
      manager.query.mockResolvedValueOnce({ affectedRows: 1 });

      await service.create({ targetType: 'user' as any, targetId: 9, reasonType: 'spam' }, 7);

      expect(manager.query.mock.calls[0][1]).toEqual(['user', 9, 7, 'spam', null, '用户B']);
    });

    it('24 小时内跨目标举报达到上限：拒绝', async () => {
      articleRepo.findOne.mockResolvedValue(publishedPost());
      reportRepo.count.mockResolvedValue(10);

      await expect(service.create(baseDto, 7)).rejects.toMatchObject({ msg: '举报过于频繁，请 24 小时后再试' });
    });

    it('字典值非法：拒绝提交且不查目标', async () => {
      dictService.findOneDataType.mockResolvedValue({ data: [] });

      await expect(service.create(baseDto, 7)).rejects.toMatchObject({ msg: '举报目标类型无效' });
      expect(articleRepo.findOne).not.toHaveBeenCalled();
    });

    it(`不同用户待处理举报达到 ${AUTO_OFFLINE_REPORTERS} 人：自动下架并定向通知作者`, async () => {
      articleRepo.findOne.mockResolvedValue(publishedPost());
      reportRepo.count.mockResolvedValue(0);
      manager.query.mockResolvedValueOnce({ affectedRows: 1 }).mockResolvedValueOnce([{ cnt: String(AUTO_OFFLINE_REPORTERS) }]);
      manager.findOne.mockResolvedValue({ id: 10, title: '争议文章', userId: 2 });

      await service.create(baseDto, 7);

      expect(manager.update).toHaveBeenCalledWith(PostArticleEntity, { id: 10, delFlag: '0', publishStatus: PublishStatusEnum.PUBLISHED }, { publishStatus: PublishStatusEnum.OFFLINE });
      expect(manager.insert).toHaveBeenCalledTimes(1);
      expect((manager.insert.mock.calls[0][1] as { userId: number }).userId).toBe(2);
    });

    it('自动下架条件更新未命中（文章已非已发布）：不重复通知', async () => {
      articleRepo.findOne.mockResolvedValue(publishedPost());
      reportRepo.count.mockResolvedValue(0);
      manager.query.mockResolvedValueOnce({ affectedRows: 1 }).mockResolvedValueOnce([{ cnt: String(AUTO_OFFLINE_REPORTERS) }]);
      manager.update.mockResolvedValueOnce({ affected: 0 });

      await service.create(baseDto, 7);

      expect(manager.insert).not.toHaveBeenCalled();
    });
  });

  describe('statusByTarget', () => {
    it('只看待处理举报：处置完成后按钮恢复可点', async () => {
      reportRepo.findOne.mockResolvedValue({ id: 1 });

      const res = await service.statusByTarget('post', 10, 7);

      expect(reportRepo.findOne).toHaveBeenCalledWith({
        where: { reporterId: 7, targetType: 'post', targetId: 10, status: '0' },
        select: ['id'],
      });
      expect(res.data).toEqual({ reported: true });
    });
  });

  describe('countPending', () => {
    it('待处理举报计数：只按 status=PENDING 查（工作台待办源，无 delFlag 过滤——物理删除口径）', async () => {
      reportRepo.count.mockResolvedValue(7);

      const count = await service.countPending();

      expect(reportRepo.count).toHaveBeenCalledWith({ where: { status: '0' } });
      expect(count).toBe(7);
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
      reportRepo.createQueryBuilder.mockReturnValue(chain);
    });

    it('raw 拼平举报人/处理人昵称，并按目标类型批查文章标题/用户昵称', async () => {
      const createTime = new Date('2026-11-26T10:00:00.000+08:00');
      chain.getRawAndEntities.mockResolvedValue({
        raw: [
          {
            report_id: 1,
            report_target_type: 'post',
            report_target_id: 10,
            report_target_snapshot: '文章A · 旧简介',
            report_reporter_id: 7,
            reporter_nick_name: '举报人甲',
            report_reason_type: 'spam',
            report_reason_content: null,
            report_status: '1',
            report_handle_action: 'unpublish',
            report_handle_remark: '核实成立',
            handler_nick_name: '管理员乙',
            report_handle_time: createTime,
            report_create_time: createTime,
          },
          {
            report_id: 2,
            report_target_type: 'user',
            report_target_id: 9,
            report_target_snapshot: '用户B',
            report_reporter_id: 7,
            reporter_nick_name: '举报人甲',
            report_reason_type: 'spam',
            report_reason_content: null,
            report_status: '0',
            report_handle_action: null,
            report_handle_remark: null,
            handler_nick_name: null,
            report_handle_time: null,
            report_create_time: createTime,
          },
        ],
      });
      chain.getCount.mockResolvedValue(2);
      articleRepo.find.mockResolvedValue([{ id: 10, title: '文章A' }]);
      userRepo.find.mockResolvedValue([{ userId: 9, nickName: '用户B' }]);

      const res = await service.findAdminList({ pageNum: 1, pageSize: 10 } as any);
      const list = res.data.list as Array<Record<string, any>>;

      expect(res.data.total).toBe(2);
      expect(list[0]).toMatchObject({
        reporterName: '举报人甲',
        handlerName: '管理员乙',
        handleAction: 'unpublish',
        targetSnapshot: '文章A · 旧简介',
        targetTitle: '文章A',
        targetName: null,
      });
      expect(list[1]).toMatchObject({ targetSnapshot: '用户B', targetTitle: null, targetName: '用户B' });
    });
  });

  describe('handle', () => {
    const pendingReport = { id: 1, status: '0', targetType: 'post', targetId: 10, reporterId: 7 };

    it('成立 + 下架文章：同事务落结论与处置，pending_flag 置 NULL，通知举报人与作者', async () => {
      manager.findOne.mockResolvedValueOnce(pendingReport).mockResolvedValueOnce({ id: 10, title: '争议文章', userId: 2, delFlag: '0', publishStatus: PublishStatusEnum.PUBLISHED });

      await service.handle(1, { status: '1', handleAction: 'unpublish', handleRemark: '核实成立' } as any, 99);

      // 条件更新：未删除且仍在架才真正下架（幂等，已下架/已删除不重复动作）
      expect(manager.update).toHaveBeenCalledWith(
        PostArticleEntity,
        { id: 10, delFlag: '0', publishStatus: PublishStatusEnum.PUBLISHED },
        { publishStatus: PublishStatusEnum.OFFLINE },
      );
      const reportUpdate = manager.update.mock.calls.find((call) => call[0] === PostReportEntity);
      expect(reportUpdate?.[2]).toMatchObject({
        status: '1',
        handleAction: 'unpublish',
        handlerId: 99,
        pendingFlag: null,
      });
      // 举报人结果通知 + 作者下架通知
      expect(manager.insert).toHaveBeenCalledTimes(2);
      expect((manager.insert.mock.calls[0][1] as { userId: number }).userId).toBe(7);
      expect((manager.insert.mock.calls[1][1] as { userId: number }).userId).toBe(2);
    });

    it('下架条件更新未命中（文章已下架/已删除）：不重复动作，也不通知作者', async () => {
      manager.findOne.mockResolvedValueOnce(pendingReport).mockResolvedValueOnce({ id: 10, title: '争议文章', userId: 2, delFlag: '0', publishStatus: PublishStatusEnum.OFFLINE });
      manager.update.mockResolvedValueOnce({ affected: 0 });

      await service.handle(1, { status: '1', handleAction: 'unpublish' } as any, 99);

      // 只发举报人结果通知
      expect(manager.insert).toHaveBeenCalledTimes(1);
      expect((manager.insert.mock.calls[0][1] as { userId: number }).userId).toBe(7);
    });

    it('驳回：强制清空处置动作（请求体带动作也不执行）', async () => {
      manager.findOne.mockResolvedValueOnce(pendingReport).mockResolvedValueOnce({ id: 10, title: '争议文章', userId: 2, delFlag: '0', publishStatus: PublishStatusEnum.OFFLINE });

      await service.handle(1, { status: '2', handleAction: 'unpublish' } as any, 99);

      expect(manager.update).not.toHaveBeenCalledWith(PostArticleEntity, expect.anything(), expect.anything());
      const reportUpdate = manager.update.mock.calls.find((call) => call[0] === PostReportEntity);
      expect(reportUpdate?.[2]).toMatchObject({ status: '2', handleAction: null });
      expect(manager.insert).toHaveBeenCalledTimes(1);
      // 驳回不明说「未成立」（B 站口径）：口径改为承诺持续关注，避免打击后续举报意愿
      const noticeContent = String(manager.insert.mock.calls[0][1]?.noticeContent);
      expect(noticeContent).toContain('我们会重点持续关注该内容');
      expect(noticeContent).not.toContain('未成立');
    });

    it('处置动作与目标类型不匹配：抛异常，结论不落库', async () => {
      manager.findOne.mockResolvedValueOnce(pendingReport).mockResolvedValueOnce({ id: 10, title: '争议文章', userId: 2 });

      await expect(service.handle(1, { status: '1', handleAction: 'disableUser' } as any, 99)).rejects.toMatchObject({
        msg: '停用动作仅适用于用户举报',
      });
      expect(manager.update).not.toHaveBeenCalledWith(PostReportEntity, expect.anything(), expect.anything());
    });

    it('并发处理（条件更新 affected=0）：后到者报错', async () => {
      manager.findOne.mockResolvedValueOnce(pendingReport);
      // 无处置动作时不更新文章，第一次 update 即结论条件更新
      manager.update.mockResolvedValueOnce({ affected: 0 });

      await expect(service.handle(1, { status: '1' } as any, 99)).rejects.toMatchObject({ msg: '该举报已处理，请勿重复操作' });
    });

    it('停用用户：拒绝系统内置账号', async () => {
      // 用户目标会查两次：先取通知文案摘要，再取停用前校验
      manager.findOne
        .mockResolvedValueOnce({ ...pendingReport, targetType: 'user', targetId: 9 })
        .mockResolvedValueOnce({ userId: 9, nickName: '运营号', userType: '00' })
        .mockResolvedValueOnce({ userId: 9, userType: '00' });

      await expect(service.handle(1, { status: '1', handleAction: 'disableUser' } as any, 99)).rejects.toMatchObject({
        msg: '系统角色不可停用',
      });
    });

    it('停用用户成功：写入停用原因/时间，事务后踢掉目标全部在线会话', async () => {
      manager.findOne
        .mockResolvedValueOnce({ ...pendingReport, targetType: 'user', targetId: 9 })
        .mockResolvedValueOnce({ userId: 9, nickName: '违规用户', userType: '10' })
        .mockResolvedValueOnce({ userId: 9, userType: '10' });

      await service.handle(1, { status: '1', handleAction: 'disableUser', stopReason: '发布违规内容' } as any, 99);

      // 停用原因/时间随状态落库：登录拦截提示用（停用者收不到站内信）
      expect(manager.update).toHaveBeenCalledWith(
        UserEntity,
        { userId: 9 },
        expect.objectContaining({ status: '1', stopReason: '发布违规内容', stopTime: expect.any(Date) }),
      );
      // 会话处置走 disableUserSessions：改写快照为停用态 + 删键，删键失败时 validate 按快照 status 拒绝
      expect(userService.disableUserSessions).toHaveBeenCalledWith([9]);
    });

    it('停用用户未填原因：落到默认文案', async () => {
      manager.findOne
        .mockResolvedValueOnce({ ...pendingReport, targetType: 'user', targetId: 9 })
        .mockResolvedValueOnce({ userId: 9, nickName: '违规用户', userType: '10' })
        .mockResolvedValueOnce({ userId: 9, userType: '10' });

      await service.handle(1, { status: '1', handleAction: 'disableUser' } as any, 99);

      expect(manager.update).toHaveBeenCalledWith(
        UserEntity,
        { userId: 9 },
        expect.objectContaining({ stopReason: '举报核实成立，内容违规' }),
      );
    });
  });

  describe('removeByIds', () => {
    it('物理删除命中的举报记录', async () => {
      manager.find.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      await service.removeByIds([1, 2]);

      expect(manager.delete).toHaveBeenCalledWith(PostReportEntity, { id: expect.anything() });
    });

    it('无命中记录：直接返回，不发删除', async () => {
      manager.find.mockResolvedValue([]);

      await service.removeByIds([999]);

      expect(manager.delete).not.toHaveBeenCalled();
    });
  });
});
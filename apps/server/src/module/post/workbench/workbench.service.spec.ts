import { In } from 'typeorm';
import { WorkbenchService } from './workbench.service';

/**
 * 工作台服务核心路径：
 * - findTodos（首页唯一消费方）：待办/已办双 tab、来源筛选∩权限、时间范围进同一谓词、排序方向内联、
 *   total 对 UNION 子查询 COUNT 与列表同口径、tabs 徽标为有权源全局计数、昵称一次 IN 批查回填；
 *   待处理口径归各业务服务自管（countPending/countDone mock 档位）
 * - summary：首页改版后前端已不消费（tab 徽标由 todos 响应捎回），保留给二期侧栏角标——回归口径：通配感知过滤
 */
describe('WorkbenchService', () => {
  const reportService = { countPending: jest.fn(), countDone: jest.fn() };
  const feedbackService = { countPending: jest.fn(), countDone: jest.fn() };
  const userRepo = { find: jest.fn(), manager: { query: jest.fn() } };

  let service: WorkbenchService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new WorkbenchService(reportService as any, feedbackService as any, userRepo as any);
  });

  describe('findTodos', () => {
    it('默认待办：两源 UNION status=0，total 走 UNION 子查询 COUNT，昵称 IN 批查回填', async () => {
      userRepo.manager.query
        .mockResolvedValueOnce([{ cnt: 3 }])
        .mockResolvedValueOnce([
          { source: 'report', id: 9, summary: '《x》文章含广告', submitter_id: 7, submit_time: new Date('2026-11-28T10:00:00.000Z'), finish_time: null },
          { source: 'feedback', id: 5, summary: '希望增加夜间模式', submitter_id: 8, submit_time: new Date('2026-11-28T09:00:00.000Z'), finish_time: null },
          { source: 'feedback', id: 4, summary: '保存文章时报错', submitter_id: 7, submit_time: new Date('2026-11-27T09:00:00.000Z'), finish_time: null },
        ]);
      reportService.countPending.mockResolvedValue(2);
      feedbackService.countPending.mockResolvedValue(1);
      reportService.countDone.mockResolvedValue(4);
      feedbackService.countDone.mockResolvedValue(5);
      userRepo.find.mockResolvedValue([
        { userId: 7, nickName: '张三' },
        { userId: 8, nickName: '李四' },
      ]);

      const res = await service.findTodos({ pageNum: 1, pageSize: 10 } as any, { permissions: ['*:*:*'] } as any);

      const [countSql, countParams] = userRepo.manager.query.mock.calls[0];
      expect(countSql).toContain('SELECT COUNT(*)');
      expect(countSql).toContain('UNION ALL');
      expect(countParams).toEqual(['0', '0']);
      const [listSql, listParams] = userRepo.manager.query.mock.calls[1];
      expect(listSql).toContain('FROM post_report');
      expect(listSql).toContain('FROM post_feedback');
      expect(listSql).toContain('ORDER BY submit_time DESC, id DESC');
      expect(listParams).toEqual(['0', '0', 0, 10]);
      expect(res.data.total).toBe(3);
      expect(res.data.tabs).toEqual({ pending: 3, done: 9 });
      expect(res.data.list[0]).toMatchObject({ source: 'report', submitterName: '张三', finishTime: null });
      expect(userRepo.find).toHaveBeenCalledWith({ where: { userId: In([7, 8]) }, select: ['userId', 'nickName'] });
    });

    it('已办 tab：分支换 status IN 终态条件，办结时间列随行返回', async () => {
      userRepo.manager.query
        .mockResolvedValueOnce([{ cnt: 1 }])
        .mockResolvedValueOnce([
          { source: 'report', id: 3, summary: '《x》', submitter_id: 7, submit_time: new Date('2026-11-27T09:00:00.000Z'), finish_time: new Date('2026-11-27T11:00:00.000Z') },
        ]);
      reportService.countPending.mockResolvedValue(0);
      feedbackService.countPending.mockResolvedValue(0);
      reportService.countDone.mockResolvedValue(1);
      feedbackService.countDone.mockResolvedValue(0);
      userRepo.find.mockResolvedValue([{ userId: 7, nickName: '张三' }]);

      const res = await service.findTodos({ pageNum: 1, pageSize: 10, tab: 'done' } as any, { permissions: ['*:*:*'] } as any);

      const [countSql, countParams] = userRepo.manager.query.mock.calls[0];
      expect(countSql).toContain('status IN (?, ?)');
      expect(countParams).toEqual(['1', '2', '1', '2']);
      expect(res.data.list[0]).toMatchObject({ source: 'report', finishTime: expect.anything(), submitterName: '张三' });
      expect(res.data.tabs).toEqual({ pending: 0, done: 1 });
    });

    it('来源筛选：只拼举报分支，反馈计数不进分支但 tab 徽标仍为两源全局', async () => {
      userRepo.manager.query.mockResolvedValueOnce([{ cnt: 1 }]).mockResolvedValueOnce([]);
      reportService.countPending.mockResolvedValue(1);
      feedbackService.countPending.mockResolvedValue(2);
      reportService.countDone.mockResolvedValue(3);
      feedbackService.countDone.mockResolvedValue(4);

      const res = await service.findTodos({ pageNum: 1, pageSize: 10, source: 'report' } as any, { permissions: ['*:*:*'] } as any);

      const [countSql] = userRepo.manager.query.mock.calls[0];
      expect(countSql).toContain('FROM post_report');
      expect(countSql).not.toContain('FROM post_feedback');
      expect(res.data.tabs).toEqual({ pending: 3, done: 7 });
    });

    it('时间范围筛选：分支补 BETWEEN，时间参数进谓词；排序固定倒序', async () => {
      userRepo.manager.query.mockResolvedValueOnce([{ cnt: 0 }]).mockResolvedValueOnce([]);
      reportService.countPending.mockResolvedValue(0);
      feedbackService.countPending.mockResolvedValue(0);
      reportService.countDone.mockResolvedValue(0);
      feedbackService.countDone.mockResolvedValue(0);

      await service.findTodos(
        { pageNum: 1, pageSize: 10, params: { beginTime: '2026-11-01', endTime: '2026-11-28' } } as any,
        { permissions: ['*:*:*'] } as any,
      );

      const [countSql, countParams] = userRepo.manager.query.mock.calls[0];
      expect(countSql).toContain('BETWEEN ? AND ?');
      // 两分支各：1 个 status 参数 + 2 个时间范围参数
      expect(countParams).toEqual(['0', '2026-11-01', '2026-11-28', '0', '2026-11-01', '2026-11-28']);
      const [listSql] = userRepo.manager.query.mock.calls[1];
      expect(listSql).toContain('ORDER BY submit_time DESC, id DESC');
    });

    it('无权限：空 list/total/tabs，不执行 UNION 查询', async () => {
      const res = await service.findTodos({ pageNum: 1, pageSize: 10 } as any, { permissions: ['system:user:list'] } as any);

      expect(userRepo.manager.query).not.toHaveBeenCalled();
      expect(reportService.countPending).not.toHaveBeenCalled();
      expect(feedbackService.countPending).not.toHaveBeenCalled();
      expect(res.data).toEqual({ list: [], total: 0, tabs: { pending: 0, done: 0 } });
    });

    it('筛选了无权限的源：返回空（来源筛选与权限取交集）', async () => {
      const res = await service.findTodos({ pageNum: 1, pageSize: 10, source: 'feedback' } as any, { permissions: ['post:report:list'] } as any);

      expect(userRepo.manager.query).not.toHaveBeenCalled();
      expect(res.data).toEqual({ list: [], total: 0, tabs: { pending: 0, done: 0 } });
    });
  });

  describe('summary（二期侧栏角标预留）', () => {
    it('超级管理员（*:*:*）：两源全返回且计数透传', async () => {
      reportService.countPending.mockResolvedValue(3);
      feedbackService.countPending.mockResolvedValue(1);

      const res = await service.summary({ permissions: ['*:*:*'] } as any);

      expect(reportService.countPending).toHaveBeenCalledTimes(1);
      expect(feedbackService.countPending).toHaveBeenCalledTimes(1);
      expect(res.data.items).toEqual([
        { key: 'report', count: 3 },
        { key: 'feedback', count: 1 },
      ]);
    });

    it('仅举报权限：只返回举报源，反馈计数不查询', async () => {
      reportService.countPending.mockResolvedValue(2);

      const res = await service.summary({ permissions: ['post:report:list'] } as any);

      expect(feedbackService.countPending).not.toHaveBeenCalled();
      expect(res.data.items).toEqual([{ key: 'report', count: 2 }]);
    });

    it('无任何待办模块权限：items 为空数组，不抛 403', async () => {
      const res = await service.summary({ permissions: ['system:user:list'] } as any);

      expect(res.data.items).toEqual([]);
    });
  });
});

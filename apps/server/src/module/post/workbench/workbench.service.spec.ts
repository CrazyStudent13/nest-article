import { In } from 'typeorm';
import { WorkbenchService } from './workbench.service';

/**
 * 工作台服务核心路径：
 * - summary：按权限逐项过滤（hasPermission 通配感知，超管 '*:*:*' 全见）与并发计数透传；
 *   待处理口径归各业务服务自管（countPending mock 档位），此处只验证聚合纪律
 * - findTodos：有权源 UNION ALL 归一化按时间倒序分页、total 复用 countPending 相加、
 *   提交人昵称一次 IN 批查回填；无权限源连分支都不进
 */
describe('WorkbenchService', () => {
  const reportService = { countPending: jest.fn() };
  const feedbackService = { countPending: jest.fn() };
  const userRepo = { find: jest.fn(), manager: { query: jest.fn() } };

  let service: WorkbenchService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new WorkbenchService(reportService as any, feedbackService as any, userRepo as any);
  });

  describe('summary', () => {
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

      expect(reportService.countPending).toHaveBeenCalledTimes(1);
      expect(feedbackService.countPending).not.toHaveBeenCalled();
      expect(res.data.items).toEqual([{ key: 'report', count: 2 }]);
    });

    it('仅反馈权限：只返回反馈源，举报计数不查询', async () => {
      feedbackService.countPending.mockResolvedValue(5);

      const res = await service.summary({ permissions: ['post:feedback:list'] } as any);

      expect(reportService.countPending).not.toHaveBeenCalled();
      expect(res.data.items).toEqual([{ key: 'feedback', count: 5 }]);
    });

    it('无任何待办模块权限：items 为空数组（前端不渲染卡片），不抛 403', async () => {
      const res = await service.summary({ permissions: ['system:user:list'] } as any);

      expect(reportService.countPending).not.toHaveBeenCalled();
      expect(feedbackService.countPending).not.toHaveBeenCalled();
      expect(res.data.items).toEqual([]);
    });

    it('待处理为 0 的源照常返回（过滤按权限不做，count=0 卡片仍渲染）', async () => {
      reportService.countPending.mockResolvedValue(0);
      feedbackService.countPending.mockResolvedValue(0);

      const res = await service.summary({ permissions: ['*:*:*'] } as any);

      expect(res.data.items).toEqual([
        { key: 'report', count: 0 },
        { key: 'feedback', count: 0 },
      ]);
    });
  });

  describe('findTodos', () => {
    it('超级管理员：两源 UNION ALL 归一化按时间倒序分页，total 相加，昵称一次 IN 批查回填', async () => {
      reportService.countPending.mockResolvedValue(2);
      feedbackService.countPending.mockResolvedValue(1);
      userRepo.manager.query.mockResolvedValue([
        { source: 'report', id: 9, summary: '《x》文章含广告', submitter_id: 7, create_time: new Date('2026-11-28T10:00:00.000Z') },
        { source: 'feedback', id: 5, summary: '希望增加夜间模式', submitter_id: 8, create_time: new Date('2026-11-28T09:00:00.000Z') },
        { source: 'feedback', id: 4, summary: '保存文章时报错', submitter_id: 7, create_time: new Date('2026-11-27T09:00:00.000Z') },
      ]);
      userRepo.find.mockResolvedValue([
        { userId: 7, nickName: '张三' },
        { userId: 8, nickName: '李四' },
      ]);

      const res = await service.findTodos({ pageNum: 1, pageSize: 5 } as any, { permissions: ['*:*:*'] } as any);

      const [sql, params] = userRepo.manager.query.mock.calls[0];
      expect(sql).toContain('UNION ALL');
      expect(sql).toContain('FROM post_report');
      expect(sql).toContain('FROM post_feedback');
      expect(sql).toContain('ORDER BY create_time DESC');
      // 两分支 status 常量在前，LIMIT offset,size 收尾
      expect(params).toEqual(['0', '0', 0, 5]);
      expect(res.data.total).toBe(3);
      expect(res.data.list).toHaveLength(3);
      expect(res.data.list[0]).toMatchObject({ source: 'report', id: 9, summary: '《x》文章含广告', submitterName: '张三' });
      expect(userRepo.find).toHaveBeenCalledWith({ where: { userId: In([7, 8]) }, select: ['userId', 'nickName'] });
    });

    it('仅举报权限：UNION 只含举报分支，反馈计数不查询', async () => {
      reportService.countPending.mockResolvedValue(2);
      userRepo.manager.query.mockResolvedValue([]);
      userRepo.find.mockResolvedValue([]);

      const res = await service.findTodos({ pageNum: 1, pageSize: 5 } as any, { permissions: ['post:report:list'] } as any);

      const sql = userRepo.manager.query.mock.calls[0][0] as string;
      expect(sql).toContain('FROM post_report');
      expect(sql).not.toContain('FROM post_feedback');
      expect(feedbackService.countPending).not.toHaveBeenCalled();
      expect(res.data.total).toBe(2);
    });

    it('无任何待办模块权限：空 list/total，不执行 UNION 查询', async () => {
      const res = await service.findTodos({ pageNum: 1, pageSize: 5 } as any, { permissions: ['system:user:list'] } as any);

      expect(userRepo.manager.query).not.toHaveBeenCalled();
      expect(reportService.countPending).not.toHaveBeenCalled();
      expect(feedbackService.countPending).not.toHaveBeenCalled();
      expect(res.data).toEqual({ list: [], total: 0 });
    });

    it('分页换算：pageNum=2&pageSize=5 → LIMIT 5,5；缺省 pageSize=10', async () => {
      userRepo.manager.query.mockResolvedValue([]);
      userRepo.find.mockResolvedValue([]);

      await service.findTodos({ pageNum: 2, pageSize: 5 } as any, { permissions: ['*:*:*'] } as any);
      expect(userRepo.manager.query.mock.calls[0][1]).toEqual(['0', '0', 5, 5]);

      await service.findTodos({ pageNum: 1 } as any, { permissions: ['*:*:*'] } as any);
      expect(userRepo.manager.query.mock.calls[1][1]).toEqual(['0', '0', 0, 10]);
    });
  });
});

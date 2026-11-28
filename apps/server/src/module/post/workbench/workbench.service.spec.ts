import { WorkbenchService } from './workbench.service';

/**
 * 工作台服务核心路径：summary 按权限逐项过滤（hasPermission 通配感知，超管 '*:*:*' 全见）
 * 与并发计数透传；待处理口径归各业务服务自管（countPending mock 档位），此处只验证聚合纪律
 */
describe('WorkbenchService', () => {
  const reportService = { countPending: jest.fn() };
  const feedbackService = { countPending: jest.fn() };

  let service: WorkbenchService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new WorkbenchService(reportService as any, feedbackService as any);
  });

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

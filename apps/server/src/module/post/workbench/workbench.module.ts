import { Module } from '@nestjs/common';
import { WorkbenchController } from './workbench.controller';
import { WorkbenchService } from './workbench.service';
import { PostReportModule } from '../report/report.module';
import { PostFeedbackModule } from '../feedback/feedback.module';

/**
 * 工作台模块：管理端首页待办聚合（summary 按权限逐项过滤）
 * 显式依赖：举报/反馈模块（待处理计数归各业务服务自管 countPending，模块均已 export service）
 */
@Module({
  imports: [PostReportModule, PostFeedbackModule],
  controllers: [WorkbenchController],
  providers: [WorkbenchService],
})
export class PostWorkbenchModule {}

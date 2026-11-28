import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkbenchController } from './workbench.controller';
import { WorkbenchService } from './workbench.service';
import { UserEntity } from 'src/module/system/user/entities/sys-user.entity';
import { PostReportModule } from '../report/report.module';
import { PostFeedbackModule } from '../feedback/feedback.module';

/**
 * 工作台模块：管理端首页待办聚合（summary 计数 + todos 统一队列，均按权限逐项过滤）
 * 显式依赖：举报/反馈模块（待处理计数归各业务服务自管 countPending，模块均已 export service）、
 * UserEntity（todos 队列的 raw UNION 查询与提交人昵称批查——forFeature 仓储不随 @Global 传递）
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), PostReportModule, PostFeedbackModule],
  controllers: [WorkbenchController],
  providers: [WorkbenchService],
})
export class PostWorkbenchModule {}

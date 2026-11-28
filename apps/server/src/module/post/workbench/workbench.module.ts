import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkbenchController } from './workbench.controller';
import { WorkbenchService } from './workbench.service';
import { UserEntity } from 'src/module/system/user/entities/sys-user.entity';
import { PostWorkbenchReadEntity } from './entities/workbench-read.entity';
import { PostReportModule } from '../report/report.module';
import { PostFeedbackModule } from '../feedback/feedback.module';

/**
 * 工作台模块：管理端首页待办聚合（todos 统一队列按权限逐源过滤 + 逐条已读标记）
 * 显式依赖：举报/反馈模块（待处理计数归各业务服务自管 countPending/countDone，模块均已 export service）、
 * UserEntity（todos 队列的 raw UNION 查询与提交人昵称批查）、PostWorkbenchReadEntity（逐条已读标记，30 号表）
 * ——forFeature 仓储不随 @Global 传递
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, PostWorkbenchReadEntity]), PostReportModule, PostFeedbackModule],
  controllers: [WorkbenchController],
  providers: [WorkbenchService],
})
export class PostWorkbenchModule {}

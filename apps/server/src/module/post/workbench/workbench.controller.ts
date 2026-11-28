import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkbenchService } from './workbench.service';
import { User, UserDto } from 'src/module/system/user/user.decorator';

/**
 * 工作台控制器
 * - 管理端首页待办聚合：一个 summary 接口按权限逐项过滤返回，前端只渲染拿到的卡片
 * - 仅要求登录不挂权限串：权限判断在服务层逐项 hasPermission（通配感知），无权限源不出现在响应里，
 *   挂权限串反而把无任何待办模块权限的用户整接口 403（首页对全员开放，卡片按权限有无）
 */
@ApiTags('工作台')
@Controller('post/workbench')
export class WorkbenchController {
  constructor(private readonly workbenchService: WorkbenchService) {}

  /**
   * 待办汇总（各源待处理计数；按当前用户权限过滤，仅返回有权管理的源）
   */
  @ApiOperation({ summary: '工作台-待办汇总' })
  @Get('/summary')
  summary(@User() user: UserDto) {
    return this.workbenchService.summary(user);
  }
}

import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PostReportService } from './report.service';
import { CreateReportDto, HandleReportDto, ListReportDto } from './dto/index';
import { RequirePermission } from 'src/common/decorators/require-premission.decorator';
import { User, UserDto } from 'src/module/system/user/user.decorator';

/**
 * 举报控制器
 * - 写路径（提交/状态查询）面向登录用户，只要求 JWT，不挂权限串（同点赞/关注登录路径口径）
 * - 举报必须登录：匿名举报等于白送刷子接口，guest 不开放
 * - 处理反馈走 sys_notice 定向通知（type=3 举报反馈），前台「系统通知」栏承接，无独立反馈端点
 * - 管理路径（列表/处理/批量删除）挂 post:report:* 权限串
 */
@ApiTags('举报管理')
@Controller('post/report')
export class PostReportController {
  constructor(private readonly reportService: PostReportService) {}

  /**
   * 提交举报（登录用户；同一目标存在待处理举报时重复提交报错返回，处理完成后可再次举报）
   */
  @ApiOperation({ summary: '举报-提交' })
  @HttpCode(200)
  @Post()
  create(@Body() dto: CreateReportDto, @User() user: UserDto) {
    return this.reportService.create(dto, user.userId);
  }

  /**
   * 当前用户对目标是否已举报过（举报按钮「已举报」置灰态，同关注 status 三态口径）
   */
  @ApiOperation({ summary: '举报-是否已举报过' })
  @Get('/status/:targetType/:targetId')
  status(@Param('targetType') targetType: string, @Param('targetId', ParseIntPipe) targetId: number, @User() user: UserDto) {
    return this.reportService.statusByTarget(targetType, targetId, user.userId);
  }

  /**
   * 举报管理列表（管理端；行含当前用户 isRead，打开处理弹窗即标记已读）
   */
  @ApiOperation({ summary: '举报-管理列表' })
  @RequirePermission('post:report:list')
  @Get('/list')
  findAdminList(@Query() query: ListReportDto, @User() user: UserDto) {
    return this.reportService.findAdminList(query, user.userId);
  }

  /**
   * 处理举报（管理端：结论成立/驳回 + 可选下架文章/停用用户，事务内同落）
   */
  @ApiOperation({ summary: '举报-处理' })
  @RequirePermission('post:report:handle')
  @HttpCode(200)
  @Put('/handle/:id')
  handle(@Param('id', ParseIntPipe) id: number, @Body() dto: HandleReportDto, @User() user: UserDto) {
    return this.reportService.handle(id, dto, user.userId);
  }

  /**
   * 批量删除举报记录（管理端，物理删除；删除会释放该举报人对该目标的举报资格）
   */
  @ApiOperation({ summary: '举报-批量删除' })
  @RequirePermission('post:report:remove')
  @Delete('/batch/:ids')
  removeByIds(@Param('ids') ids: string) {
    return this.reportService.removeByIds(ids.split(',').map((id) => +id));
  }
}

import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PostFeedbackService } from './feedback.service';
import { CreateFeedbackDto, HandleFeedbackDto, ListFeedbackDto } from './dto/index';
import { RequirePermission } from 'src/common/decorators/require-premission.decorator';
import { User, UserDto } from 'src/module/system/user/user.decorator';

/**
 * 用户反馈控制器
 * - 写路径（提交）面向登录用户，只要求 JWT，不挂权限串（同点赞/关注/举报登录路径口径）：
 *   反馈是所有登录用户的基本能力，挂权限串等于向普通用户关闭入口，由 24h 频控承担防刷
 * - 处理通知走 sys_notice 定向通知（noticeType='4' 反馈回复），前台「系统通知」栏承接，无独立反馈端点
 * - 管理路径（列表/处理/批量删除）挂 post:feedback:* 权限串
 */
@ApiTags('用户反馈')
@Controller('post/feedback')
export class PostFeedbackController {
  constructor(private readonly feedbackService: PostFeedbackService) {}

  /**
   * 提交反馈（登录用户；24h 窗口 10 条频控，超限报错返回）
   */
  @ApiOperation({ summary: '反馈-提交' })
  @HttpCode(200)
  @Post()
  create(@Body() dto: CreateFeedbackDto, @User() user: UserDto) {
    return this.feedbackService.create(dto, user.userId);
  }

  /**
   * 反馈管理列表（管理端；行含当前用户 isRead，打开详情抽屉即标记已读）
   */
  @ApiOperation({ summary: '反馈-管理列表' })
  @RequirePermission('post:feedback:list')
  @Get('/list')
  findAdminList(@Query() query: ListFeedbackDto, @User() user: UserDto) {
    return this.feedbackService.findAdminList(query, user.userId);
  }

  /**
   * 处理反馈（管理端：回复/关闭两结论，终态不可重复处理，事务内同落定向通知）
   */
  @ApiOperation({ summary: '反馈-处理' })
  @RequirePermission('post:feedback:handle')
  @HttpCode(200)
  @Put('/handle/:id')
  handle(@Param('id', ParseIntPipe) id: number, @Body() dto: HandleFeedbackDto, @User() user: UserDto) {
    return this.feedbackService.handle(id, dto, user.userId);
  }

  /**
   * 批量删除反馈记录（管理端，物理删除）
   */
  @ApiOperation({ summary: '反馈-批量删除' })
  @RequirePermission('post:feedback:remove')
  @Delete('/batch/:ids')
  removeByIds(@Param('ids') ids: string) {
    return this.feedbackService.removeByIds(ids.split(',').map((id) => +id));
  }
}

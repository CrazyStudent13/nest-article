import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PagingDto } from 'src/common/dto/index';
import { FeedbackStatusEnum } from '@nest-acticle/shared';

/** 截图附件 URL 形态：只收本站上传通道（POST /common/upload）产物——/profile/ 虚拟路径开头的相对 URL，防外链注入 */
const ATTACHMENT_URL_PATTERN = /^\/profile\/[\w\-./]+$/;

/**
 * 提交反馈 DTO（登录用户；类型合法性由服务端按字典 post_feedback_type 缓存校验）
 */
export class CreateFeedbackDto {
  @ApiProperty({ required: true, description: '反馈类型（字典 post_feedback_type 的 dictValue，服务端按字典缓存校验合法性）' })
  @IsString()
  @Length(1, 1)
  type: string;

  @ApiProperty({ required: true, description: '反馈内容（1-500 字）' })
  @IsString()
  @Length(1, 500)
  content: string;

  @ApiProperty({ required: false, maxItems: 3, description: '截图附件（可选，至多 3 张，/common/upload 返回的 /profile/ 相对 URL）' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3, { message: '截图附件至多 3 张' })
  @IsString({ each: true })
  @Length(1, 255, { each: true, message: '附件地址过长' })
  @Matches(ATTACHMENT_URL_PATTERN, { each: true, message: '附件地址非法（仅支持本站上传的图片地址）' })
  attachments?: string[];
}

/**
 * 反馈管理列表查询 DTO（管理端）
 */
export class ListFeedbackDto extends PagingDto {
  @ApiProperty({ required: false, description: '反馈类型（dictValue 精确匹配）' })
  @IsOptional()
  @IsString()
  @Length(1, 1)
  type?: string;

  @ApiProperty({ required: false, description: '处理状态（0 待处理 1 已回复 2 已关闭）' })
  @IsOptional()
  @IsString()
  @Length(1, 1)
  status?: string;

  @ApiProperty({ required: false, description: '提交人昵称（模糊搜索，联 sys_user）' })
  @IsOptional()
  @IsString()
  @Length(0, 64)
  userName?: string;
}

/**
 * 处理反馈 DTO（管理端）：结论必填（回复/关闭）
 * 回复（status=1）时 replyContent 必填；关闭（status=2）时可选简短说明（服务端校验）
 */
export class HandleFeedbackDto {
  @ApiProperty({ required: true, enum: [FeedbackStatusEnum.REPLIED, FeedbackStatusEnum.CLOSED], description: '处理结论（1 已回复 2 已关闭）' })
  @IsIn([FeedbackStatusEnum.REPLIED, FeedbackStatusEnum.CLOSED])
  status: string;

  @ApiProperty({ required: false, description: '回复内容（status=1 必填 1-500 字；status=2 可空简短说明）' })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  replyContent?: string;
}

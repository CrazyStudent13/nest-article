import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PagingDto } from 'src/common/dto/index';

/**
 * 待办/已办队列口径：待办 = status='0' 未处理；已办 = 全部已处理记录（团队视角，
 * A 处理的 B 可见——内容队列不是个人任务系统，个人「我经手的」筛选留二期按 handler 评估）
 */
export enum WorkbenchTodoTabEnum {
  PENDING = 'pending',
  DONE = 'done',
}

/**
 * 工作台待办队列查询 DTO：分页（PagingDto.params 复用为时间范围 beginTime/endTime，同管理列表 addDateRange 口径）
 * + tab 切换 + 来源筛选——队列固定按提交时间倒序（排序方向切换已删：有分页兜底，查详情应去对应管理页，方向切换无实际价值）
 */
export class ListTodoDto extends PagingDto {
  @ApiProperty({ required: false, enum: WorkbenchTodoTabEnum, description: '待办/已办', default: WorkbenchTodoTabEnum.PENDING })
  @IsOptional()
  @IsEnum(WorkbenchTodoTabEnum)
  tab?: WorkbenchTodoTabEnum;

  @ApiProperty({ required: false, enum: ['report', 'feedback'], description: '来源筛选（缺省全部有权源）' })
  @IsOptional()
  @IsIn(['report', 'feedback'])
  source?: string;
}

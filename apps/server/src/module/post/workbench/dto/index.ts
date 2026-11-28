import { PagingDto } from 'src/common/dto/index';

/**
 * 工作台待办列表查询 DTO：仅分页——队列固定按提交时间倒序，无筛选字段
 * （待办收件箱要的就是一队时间序；来源区分靠行内来源标签，将来源多了再评估加 source 筛选）
 */
export class ListTodoDto extends PagingDto {}

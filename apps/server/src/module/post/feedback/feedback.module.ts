import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostFeedbackService } from './feedback.service';
import { PostFeedbackController } from './feedback.controller';
import { PostFeedbackEntity } from './entities/feedback.entity';
import { UserEntity } from 'src/module/system/user/entities/sys-user.entity';
import { DictModule } from 'src/module/system/dict/dict.module';

/**
 * 用户反馈模块
 * forFeature 需同时注册用户实体——管理端列表 attachUserInfo 提交人昵称头像批查依赖，
 * forFeature 仓储不随 @Global 传递（同举报模块的注册口径）
 * 显式依赖：DictModule（反馈类型合法性走字典缓存校验）
 */
@Module({
  imports: [TypeOrmModule.forFeature([PostFeedbackEntity, UserEntity]), DictModule],
  controllers: [PostFeedbackController],
  providers: [PostFeedbackService],
  exports: [PostFeedbackService],
})
export class PostFeedbackModule {}

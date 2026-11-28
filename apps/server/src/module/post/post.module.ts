import { Module } from '@nestjs/common';
import { PostArticleModule } from './article/article.module';
import { PostSubjectModule } from './subject/subject.module';
import { PostLikeModule } from './like/like.module';
import { PostCommentModule } from './comment/comment.module';
import { PostNotifyModule } from './notify/notify.module';
import { PostCollectionModule } from './collection/collection.module';
import { PostFollowModule } from './follow/follow.module';
import { PostReportModule } from './report/report.module';
import { PostFeedbackModule } from './feedback/feedback.module';
import { PostWorkbenchModule } from './workbench/workbench.module';

/**
 * Post 模块（文章、专栏、点赞、评论、互动通知、收藏集、关注、举报、用户反馈和工作台）
 */
@Module({
  imports: [PostArticleModule, PostSubjectModule, PostLikeModule, PostCommentModule, PostNotifyModule, PostCollectionModule, PostFollowModule, PostReportModule, PostFeedbackModule, PostWorkbenchModule],
  exports: [PostArticleModule, PostSubjectModule, PostLikeModule, PostCommentModule, PostNotifyModule, PostCollectionModule, PostFollowModule, PostReportModule, PostFeedbackModule, PostWorkbenchModule],
})
export class PostModule {}

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

/**
 * Post 模块（文章、专栏、点赞、评论、互动通知、收藏集、关注、举报和用户反馈）
 */
@Module({
  imports: [PostArticleModule, PostSubjectModule, PostLikeModule, PostCommentModule, PostNotifyModule, PostCollectionModule, PostFollowModule, PostReportModule, PostFeedbackModule],
  exports: [PostArticleModule, PostSubjectModule, PostLikeModule, PostCommentModule, PostNotifyModule, PostCollectionModule, PostFollowModule, PostReportModule, PostFeedbackModule],
})
export class PostModule {}

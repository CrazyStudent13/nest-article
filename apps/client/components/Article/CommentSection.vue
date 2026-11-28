<!-- 文章评论区组件:掘金式两级结构（根评论+缩进回复）。
     服务端评论为平铺分页（最新在前，带 parentId/replyNickName），客户端沿 parentId 链向上归组成线程；
     父评论尚未加载的回复先按独立条目呈现，翻页加载到父评论后自动归位。
     删除为服务端级联（含全部后代），客户端沿链同步移除并按实际条数回抛计数 -->
<template>
  <div class="comment-section">
    <h3 class="comment-title">
      评论
      <span class="comment-count">{{ commentNum }}</span>
    </h3>

    <!-- 编辑区:登录态显示头像+输入框;回复模式显示横幅,提交携带 parentId -->
    <div v-if="isLoggedIn" class="comment-editor">
      <span class="editor-avatar">
        <img v-if="myAvatarUrl" :src="myAvatarUrl" :alt="myNickName" />
        <span v-else class="avatar-fallback">{{ myNickName.slice(0, 1) }}</span>
      </span>
      <div class="editor-main">
        <div v-if="replyTo" class="reply-banner">
          回复 @{{ nickName(replyTo) }}
          <button class="reply-cancel" type="button" @click="cancelReply">取消</button>
        </div>
        <textarea
          ref="inputRef"
          v-model="commentDraft"
          class="comment-input"
          maxlength="500"
          rows="3"
          :placeholder="replyTo ? `回复 @${nickName(replyTo)}（1-500 字）` : '写下你的评论（1-500 字）'"
        ></textarea>
        <div class="editor-actions">
          <span class="comment-hint">{{ commentDraft.length }}/500</span>
          <button class="comment-submit" type="button" :disabled="commentBusy || !commentDraft.trim()" @click="submitComment">
            {{ commentBusy ? '发布中…' : '发布' }}
          </button>
        </div>
      </div>
    </div>
    <button v-else class="comment-login" type="button" @click="openLogin">登录后即可发表评论</button>

    <!-- 列表:线程=根评论+其回复;回复超过 2 条折叠,点「展开」看全部已加载回复 -->
    <div v-if="threads.length" class="comment-list">
      <div v-for="thread in threads" :key="thread.root.id" class="comment-thread">
        <!-- 根评论 -->
        <div class="comment-item">
          <span class="comment-avatar">
            <img v-if="thread.root.userInfo?.avatar" :src="avatarUrl(thread.root)" :alt="nickName(thread.root)" loading="lazy" />
            <span v-else class="avatar-fallback">{{ nickName(thread.root).slice(0, 1) }}</span>
          </span>
          <div class="comment-main">
            <div class="comment-head">
              <NuxtLink class="comment-author" :to="{ path: '/user/space', query: { id: String(thread.root.userId) } }">
                {{ nickName(thread.root) }}
              </NuxtLink>
              <span v-if="isArticleAuthor(thread.root)" class="author-badge">作者</span>
            </div>
            <p class="comment-content">{{ thread.root.content }}</p>
            <div class="comment-meta">
              <span class="comment-time">{{ formatRelativeTime(thread.root.createTime) }}</span>
              <button class="meta-btn" type="button" @click="startReply(thread.root)">
                <AppIcon name="comment" :size="14" />
                回复
              </button>
              <button
                v-if="isMine(thread.root)"
                class="meta-btn is-danger"
                type="button"
                :disabled="commentDeletingId === thread.root.id"
                @click="removeComment(thread.root)"
              >
                {{ commentDeletingId === thread.root.id ? '删除中…' : '删除' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 回复列表:缩进到根评论内容左缘,小号头像 -->
        <div v-if="thread.replies.length" class="reply-list">
          <div v-for="reply in visibleReplies(thread)" :key="reply.id" class="comment-item is-reply">
            <span class="comment-avatar">
              <img v-if="reply.userInfo?.avatar" :src="avatarUrl(reply)" :alt="nickName(reply)" loading="lazy" />
              <span v-else class="avatar-fallback">{{ nickName(reply).slice(0, 1) }}</span>
            </span>
            <div class="comment-main">
              <div class="comment-head">
                <NuxtLink class="comment-author" :to="{ path: '/user/space', query: { id: String(reply.userId) } }">
                  {{ nickName(reply) }}
                </NuxtLink>
                <span v-if="isArticleAuthor(reply)" class="author-badge">作者</span>
              </div>
              <p class="comment-content">
                <!-- 掘金口径:直接回复根评论不带 @ 标记,楼中楼（回复的回复）才显示;@ 对方昵称可跳其空间 -->
                <span v-if="reply.replyNickName && reply.parentId !== thread.root.id" class="reply-tag">
                  回复
                  <NuxtLink v-if="reply.replyUserId" class="reply-user" :to="{ path: '/user/space', query: { id: String(reply.replyUserId) } }">
                    @{{ reply.replyNickName }}：
                  </NuxtLink>
                  <template v-else>@{{ reply.replyNickName }}：</template>
                </span>{{ reply.content }}
              </p>
              <div class="comment-meta">
                <span class="comment-time">{{ formatRelativeTime(reply.createTime) }}</span>
                <button class="meta-btn" type="button" @click="startReply(reply)">
                  <AppIcon name="comment" :size="14" />
                  回复
                </button>
                <button
                  v-if="isMine(reply)"
                  class="meta-btn is-danger"
                  type="button"
                  :disabled="commentDeletingId === reply.id"
                  @click="removeComment(reply)"
                >
                  {{ commentDeletingId === reply.id ? '删除中…' : '删除' }}
                </button>
              </div>
            </div>
          </div>
          <button v-if="thread.replies.length > REPLY_PREVIEW_COUNT" class="reply-toggle" :class="{ 'is-open': isExpanded(thread) }" type="button" @click="toggleThread(thread)">
            {{ isExpanded(thread) ? '收起回复' : `展开 ${thread.replies.length} 条回复` }}
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

    </div>
    <CommonEmptyState v-else-if="!commentLoading" text="还没有评论，来抢沙发" />

    <!-- 查看更多：常驻视口右下角的悬浮按钮，线程分页还有余量时随时可拉，不必滚到列表末尾找入口 -->
    <button v-if="hasMoreThreads" class="comment-more-fab" type="button" :disabled="commentLoading" @click="loadMoreComments">
      {{ commentLoading ? '加载中…' : '查看更多评论' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { formatRelativeTime } from '@nest-acticle/utils'
import type { CommentItem } from '@nest-acticle/shared'

const props = withDefaults(
  defineProps<{
    articleId: number | string
    /** 文章冗余的评论总数（头部计数,由父组件持有,增删后回抛新值） */
    commentNum?: number
    /** 文章作者用户 id:评论人命中时显示「作者」徽标 */
    authorUserId?: number
  }>(),
  {
    commentNum: 0,
    authorUserId: undefined
  }
)

const emit = defineEmits<{
  (e: 'update:commentNum', value: number): void
}>()

const config = useRuntimeConfig()
const { isLoggedIn, user } = useUser()
const { openLogin } = useAuthModal()
const { fetchComments, addComment, deleteComment } = useComment()

/** 回复折叠阈值:超过该数默认收起,仅展示前 N 条 */
const REPLY_PREVIEW_COUNT = 2

// ---------- 展示口径 ----------
const nickName = (item: CommentItem) => item.userInfo?.nickName || '用户'
const avatarUrl = (item: CommentItem) => toCoverUrl(config.public.apiBase, item.userInfo?.avatar)
const isMine = (item: CommentItem) => !!user.value?.userId && item.userId === user.value.userId
const isArticleAuthor = (item: CommentItem) => props.authorUserId != null && item.userId === props.authorUserId

const myNickName = computed(() => user.value?.nickName || '用户')
const myAvatarUrl = computed(() => toCoverUrl(config.public.apiBase, user.value?.avatar))

// ---------- 回复模式:非空时编辑器处于回复状态,提交携带 parentId ----------
const commentDraft = ref('')
const commentBusy = ref(false)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const replyTo = ref<CommentItem | null>(null)

const startReply = (item: CommentItem) => {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  replyTo.value = item
  nextTick(() => inputRef.value?.focus())
}

const cancelReply = () => {
  replyTo.value = null
}

// ---------- 列表加载:guest 平铺分页,最新在前 ----------
const comments = ref<CommentItem[]>([])
// 文章切换时旧请求可能后到:序号只认最新一次加载，避免旧文章结果覆盖新列表
let listSeq = 0
// 根评论线程总数（服务端按线程分页的「查看更多」判断依据）
const rootTotal = ref(0)
const commentPageNum = ref(1)
const commentLoading = ref(false)
/** 已展开回复的线程根 id 集合 */
const expandedThreads = ref(new Set<number>())

const loadComments = async (page = 1) => {
  const articleId = props.articleId
  if (!articleId) {
    return
  }
  const seq = ++listSeq
  commentLoading.value = true
  try {
    const data = await fetchComments(articleId, { pageNum: page, pageSize: 10 })
    if (seq !== listSeq) {
      return
    }
    if (page === 1) {
      comments.value = data.list || []
      expandedThreads.value = new Set()
    } else {
      // 新评论本地插到头部后再翻页,offset 会与已加载行重叠:按 id 去重
      const seen = new Set(comments.value.map((item) => item.id))
      comments.value = [...comments.value, ...(data.list || []).filter((item) => !seen.has(item.id))]
    }
    rootTotal.value = data.rootTotal ?? 0
    commentPageNum.value = page
  } catch {
    if (seq === listSeq && page === 1) {
      comments.value = []
    }
  } finally {
    // 过期请求不要打断新请求的加载态
    if (seq === listSeq) {
      commentLoading.value = false
    }
  }
}

const loadMoreComments = () => loadComments(commentPageNum.value + 1)

// 线程分页口径：已加载的根评论线程数 < 服务端线程总数时还有更多可拉
const hasMoreThreads = computed(() => {
  const loadedRoots = comments.value.filter((item) => !item.parentId).length
  return loadedRoots < rootTotal.value
})

// 评论列表依赖文章 id:挂载后客户端补查,文章切换时重拉
onMounted(() => {
  if (props.articleId) {
    loadComments(1)
  }
})
watch(
  () => props.articleId,
  (id) => {
    if (id) {
      cancelReply()
      // 先清旧文章的状态,避免新文章加载期间仍显示上一篇的评论
      comments.value = []
      rootTotal.value = 0
      commentPageNum.value = 1
      expandedThreads.value = new Set()
      loadComments(1)
    }
  }
)

// ---------- 平铺 → 线程归组 ----------
interface CommentThread {
  root: CommentItem
  replies: CommentItem[]
}

const threads = computed<CommentThread[]>(() => {
  const byId = new Map<number, CommentItem>()
  comments.value.forEach((item) => byId.set(item.id, item))
  const timeValue = (item: CommentItem) => {
    const value = item.createTime ? new Date(item.createTime).getTime() : 0
    return Number.isNaN(value) ? 0 : value
  }

  // 平铺列表最新在前（回复总比父评论新,翻页时父评论可能后到）:
  // 每条评论沿 parentId 链向上找已加载的最顶层祖先归组;找不到就以自己为线程根,父评论加载后自动归位
  const rootIds: number[] = []
  const repliesOf = new Map<number, CommentItem[]>()
  for (const item of comments.value) {
    let top = item
    for (let depth = 0; depth < 64 && top.parentId && byId.has(top.parentId); depth += 1) {
      top = byId.get(top.parentId)!
    }
    if (!rootIds.includes(top.id)) {
      rootIds.push(top.id)
    }
    if (item.id !== top.id) {
      const bucket = repliesOf.get(top.id) ?? []
      bucket.push(item)
      repliesOf.set(top.id, bucket)
    }
  }

  return rootIds
    .map((id) => ({
      root: byId.get(id)!,
      // 线程内回复按时间正序,会话自上而下可读
      replies: (repliesOf.get(id) ?? []).sort((a, b) => timeValue(a) - timeValue(b) || a.id - b.id)
    }))
    // 线程按根评论时间倒序,与列表口径一致
    .sort((a, b) => timeValue(b.root) - timeValue(a.root))
})

const isExpanded = (thread: CommentThread) => expandedThreads.value.has(thread.root.id)
const visibleReplies = (thread: CommentThread) =>
  isExpanded(thread) || thread.replies.length <= REPLY_PREVIEW_COUNT ? thread.replies : thread.replies.slice(0, REPLY_PREVIEW_COUNT)
const toggleThread = (thread: CommentThread) => {
  const next = new Set(expandedThreads.value)
  if (next.has(thread.root.id)) {
    next.delete(thread.root.id)
  } else {
    next.add(thread.root.id)
  }
  expandedThreads.value = next
}

// ---------- 发表:带 parentId 即回复;计数回抛父组件同步文章冗余字段 ----------
const submitComment = async () => {
  const content = commentDraft.value.trim()
  if (!content || commentBusy.value) {
    return
  }
  const articleId = props.articleId
  if (!articleId) {
    return
  }
  commentBusy.value = true
  try {
    const created = await addComment(articleId, content, replyTo.value?.id ?? undefined)
    // 请求期间已切到别的文章:评论虽已发出,但不能写进当前文章的列表与计数
    if (props.articleId !== articleId) {
      return
    }
    if (created) {
      // 列表为最新在前,新评论插头部后由归组逻辑落到对应线程（根评论则新起线程）
      comments.value = [created, ...comments.value]
      if (!created.parentId) {
        rootTotal.value += 1
      }
      emit('update:commentNum', props.commentNum + 1)
      // 命中已折叠线程时自动展开,保证刚发的回复可见
      const target = threads.value.find((thread) => thread.root.id === created.id || thread.replies.some((reply) => reply.id === created.id))
      if (target) {
        expandedThreads.value = new Set(expandedThreads.value).add(target.root.id)
      }
      commentDraft.value = ''
      cancelReply()
      showToast('评论发布成功', 'success')
    }
  } catch (error: any) {
    showToast(error?.message || '评论发布失败，请稍后再试', 'error')
  } finally {
    commentBusy.value = false
  }
}

// ---------- 删除:服务端级联删掉全部后代,客户端沿链收集已加载后代一并移除 ----------
const commentDeletingId = ref<number | null>(null)

const collectDoomedIds = (rootId: number) => {
  const doomed = new Set<number>([rootId])
  let grew = true
  while (grew) {
    grew = false
    comments.value.forEach((item) => {
      if (item.parentId && doomed.has(item.parentId) && !doomed.has(item.id)) {
        doomed.add(item.id)
        grew = true
      }
    })
  }
  return doomed
}

const removeComment = async (item: CommentItem) => {
  if (commentDeletingId.value) {
    return
  }
  const confirmed = await confirmAction({
    title: '删除评论',
    message: '确定删除这条评论吗？其下的回复也会一并删除。',
    confirmText: '删除',
    danger: true
  })
  if (!confirmed) {
    return
  }
  const articleId = props.articleId
  commentDeletingId.value = item.id
  try {
    const serverRemoved = await deleteComment(item.id)
    // 请求期间已切到别的文章:删除已生效,但不再动当前文章的列表与计数
    if (props.articleId !== articleId) {
      return
    }
    const doomed = collectDoomedIds(item.id)
    comments.value = comments.value.filter((c) => !doomed.has(c.id))
    // 以服务端实际删除条数为准（含未加载的级联后代），接口无回抛时退回本地统计
    const removed = serverRemoved || doomed.size
    if (!item.parentId) {
      rootTotal.value = Math.max(0, rootTotal.value - 1)
    }
    emit('update:commentNum', Math.max(0, props.commentNum - removed))
    // 回复目标被删（含级联）时退出回复模式
    if (replyTo.value && doomed.has(replyTo.value.id)) {
      cancelReply()
    }
    showToast('评论已删除', 'success')
  } catch (error: any) {
    showToast(error?.message || '删除失败，请稍后再试', 'error')
  } finally {
    commentDeletingId.value = null
  }
}
</script>

<style lang="less" scoped>
.comment-section {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border-light);

  .comment-title {
    margin: 0 0 16px;
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text-1);

    .comment-count {
      font-size: 14px;
      font-weight: 400;
      color: var(--color-text-3);
      margin-left: 4px;
    }
  }

  .comment-editor {
    margin-bottom: 8px;
    display: flex;
    gap: 12px;

    .editor-avatar {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      line-height: 0;

      img {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-full);
        object-fit: cover;
      }

      .avatar-fallback {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-full);
        background-image: var(--gradient-brand);
        font-size: 14px;
        color: #fff;
      }
    }

    .editor-main {
      flex: 1;
      min-width: 0;

      .reply-banner {
        margin-bottom: 8px;
        padding: 6px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-radius: var(--radius-sm);
        background-color: var(--color-primary-light);
        font-size: 13px;
        color: var(--color-primary);

        .reply-cancel {
          padding: 0;
          border: 0;
          background-color: transparent;
          font-size: 12px;
          color: var(--color-text-3);
          cursor: pointer;

          &:hover {
            color: var(--color-text-1);
          }
        }
      }

      .comment-input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-sm);
        background-color: var(--color-bg);
        font-size: 13px;
        line-height: 20px;
        color: var(--color-text-1);
        resize: vertical;
        outline: none;
        transition: border-color 0.2s ease;

        &:focus {
          border-color: var(--color-primary);
        }
      }

      .editor-actions {
        margin-top: 8px;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;

        .comment-hint {
          font-size: 12px;
          color: var(--color-text-3);
        }
      }
    }
  }

  .comment-submit {
    padding: 6px 16px;
    border: 0;
    border-radius: var(--radius-sm);
    background-image: var(--gradient-brand);
    font-size: 13px;
    color: #fff;
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  // 未登录引导条:整条可点,触发登录弹窗
  .comment-login {
    width: 100%;
    margin-bottom: 8px;
    padding: 12px 16px;
    border: 0;
    border-radius: var(--radius-sm);
    background-color: var(--color-bg);
    font-size: 13px;
    color: var(--color-text-3);
    text-align: left;
    cursor: pointer;
    transition: color 0.2s ease;

    &:hover {
      color: var(--color-text-2);
    }
  }

  // 查看更多评论：常驻视口右下角的悬浮胶囊按钮（脱离列表流，不随滚动消失；
  // 放在 .comment-section 直属层级——按钮模板已移出 .comment-list，嵌套选择器会匹配不上）
  // bottom 84px 让位全站反馈入口（FeedbackWidget 44px 圆钮常驻 28/28 基准位，z-95）：
  // 两者同现时垂直堆叠（胶囊在上、圆钮在下），间距 12px，不硬叠
  .comment-more-fab {
    position: fixed;
    right: 28px;
    bottom: 84px;
    z-index: 90;
    padding: 10px 20px;
    border: 1px solid var(--color-border-light);
    border-radius: 999px;
    background-color: var(--color-surface);
    font-size: 14px;
    color: var(--color-text-1);
    box-shadow: var(--shadow-2);
    cursor: pointer;
    transition:
      color 0.2s ease,
      border-color 0.2s ease,
      transform 0.2s ease;

    &:hover:not(:disabled) {
      color: var(--color-primary);
      border-color: var(--color-primary);
      transform: translateY(-1px);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .comment-list {
    .comment-thread {
      padding: 16px 0;

      &:not(:last-child) {
        border-bottom: 1px solid var(--color-border-light);
      }
    }

    .comment-item {
      display: flex;
      gap: 12px;

      .comment-avatar {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        line-height: 0;

        img {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-full);
          object-fit: cover;
        }

        .avatar-fallback {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-full);
          background-image: var(--gradient-brand);
          font-size: 14px;
          color: #fff;
        }
      }

      .comment-main {
        flex: 1;
        min-width: 0;

        .comment-head {
          display: flex;
          align-items: center;
          gap: 6px;

          .comment-author {
            font-size: 14px;
            font-weight: 500;
            color: var(--color-text-1);
            transition: color 0.2s ease;

            // 链接悬浮统一：主题色 + 下划线（与通知中心评论栏一致）
            &:hover {
              color: var(--color-primary);
              text-decoration: underline;
              text-underline-offset: 2px;
            }
          }

          // 「作者」徽标:评论人是文章作者时展示（掘金同款）
          .author-badge {
            flex-shrink: 0;
            padding: 0 5px;
            border-radius: 3px;
            background-color: var(--color-primary-light);
            font-size: 11px;
            line-height: 18px;
            color: var(--color-primary);
          }
        }

        .comment-content {
          margin: 4px 0 0;
          font-size: 14px;
          line-height: 22px;
          color: var(--color-text-1);
          white-space: pre-wrap;
          overflow-wrap: anywhere;

          .reply-tag {
            color: var(--color-primary);

            .reply-user {
              color: inherit;
              transition: color 0.2s ease;

              // 链接悬浮统一：下划线（偏移 2px）
              &:hover {
                text-decoration: underline;
                text-underline-offset: 2px;
              }
            }
          }
        }

        // 操作行:时间 + 回复 + 删除,置于内容下方（掘金布局）
        .comment-meta {
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 12px;
          color: var(--color-text-3);

          .meta-btn {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 0;
            border: 0;
            background-color: transparent;
            font-size: 12px;
            color: var(--color-text-3);
            cursor: pointer;
            transition: color 0.2s ease;

            svg {
              flex-shrink: 0;
            }

            &:hover:not(:disabled) {
              color: var(--color-primary);
            }

            &.is-danger:hover:not(:disabled) {
              color: #d1242f;
            }

            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          }
        }
      }

      // 回复行:小号头像,元信息同步缩小
      &.is-reply {
        padding: 10px 0;

        .comment-avatar {
          width: 24px;
          height: 24px;

          img {
            width: 24px;
            height: 24px;
          }

          .avatar-fallback {
            width: 24px;
            height: 24px;
            font-size: 11px;
          }
        }

        .comment-main {
          .comment-author {
            font-size: 13px;
          }

          .comment-content {
            margin-top: 2px;
            font-size: 13px;
            line-height: 20px;
          }

          .comment-meta {
            margin-top: 6px;
          }
        }
      }
    }

    .reply-list {
      // 40px 根评论头像 + 12px 间距,回复与根评论内容左缘对齐
      margin: 12px 0 0 52px;

      .reply-toggle {
        margin-top: 6px;
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 0;
        border: 0;
        background-color: transparent;
        font-size: 13px;
        color: var(--color-text-2);
        cursor: pointer;
        transition: color 0.2s ease;

        svg {
          transition: transform 0.2s ease;
        }

        &.is-open svg {
          transform: rotate(180deg);
        }

        &:hover {
          color: var(--color-primary);
        }
      }
    }
  }
}
</style>

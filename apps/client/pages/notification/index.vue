<!-- 通知中心页：左侧四分类竖栏（评论/赞和收藏/新增粉丝/系统通知，均带未读数红标）+ 右侧列表；系统通知接 /api/system/notice/list（scope=mine 只回全员公告+发给我的定向通知，行级 unread 区分已读未读——未读标题深色带红点/已读变淡不加粗；严格逐条已读：进列表不标，点进详情页才标那一条（notice/detail.vue 调 /post/notify/read-notices）；举报反馈是 type=3 定向私密通知，红色「举报反馈」徽标区分；反馈回复是 type=4 定向私密通知（用户反馈的处理结果），绿色「反馈回复」徽标区分，不单开 tab）；评论栏双子栏——「收到的评论」接 /api/post/comment/received/list（他人评论我的文章/回复我的评论，掘金式四行结构：动作短句/内容/文章引用行/时间），「我发表的」接 /api/post/comment/my/list（类型徽标区分，支持删除）；赞和收藏栏双子栏——「收到的赞」接 /api/post/like/received/list、「收到的收藏」接 /api/post/collection/received/list（他人把我的文章收进 ta 的公开收藏集，同款结构）；新增粉丝接 /api/post/follow/received/list（谁关注了我，行尾回关按钮三态）；互动三分类进入即逐栏清红标（赞和收藏栏一次推平 like+collect 两水位），系统通知不清；tab 状态同步 ?query，全站唯一通知入口（头部铃铛同款分类） -->
<template>
  <div class="notification-page">
    <div class="notice-panel">
      <!-- 左侧分类菜单 -->
      <aside class="notice-menu">
        <button
          v-for="cat in noticeCats"
          :key="cat.key"
          class="menu-item"
          :class="{ active: activeTab === cat.key }"
          type="button"
          @click="switchCat(cat.key)"
        >
          <span class="menu-icon" v-html="cat.icon" />
          {{ cat.label }}
          <!-- 未读数：与铃铛同源，进入对应分类栏即清（当前栏会先亮后清，掘金同款） -->
          <i v-if="catUnread(cat.key) > 0" class="menu-count">{{ catUnread(cat.key) > 99 ? '99+' : catUnread(cat.key) }}</i>
        </button>
      </aside>

      <!-- 右侧内容区 -->
      <section class="notice-main" :class="{ 'notice-main--system': activeTab === 'system' }">
        <!-- 系统通知：真实列表 -->
        <template v-if="activeTab === 'system'">
          <template v-if="notices.length">
            <div class="system-bar">
              <!-- 全部已读：严格逐条模型的补充动作，一键清掉所有可见通知的未读 -->
              <button class="read-all-btn" type="button" :disabled="markingAll || !unread.system" @click="markAllRead">
                {{ markingAll ? '标记中…' : unread.system > 0 ? `全部已读（${unread.system}）` : '全部已读' }}
              </button>
            </div>
            <NuxtLink
              v-for="item in notices"
              :key="item.noticeId"
              class="notice-item notice-item--compact notice-item--clickable"
              :to="{ path: '/notice/detail', query: { id: String(item.noticeId) } }"
            >
              <div class="notice-head">
                <span class="notice-badge" :class="badgeClass(item.noticeType)">
                  {{ badgeLabel(item.noticeType) }}
                </span>
                <!-- 已读/未读行级区分：未读=标题深色+行尾红点（服务端按逐条已读标记回传 unread），本次访问可见、下次进入转已读 -->
                <h3 class="notice-title" :class="{ 'is-unread': item.unread }">{{ item.noticeTitle || '系统消息' }}</h3>
                <i v-if="item.unread" class="notice-dot" />
                <time class="notice-time">{{ formatTime(item.createTime) }}</time>
                <svg class="notice-arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </NuxtLink>
            <CommonPagination :page="page" :total="total" :page-size="PAGE_SIZE" @update:page="loadNotices" />
          </template>
          <CommonEmptyState v-else-if="loading" text="加载中…" />
          <CommonEmptyState v-else-if="errorMsg">{{ errorMsg }}</CommonEmptyState>
          <CommonEmptyState v-else>暂无系统通知</CommonEmptyState>
        </template>

        <!-- 评论：子栏切换（收到的评论默认 / 我发表的），铃铛红标数由「收到的评论」承接 -->
        <template v-else-if="activeTab === 'comment'">
          <div class="comment-box-bar">
            <button class="box-tab" :class="{ active: commentBox === 'received' }" type="button" @click="switchCommentBox('received')">收到的评论</button>
            <button class="box-tab" :class="{ active: commentBox === 'mine' }" type="button" @click="switchCommentBox('mine')">我发表的</button>
          </div>

          <!-- 收到的评论：掘金式接收流（头像+动作短句 / 评论内容 / 文章引用行 / 时间） -->
          <template v-if="commentBox === 'received'">
            <template v-if="receivedComments.length">
              <article v-for="row in receivedComments" :key="row.id" class="notice-item notify-item">
                <NuxtLink class="notify-avatar" :to="{ path: '/user/space', query: { id: String(row.userId) } }">
                  <img v-if="row.avatar" :src="coverUrl(row.avatar)" :alt="row.nickName" loading="lazy" />
                  <span v-else class="avatar-fallback">{{ (row.nickName || '评').slice(0, 1) }}</span>
                </NuxtLink>
                <div class="notify-main">
                  <p class="notify-head">
                    <NuxtLink class="notify-user" :to="{ path: '/user/space', query: { id: String(row.userId) } }">
                      {{ row.nickName || '用户' }}
                    </NuxtLink>
                    <!-- 三种动作文案：回复我的评论 / 回复他人评论 / 直接评论我的文章，文章由引用行承载 -->
                    <template v-if="row.parentId && row.replyUserId === currentUserId">回复了你的评论</template>
                    <template v-else-if="row.parentId">
                      回复了
                      <NuxtLink class="notify-user" :to="{ path: '/user/space', query: { id: String(row.replyUserId) } }">
                        @{{ row.replyNickName || '未知用户' }}
                      </NuxtLink>
                      的评论
                    </template>
                    <template v-else>评论了你的文章</template>
                  </p>
                  <p class="notify-content">{{ row.content }}</p>
                  <NuxtLink class="notify-quote" :to="{ path: '/article/detail', query: { id: String(row.articleId) } }">
                    《{{ row.articleTitle || '文章已删除' }}》
                  </NuxtLink>
                  <time class="notify-time">{{ formatRelativeTime(row.createTime) }}</time>
                </div>
                <NuxtLink
                  v-if="row.articleCover"
                  class="notify-thumb"
                  :to="{ path: '/article/detail', query: { id: String(row.articleId) } }"
                >
                  <img :src="coverUrl(row.articleCover)" :alt="row.articleTitle || ''" loading="lazy" />
                </NuxtLink>
              </article>
              <CommonPagination :page="receivedPage" :total="receivedTotal" :page-size="PAGE_SIZE" @update:page="loadReceivedComments" />
            </template>
            <CommonEmptyState v-else-if="receivedLoading" text="加载中…" />
            <CommonEmptyState v-else-if="receivedError">{{ receivedError }}</CommonEmptyState>
            <CommonEmptyState v-else>还没有收到评论，文章写得越多人气越旺</CommonEmptyState>
          </template>

          <!-- 我发表的评论与回复（原管理流，服务端按当前登录人过滤） -->
          <template v-else>
            <template v-if="myComments.length">
              <article v-for="row in myComments" :key="row.id" class="notice-item">
                <div class="notice-head">
                  <!-- 徽标复用系统通知的配色：蓝=对文章的评论,橙=对他人评论的回复 -->
                  <span class="notice-badge" :class="row.parentId ? 'is-announce' : 'is-info'">
                    {{ row.parentId ? '回复' : '评论' }}
                  </span>
                  <NuxtLink
                    class="comment-article"
                    :class="{ 'is-deleted': !row.articleTitle }"
                    :to="{ path: '/article/detail', query: { id: String(row.articleId) } }"
                    target="_blank"
                  >
                    {{ row.articleTitle || '文章已删除' }}
                  </NuxtLink>
                  <time class="notice-time">{{ formatRelativeTime(row.createTime) }}</time>
                  <button class="comment-del" type="button" :disabled="deletingId === row.id" @click="removeMyComment(row)">
                    {{ deletingId === row.id ? '删除中…' : '删除' }}
                  </button>
                </div>
                <p class="comment-content" :class="{ collapsed: !commentExpandedMap[row.id] }" :data-cid="row.id">
                  <span v-if="row.parentId" class="reply-mark">
                    回复
                    <!-- 被回复人昵称可跳其个人空间（与文章详情评论区一致） -->
                    <NuxtLink v-if="row.replyUserId" class="reply-user" :to="{ path: '/user/space', query: { id: String(row.replyUserId) } }">
                      @{{ row.replyNickName || '未知用户' }}：
                    </NuxtLink>
                    <template v-else>@{{ row.replyNickName || '未知用户' }}：</template>
                  </span>{{ row.content }}
                </p>
                <!-- 超长内容默认单行省略,溢出才出展开按钮 -->
                <button v-if="commentOverflowMap[row.id]" class="notice-toggle" type="button" @click="toggleCommentExpand(row.id)">
                  {{ commentExpandedMap[row.id] ? '收起' : '展开' }}
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{ flip: commentExpandedMap[row.id] }" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </article>
              <CommonPagination :page="commentPage" :total="commentTotal" :page-size="PAGE_SIZE" @update:page="loadMyComments" />
            </template>
            <CommonEmptyState v-else-if="commentLoading" text="加载中…" />
            <CommonEmptyState v-else-if="commentError">{{ commentError }}</CommonEmptyState>
            <CommonEmptyState v-else>暂无评论或回复，去文章页说两句吧</CommonEmptyState>
          </template>
        </template>

        <!-- 赞和收藏：双子栏（收到的赞 / 收到的收藏），掘金式接收流：头像+动作短句 / 文章引用行 / 时间 -->
        <template v-else-if="activeTab === 'like'">
          <div class="comment-box-bar">
            <button class="box-tab" :class="{ active: likeBox === 'like' }" type="button" @click="switchLikeBox('like')">收到的赞</button>
            <button class="box-tab" :class="{ active: likeBox === 'collect' }" type="button" @click="switchLikeBox('collect')">收到的收藏</button>
          </div>

          <!-- 收到的赞 -->
          <template v-if="likeBox === 'like'">
            <template v-if="receivedLikes.length">
              <article v-for="row in receivedLikes" :key="row.id" class="notice-item notify-item">
                <NuxtLink class="notify-avatar" :to="{ path: '/user/space', query: { id: String(row.userId) } }">
                  <img v-if="row.avatar" :src="coverUrl(row.avatar)" :alt="row.nickName" loading="lazy" />
                  <span v-else class="avatar-fallback">{{ (row.nickName || '用').slice(0, 1) }}</span>
                </NuxtLink>
                <div class="notify-main">
                  <p class="notify-head">
                    <NuxtLink class="notify-user" :to="{ path: '/user/space', query: { id: String(row.userId) } }">
                      {{ row.nickName || '用户' }}
                    </NuxtLink>
                    赞了你的文章
                  </p>
                  <NuxtLink class="notify-quote" :to="{ path: '/article/detail', query: { id: String(row.articleId) } }">
                    《{{ row.articleTitle || '文章已删除' }}》
                  </NuxtLink>
                  <time class="notify-time">{{ formatRelativeTime(row.createTime) }}</time>
                </div>
                <NuxtLink
                  v-if="row.articleCover"
                  class="notify-thumb"
                  :to="{ path: '/article/detail', query: { id: String(row.articleId) } }"
                >
                  <img :src="coverUrl(row.articleCover)" :alt="row.articleTitle || ''" loading="lazy" />
                </NuxtLink>
              </article>
              <CommonPagination :page="likePage" :total="likeTotal" :page-size="PAGE_SIZE" @update:page="loadReceivedLikes" />
            </template>
            <CommonEmptyState v-else-if="likeLoading" text="加载中…" />
            <CommonEmptyState v-else-if="likeError">{{ likeError }}</CommonEmptyState>
            <CommonEmptyState v-else>还没有收到点赞，发布优质文章就会有互动了</CommonEmptyState>
          </template>

          <!-- 收到的收藏：他人把我的文章收进 ta 的公开收藏集（私密集不产生通知行） -->
          <template v-else>
            <template v-if="receivedCollects.length">
              <article v-for="row in receivedCollects" :key="row.id" class="notice-item notify-item">
                <NuxtLink class="notify-avatar" :to="{ path: '/user/space', query: { id: String(row.userId) } }">
                  <img v-if="row.avatar" :src="coverUrl(row.avatar)" :alt="row.nickName" loading="lazy" />
                  <span v-else class="avatar-fallback">{{ (row.nickName || '用').slice(0, 1) }}</span>
                </NuxtLink>
                <div class="notify-main">
                  <p class="notify-head">
                    <NuxtLink class="notify-user" :to="{ path: '/user/space', query: { id: String(row.userId) } }">
                      {{ row.nickName || '用户' }}
                    </NuxtLink>
                    将你的文章收进了
                    <NuxtLink
                      v-if="row.collectionId"
                      class="notify-quote-inline"
                      :to="{ path: '/collect/detail', query: { id: String(row.collectionId) } }"
                    >
                      《{{ row.collectionName || '收藏集' }}》
                    </NuxtLink>
                  </p>
                  <NuxtLink class="notify-quote" :to="{ path: '/article/detail', query: { id: String(row.articleId) } }">
                    《{{ row.articleTitle || '文章已删除' }}》
                  </NuxtLink>
                  <time class="notify-time">{{ formatRelativeTime(row.createTime) }}</time>
                </div>
                <NuxtLink
                  v-if="row.articleCover"
                  class="notify-thumb"
                  :to="{ path: '/article/detail', query: { id: String(row.articleId) } }"
                >
                  <img :src="coverUrl(row.articleCover)" :alt="row.articleTitle || ''" loading="lazy" />
                </NuxtLink>
              </article>
              <CommonPagination :page="collectPage" :total="collectTotal" :page-size="PAGE_SIZE" @update:page="loadReceivedCollects" />
            </template>
            <CommonEmptyState v-else-if="collectLoading" text="加载中…" />
            <CommonEmptyState v-else-if="collectError">{{ collectError }}</CommonEmptyState>
            <CommonEmptyState v-else>还没有收到收藏，发布优质内容等着被收进别人的收藏集吧</CommonEmptyState>
          </template>
        </template>

        <!-- 新增粉丝：谁关注了我（掘金式接收流），未回关的条目行尾即「回关」按钮 -->
        <template v-else-if="activeTab === 'follower'">
          <template v-if="receivedFollows.length">
            <article v-for="row in receivedFollows" :key="row.id" class="notice-item notify-item">
              <NuxtLink class="notify-avatar" :to="{ path: '/user/space', query: { id: String(row.userId) } }">
                <img v-if="row.avatar" :src="coverUrl(row.avatar)" :alt="row.nickName" loading="lazy" />
                <span v-else class="avatar-fallback">{{ (row.nickName || '用').slice(0, 1) }}</span>
              </NuxtLink>
              <div class="notify-main">
                <p class="notify-head">
                  <NuxtLink class="notify-user" :to="{ path: '/user/space', query: { id: String(row.userId) } }">
                    {{ row.nickName || '用户' }}
                  </NuxtLink>
                  关注了你
                </p>
                <time class="notify-time">{{ formatRelativeTime(row.followTime) }}</time>
              </div>
              <!-- 回关按钮：mutual=互相关注 none=回关（following 态在本栏行构造上不出现） -->
              <div class="row-follow" @click.stop>
                <FollowButton :target-user-id="row.userId" :state="row.followState" size="small" @change="(payload) => onFollowRowChange(row, payload)" />
              </div>
            </article>
            <CommonPagination :page="followPage" :total="followTotal" :page-size="PAGE_SIZE" @update:page="loadReceivedFollows" />
          </template>
          <CommonEmptyState v-else-if="followLoading" text="加载中…" />
          <CommonEmptyState v-else>还没有粉丝，发布优质内容就会有人关注你</CommonEmptyState>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { formatRelativeTime } from '@nest-acticle/utils'
import type { MyCommentItem, ReceivedCollectItem, ReceivedCommentItem, ReceivedFollowItem, ReceivedLikeItem, ViewerFollowState } from '@nest-acticle/shared'
import type { NoticeItem, NoticeTab } from '~/composables/useNotice'

// 登录守卫走 auth middleware：未登录弹登录框并回首页，数据加载保持在组件内（守卫先行不发必 401 的请求）
definePageMeta({
  middleware: 'auth'
})

// ---------- 分类清单：与头部铃铛下拉同源（useNotice 的 NOTICE_CATS），这里带 icon 渲染左侧竖栏 ----------
const noticeCats = NOTICE_CATS

const route = useRoute()
const config = useRuntimeConfig()

// 头像/封面统一补全服务端前缀（相对路径直出会 404）
const coverUrl = (path?: string | null) => toCoverUrl(config.public.apiBase, path)

// ---------- tab 状态：?tab= 同步（非法值回落系统通知），铃铛下拉可带分类直达 ----------
const normalizeTab = (value: unknown): NoticeTab => {
  const key = String(value || 'system')
  return (noticeCats.find((cat) => cat.key === key)?.key || 'system') as NoticeTab
}

const activeTab = ref<NoticeTab>(normalizeTab(route.query.tab))
const activeCat = computed(() => noticeCats.find((cat) => cat.key === activeTab.value) || noticeCats[noticeCats.length - 1]!)

watch(
  () => route.query.tab,
  (value) => {
    activeTab.value = normalizeTab(value)
  }
)

const switchCat = (key: NoticeTab) => {
  if (key === activeTab.value) {
    return
  }
  return navigateTo({ path: '/notification', query: key === 'system' ? {} : { tab: key } })
}

// ---------- 系统通知列表：分页拉取，服务端按 status='0' 过滤已关闭公告；403 等业务错误降级为空态提示 ----------
const { fetchNotices, fetchMyComments } = useNotice()
// markNoticesRead 不在本页使用：系统通知严格逐条已读，仅详情页标单条（notice/detail.vue）；本页「全部已读」走 markAllNoticesRead
const { unread, markRead, markAllNoticesRead, refreshBadge, fetchReceivedComments } = useNotify()
const { user } = useUser()

// 当前登录人 id：收到的评论行判定「回复了我的评论」用
const currentUserId = computed(() => user.value?.userId ?? null)

// 菜单未读数：与铃铛同源（赞和收藏栏合并展示赞+收藏未读，新增粉丝/系统通知栏各自单独计）
const catUnread = (key: NoticeTab) => {
  if (key === 'comment') {
    return unread.value.comment
  }
  if (key === 'like') {
    return unread.value.like + unread.value.collect
  }
  if (key === 'follower') {
    return unread.value.follow
  }
  if (key === 'system') {
    return unread.value.system
  }
  return 0
}

// 分类栏进入即清该栏红标（水位推至当前）：评论/赞和收藏/新增粉丝逐栏清；
// 系统通知是逐条已读模型——进栏不清，加载本页后按行标已读（见 loadSystemPage），角标随刷新回落
// 赞和收藏栏同时推平 like 与 collect 两个水位（红标为两者合计，进入即全清）
const onTabEnter = (tab: NoticeTab) => {
  if (tab === 'comment') {
    markRead('comment').catch(() => {})
  }
  if (tab === 'like') {
    markRead('like').catch(() => {})
    markRead('collect').catch(() => {})
  }
  if (tab === 'follower') {
    markRead('follow').catch(() => {})
  }
}

const PAGE_SIZE = 10

// ---------- 五个列表共用 usePagedList：页码/总数/加载态/错误态/请求序号都在里面，页面只管「何时加载哪一页」----------
// 翻页走分页器的 update:page → load(页码)，切分类/子栏走 reload()（回第一页）；不再 watch 页码自动加载，
// 所以「重置页码 + 显式加载」每次切换只发一发请求。解构出的名字与模板一一对应

// 系统通知列表：服务端按 status='0' 过滤已关闭公告 + scope=mine 逐条回传 unread；403 等业务错误降级为空态提示。
// 严格逐条已读：进列表页不标已读，只有点进详情页才标那一条（见 notice/detail.vue）
const noticeList = usePagedList<NoticeItem>((params) => fetchNotices({ ...params, status: '0' }), { pageSize: PAGE_SIZE, errorMsg: '通知加载失败' })
const { page, total, list: notices, loading, error: errorMsg } = noticeList
const loadNotices = noticeList.load

// 一键全部已读：清掉所有可见通知（全员公告 + 发给我的定向通知）的未读，成功后刷新角标并重拉列表
const markingAll = ref(false)
const markAllRead = async () => {
  if (markingAll.value) {
    return
  }
  markingAll.value = true
  try {
    await markAllNoticesRead()
    showToast('已全部标为已读', 'success')
    refreshBadge()
    noticeList.reload()
  } catch (error: any) {
    showToast(error?.message || '操作失败，请稍后再试', 'error')
  } finally {
    markingAll.value = false
  }
}

// ---------- 收到的评论（评论栏默认子页）：他人评论我的文章/回复我的评论，掘金式接收流 ----------
const commentBox = ref<'received' | 'mine'>('received')

const receivedList = usePagedList<ReceivedCommentItem>((params) => fetchReceivedComments(params), {
  pageSize: PAGE_SIZE,
  errorMsg: '评论加载失败'
})
const { page: receivedPage, total: receivedTotal, list: receivedComments, loading: receivedLoading, error: receivedError } = receivedList
const loadReceivedComments = receivedList.load

// 子栏切换：重置到第一页并按需加载（切走的子页在切回时再拉，保证数据新鲜）
const switchCommentBox = (box: 'received' | 'mine') => {
  if (commentBox.value === box) {
    return
  }
  commentBox.value = box
  if (box === 'received') {
    receivedList.reload()
  } else {
    loadMyComments(1)
  }
}

// ---------- 我的评论列表（评论 tab）：分页拉取当前登录人的评论与回复，删除后重拉保证计数准确 ----------
const { deleteComment } = useComment()

const myCommentList = usePagedList<MyCommentItem>((params) => fetchMyComments(params), {
  pageSize: PAGE_SIZE,
  errorMsg: '评论加载失败'
})
const { page: commentPage, total: commentTotal, list: myComments, loading: commentLoading, error: commentError } = myCommentList
const deletingId = ref<number | null>(null)

// 传页码即翻到该页；不传为重拉当前页，传 1 为回第一页（切子栏/切分类）
// 加载后要等渲染完成再量文本溢出（决定是否出「展开」按钮）
const loadMyComments = async (target?: number) => {
  await myCommentList.load(target)
  await nextTick()
  measureCommentOverflow()
}

// ---------- 内容展开/收起：默认单行省略,渲染后量 scrollWidth 决定是否出「展开」按钮 ----------
const commentExpandedMap = ref<Record<number, boolean>>({})
const commentOverflowMap = ref<Record<number, boolean>>({})

const measureCommentOverflow = () => {
  const map: Record<number, boolean> = {}
  document.querySelectorAll<HTMLElement>('.comment-content[data-cid]').forEach((el) => {
    const cid = Number(el.dataset.cid)
    if (Number.isFinite(cid)) {
      map[cid] = el.scrollWidth > el.clientWidth + 1
    }
  })
  commentOverflowMap.value = map
}

const toggleCommentExpand = (id: number) => {
  commentExpandedMap.value = { ...commentExpandedMap.value, [id]: !commentExpandedMap.value[id] }
}

const removeMyComment = async (row: MyCommentItem) => {
  if (deletingId.value) {
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
  deletingId.value = row.id
  try {
    await deleteComment(row.id)
    showToast('评论已删除', 'success')
    // 服务端会级联删除其全部后代,行数与总数以重拉结果为准
    loadMyComments()
  } catch (error: any) {
    showToast(error?.message || '删除失败，请稍后再试', 'error')
  } finally {
    deletingId.value = null
  }
}

// ---------- 收到的赞 / 收到的收藏（赞和收藏 tab 双子栏）：服务端按登录态过滤，最新在前 ----------
const likeBox = ref<'like' | 'collect'>('like')

const { fetchReceivedLikes } = useLike()
const { fetchReceivedCollects } = useCollect()

const likeList = usePagedList<ReceivedLikeItem>((params) => fetchReceivedLikes(params), {
  pageSize: PAGE_SIZE,
  errorMsg: '点赞列表加载失败'
})
const { page: likePage, total: likeTotal, list: receivedLikes, loading: likeLoading, error: likeError } = likeList
const loadReceivedLikes = likeList.load

const collectList = usePagedList<ReceivedCollectItem>((params) => fetchReceivedCollects(params), {
  pageSize: PAGE_SIZE,
  errorMsg: '收藏列表加载失败'
})
const { page: collectPage, total: collectTotal, list: receivedCollects, loading: collectLoading, error: collectError } = collectList
const loadReceivedCollects = collectList.load

// 子栏切换：重置到第一页并重拉（切走的子页在切回时再拉，保证数据新鲜）
const switchLikeBox = (box: 'like' | 'collect') => {
  if (likeBox.value === box) {
    return
  }
  likeBox.value = box
  if (box === 'like') {
    likeList.reload()
  } else {
    collectList.reload()
  }
}

// ---------- 收到的关注（新增粉丝 tab）：谁关注了我，服务端按登录态过滤，最新在前 ----------
const { fetchReceivedFollows } = useFollow()

const followNoticeList = usePagedList<ReceivedFollowItem>((params) => fetchReceivedFollows(params), {
  pageSize: PAGE_SIZE,
  errorMsg: '关注列表加载失败'
})
const { page: followPage, total: followTotal, list: receivedFollows, loading: followLoading, error: followError } = followNoticeList
const loadReceivedFollows = followNoticeList.load

// 回关按钮动作后回写行状态（不直改 props 由页面兜着，本页直接改行对象引用即可）
const onFollowRowChange = (row: ReceivedFollowItem, payload: { state: ViewerFollowState; fanNum: number }) => {
  row.followState = payload.state
}

// 加载当前分类栏（按子栏）：首屏（登录守卫之后）与切分类共用，每次只发当前栏的那一发
const reloadActiveTab = () => {
  if (activeTab.value === 'system') {
    noticeList.reload()
  } else if (activeTab.value === 'comment') {
    // 两子栏都有独立分页，只重拉当前子栏；切走的子栏在切回时经 switchCommentBox 重拉
    if (commentBox.value === 'received') {
      receivedList.reload()
    } else {
      loadMyComments(1)
    }
  } else if (activeTab.value === 'like') {
    // 双子栏独立分页，同上
    if (likeBox.value === 'like') {
      likeList.reload()
    } else {
      collectList.reload()
    }
  } else if (activeTab.value === 'follower') {
    followNoticeList.reload()
  }
}

// 切分类栏：进入即清红标，并回到第一页重拉
watch(activeTab, (tab) => {
  onTabEnter(tab)
  reloadActiveTab()
})

const formatTime = (value?: string | null) => {
  if (!value) {
    return ''
  }
  const formatted = dayjs(value).format('YYYY-MM-DD HH:mm')
  return formatted === 'Invalid Date' ? '' : formatted
}

// 系统通知徽标：3 举报反馈（红）/ 4 反馈回复（绿，用户反馈的处理结果通知）/ 2 公告（橙）/ 其余=通知（蓝）
const badgeClass = (noticeType: string) => (noticeType === '3' ? 'is-report' : noticeType === '4' ? 'is-feedback' : noticeType === '2' ? 'is-announce' : 'is-info')
const badgeLabel = (noticeType: string) => (noticeType === '3' ? '举报反馈' : noticeType === '4' ? '反馈回复' : noticeType === '2' ? '公告' : '通知')

// ---------- 首屏加载：登录守卫已由 auth middleware 先行（未登录不会到达这里），避免发一轮必然 401 的请求 ----------
onMounted(() => {
  // 直达分类栏（?tab=comment/like）时同样逐栏清红标
  onTabEnter(activeTab.value)
  reloadActiveTab()
})
</script>

<style lang="less" scoped>
// 宽度交给 default 布局的 app-main（1100px 容器，与头部 logo/退出同缘对齐），页面只做垂直微调
// 高度撑满视口剩余空间：100vh - 头部61 - app-main 上下padding 64 - 页面自身 padding 12
.notification-page {
  min-height: calc(100vh - 137px);
  display: flex;
  flex-direction: column;
  padding: 4px 0 8px;
}

.notice-panel {
  flex: 1;
  // 左菜单与右列表两张独立卡片、中间 16px 间距——对齐站点「多卡片+间距」的模块语言；stretch 等高拉满
  display: flex;
  align-items: stretch;
  gap: 16px;
}

// 左侧分类竖栏（与设置页 200px 菜单同规格），高度贴合菜单内容
.notice-menu {
  flex-shrink: 0;
  width: 200px;
  padding: 12px 8px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);

  .menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 14px;
    border: 0;
    border-radius: var(--radius-sm);
    background-color: transparent;
    font-size: 14px;
    color: var(--color-text-2);
    text-align: left;
    cursor: pointer;
    transition:
      color 0.2s ease,
      background-color 0.2s ease;

    .menu-icon {
      display: flex;
      align-items: center;
      color: var(--color-text-3);
      transition: color 0.2s ease;
    }

    &:hover {
      color: var(--color-text-1);
      background-color: var(--color-bg);
    }

    &.active {
      color: var(--color-primary);
      background-color: var(--color-primary-light);
      font-weight: 500;

      .menu-icon {
        color: var(--color-primary);
      }
    }

    // 未读数：右侧小圆角红标（与铃铛/头部面板同色系）
    .menu-count {
      margin-left: auto;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 9px;
      background-color: #f04142;
      font-size: 11px;
      line-height: 18px;
      font-style: normal;
      font-weight: 500;
      color: #fff;
      text-align: center;
      box-sizing: border-box;
    }
  }
}

.notice-main {
  flex: 1;
  min-width: 0;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  overflow: hidden;

  // 系统通知首行与左菜单首项文字顶边对齐（左：菜单 12 + 条目 10，右：此处 14 + 条目 8）
  &--system {
    padding-top: 14px;
  }
}

// 评论栏子切换（收到的评论/我发表的）：页头胶囊组，同左菜单 active 视觉
.comment-box-bar {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--color-border-light);

  .box-tab {
    padding: 4px 12px;
    border: 0;
    border-radius: var(--radius-sm);
    background-color: transparent;
    font-size: 13px;
    color: var(--color-text-2);
    cursor: pointer;
    transition:
      color 0.2s ease,
      background-color 0.2s ease;

    &:hover {
      color: var(--color-text-1);
      background-color: var(--color-bg);
    }

    &.active {
      color: var(--color-primary);
      background-color: var(--color-primary-light);
      font-weight: 500;
    }
  }
}

.notice-item {
  padding: 12px 20px;

  & + .notice-item {
    border-top: 1px solid var(--color-border-light);
  }

  // 系统通知只有单行标题，收紧上下留白让同屏容纳更多条目
  &--compact {
    padding: 8px 20px;
  }

  // 可点击行（NuxtLink）：悬浮/键盘聚焦给出反馈，跳转独立通知详情页
  &--clickable {
    display: block;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover,
    &:focus-visible {
      background-color: var(--color-bg);
      outline: none;
    }

    &:hover .notice-arrow,
    &:focus-visible .notice-arrow {
      color: var(--color-primary);
    }
  }
}

// 收到的评论/赞：掘金式接收流——头像+动作短句 / 评论内容 / 文章引用行 / 时间
.notify-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;

  .notify-avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .avatar-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      background-color: var(--color-primary-light);
      font-size: 14px;
      color: var(--color-primary);
    }
  }

  .notify-main {
    flex: 1;
    min-width: 0;
  }

  .notify-head {
    margin: 0;
    font-size: 15px;
    line-height: 22px;
    color: var(--color-text-1);

    // 昵称走主题蓝与动作文案/正文做颜色区分（链接语义），悬浮加下划线
    .notify-user {
      margin-right: 4px;
      color: var(--color-primary);
      transition: color 0.2s ease;

      // 目标用户已删除时无链接可跳，降级灰字
      &.is-missing {
        color: var(--color-text-3);
      }

      &:hover {
        text-decoration: underline;
        text-underline-offset: 2px;
      }
    }
  }

  .notify-content {
    margin: 4px 0 0;
    font-size: 14px;
    line-height: 22px;
    color: var(--color-text-1);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  // 文章引用行：左竖线灰字（同掘金被回复对象引用），超长单行省略
  .notify-quote {
    display: block;
    margin-top: 8px;
    padding-left: 8px;
    border-left: 2px solid var(--color-border);
    font-size: 13px;
    line-height: 20px;
    color: var(--color-text-3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.2s ease;

    &:hover {
      color: var(--color-primary);
    }
  }

  // 动作短句内嵌的收藏集入口（「收进了《xx》」），主题色弱化字重
  .notify-quote-inline {
    color: var(--color-text-2);
    font-weight: 500;
    white-space: nowrap;
    transition: color 0.2s ease;

    &:hover {
      color: var(--color-primary);
    }
  }

  .notify-time {
    display: block;
    margin-top: 8px;
    font-size: 12px;
    color: var(--color-text-3);
  }

  // 新增粉丝行尾的回关按钮（不冒泡到行点击）
  .row-follow {
    flex-shrink: 0;
    align-self: center;
  }

  // 右侧文章封面缩略图：64px 圆角小图，垂直居中，链接到文章详情
  .notify-thumb {
    flex-shrink: 0;
    align-self: center;
    width: 64px;
    height: 64px;
    border-radius: var(--radius-sm);
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }
}

// 系统通知栏头：右侧「全部已读」文字钮（严格逐条模型的补充动作）
.system-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 10px 20px;
  border-bottom: 1px solid var(--color-border-light);

  .read-all-btn {
    padding: 0;
    border: 0;
    background-color: transparent;
    font-size: 13px;
    color: var(--color-primary);
    cursor: pointer;
    transition: color 0.2s ease;

    &:hover:not(:disabled) {
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    &:disabled {
      color: var(--color-text-3);
      cursor: not-allowed;
    }
  }
}

.notice-head {
  display: flex;
  align-items: center;
  gap: 8px;

  .notice-title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 15px;
    // 已读行标题变淡 + 不加粗；未读行深色加粗（行级已读区分，红点见 .notice-dot）
    font-weight: 400;
    color: var(--color-text-2);

    &.is-unread {
      font-weight: 600;
      color: var(--color-text-1);
    }
  }

  .notice-dot {
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #f04142;
  }

  .notice-time {
    flex-shrink: 0;
    font-size: 12px;
    color: var(--color-text-3);
  }

  // 行尾箭头：提示整行可点击查看正文
  .notice-arrow {
    flex-shrink: 0;
    color: var(--color-text-3);
    transition: color 0.2s ease;
  }
}

// 徽标（列表行）：通知=品牌蓝浅底；公告=橙色浅底；举报成立=红色浅底；举报驳回=灰底
.notice-badge {
  flex-shrink: 0;
  padding: 1px 8px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  line-height: 18px;

  &.is-info {
    background-color: var(--color-primary-light);
    color: var(--color-primary);
  }

  &.is-announce {
    background-color: rgba(230, 132, 41, 0.12);
    color: #e68429;
  }

  // 举报反馈（noticeType=3 定向私密通知）：红色浅底，同举报成立徽标色系
  &.is-report {
    background-color: rgba(240, 65, 66, 0.1);
    color: #f04142;
  }

  // 反馈回复（noticeType=4 定向私密通知，用户反馈的处理结果）：绿色浅底，同成功态徽标色系
  &.is-feedback {
    background-color: rgba(82, 196, 26, 0.12);
    color: #52c41a;
  }
}

// 评论栏：文章标题链接（复用通知标题的排版），文章已删时降级灰字且不可点
.comment-article {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-1);
  transition: color 0.2s ease;

  // 链接悬浮统一：主题色 + 下划线（与文章详情评论区一致）
  &:hover {
    color: var(--color-primary);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  &.is-deleted {
    color: var(--color-text-3);
    font-weight: 400;
    cursor: default;

    &:hover {
      color: var(--color-text-3);
      text-decoration: none;
    }
  }
}

.comment-del {
  flex-shrink: 0;
  padding: 0;
  border: 0;
  background-color: transparent;
  font-size: 12px;
  color: var(--color-text-3);
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover:not(:disabled) {
    color: #d1242f;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

// 评论内容：普通文本即可（评论本身不支持 Markdown），回复行带内联标记
.comment-content {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 22px;
  color: var(--color-text-1);
  white-space: pre-wrap;
  overflow-wrap: anywhere;

  // 收起态：单行省略（掘金消息中心口径），展开后还原多行
  &.collapsed {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .reply-mark {
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

.notice-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 0;
  border: 0;
  background-color: transparent;
  font-size: 13px;
  color: var(--color-primary);
  cursor: pointer;

  svg {
    transition: transform 0.2s ease;

    &.flip {
      transform: rotate(180deg);
    }
  }
}

// 分页器与最后一条目之间的间距（条目自带 border-top 充当分隔线）
.notice-main :deep(.pager) {
  padding: 14px 0 16px;
}

// 窄屏：左菜单变横向滚动条
@media (max-width: 768px) {
  .notice-panel {
    flex-direction: column;
  }

  .notice-menu {
    width: 100%;
    display: flex;
    gap: 4px;
    overflow-x: auto;
    padding: 8px;

    .menu-item {
      width: auto;
      flex-shrink: 0;
      white-space: nowrap;
    }
  }
}
</style>

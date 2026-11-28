<!-- 全站右下角悬浮反馈入口（app.vue ClientOnly 挂载，编辑器等独立布局外也可见）：
     常驻基准位 right:28px bottom:28px z-index:95——评论区「查看更多评论」FAB 胶囊（页面级偶发，z-90）
     让位到本按钮上方（CommentSection .comment-more-fab bottom 84px），两者同现时垂直堆叠不硬叠；
     未登录点击弹登录框并记住意图，登录成功自动打开反馈弹窗（关掉登录框未登录则放弃意图，同关注 feed 口径）；
     提交反馈是所有登录用户的基本能力，入口不做权限隐藏 -->
<template>
  <button class="feedback-fab" type="button" title="意见反馈" aria-label="意见反馈" @click="openFeedback">
    <AppIcon name="feedback" :size="20" />
  </button>

  <!-- 弹窗 v-if 挂载即已登录，满足 useDict 登录守卫 -->
  <FeedbackDialog v-if="dialogOpen" @close="dialogOpen = false" @done="dialogOpen = false" />
</template>

<script setup lang="ts">
const { isLoggedIn, ensureUserRestored } = useUser()
const { isOpen: authModalOpen, openLogin } = useAuthModal()

const dialogOpen = ref(false)
// 登录意图：未登录点击先弹登录框，登录成功接住这次意图自动打开反馈弹窗
const pendingFeedback = ref(false)

const openFeedback = async () => {
  // token 可能在、用户信息未拉：先静默恢复登录态（同首页关注 tab 口径）
  await ensureUserRestored()
  if (!isLoggedIn.value) {
    pendingFeedback.value = true
    openLogin()
    return
  }
  dialogOpen.value = true
}

// 登录态切换：登录成功接住之前被拦下的反馈意图；退出登录作废意图
watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    if (pendingFeedback.value) {
      pendingFeedback.value = false
      dialogOpen.value = true
    }
    return
  }
  pendingFeedback.value = false
})

// 关掉登录弹窗但没登录：放弃反馈意图，避免之后在别处登录被连带弹窗
watch(authModalOpen, (open) => {
  if (!open && !isLoggedIn.value) {
    pendingFeedback.value = false
  }
})
</script>

<style lang="less" scoped>
// 常驻基准位：右下角 28/28（与评论区 FAB 胶囊的让位坐标配套，见 CommentSection .comment-more-fab）
.feedback-fab {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 95;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border-light);
  border-radius: 50%;
  background-color: var(--color-surface);
  color: var(--color-text-2);
  box-shadow: var(--shadow-2);
  cursor: pointer;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: var(--color-primary);
    border-color: var(--color-primary);
    transform: translateY(-1px);
  }
}
</style>

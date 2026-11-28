<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { onContentUpdated, useRoute } from 'vitepress'
import { nextTick, onMounted, onUnmounted, watch } from 'vue'
import LangSwitch from './LangSwitch.vue'
import { applyTitles } from './i18n'

const { Layout } = DefaultTheme
const route = useRoute()

let observer: MutationObserver | null = null
let scheduled: ReturnType<typeof setTimeout> | null = null
let applying = false

function scheduleApply() {
  if (scheduled) return
  scheduled = setTimeout(() => {
    scheduled = null
    if (applying) return
    applying = true
    applyTitles()
    applying = false
  }, 0)
}

// 版本详情用 details 折叠：锚点目标在关闭的分组里时浏览器滚不过去（display:none），
// 命中锚点先展开所在分组再定位；用即时滚动——smooth 会被 VitePress 路由自身的滚动
// 处理打断（实测 smooth 延迟数秒才落地），瞬时跳转无此竞态
function expandReleaseGroupForHash() {
  const hash = window.location.hash.slice(1)
  if (!hash) return
  const target = document.getElementById(decodeURIComponent(hash))
  const group = target?.closest('details')
  if (group && !group.open) {
    group.open = true
    target?.scrollIntoView({ block: 'start' })
  }
}

onContentUpdated(() => {
  applyTitles()
  nextTick(applyTitles)
  expandReleaseGroupForHash()
})

watch(
  () => route.path,
  () => nextTick(applyTitles),
  { flush: 'post' }
)

onMounted(() => {
  applyTitles()
  // VitePress 的 route 对象没有 hash 字段、同页锚点跳转也不触发 onContentUpdated，
  // 折叠分组的锚点展开只能靠原生 hashchange 监听（侧栏时间线点击 / 外链直达都走这里）
  window.addEventListener('hashchange', expandReleaseGroupForHash)
  // 移动端菜单等界面在首屏之后才挂载，监听一次以保证标题同步
  observer = new MutationObserver(scheduleApply)
  observer.observe(document.body, { childList: true, subtree: true, characterData: true })
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
  window.removeEventListener('hashchange', expandReleaseGroupForHash)
  if (scheduled) clearTimeout(scheduled)
})
</script>

<template>
  <Layout>
    <template #nav-bar-content-after>
      <LangSwitch />
    </template>
    <template #nav-screen-content-after>
      <LangSwitch class="lang-switch-screen" />
    </template>
  </Layout>
</template>

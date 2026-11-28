<!-- 业务图标统一出口：内联 path 按 name 取用，size 控制尺寸，filled 用于点赞/收藏的实心态 -->
<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(d, index) in paths" :key="index" :d="d" />
  </svg>
</template>

<script setup lang="ts">
// 形状统一归一为 path（circle/polygon/polyline/line 均转为等价 path 指令），组件只渲染 path
const ICONS = {
  eye: [
    'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z',
    'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'
  ],
  'thumbs-up': [
    'M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3'
  ],
  comment: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  star: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  share: ['M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8', 'M16 6l-4-4-4 4', 'M12 2v13'],
  report: [
    'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z',
    'M12 9v4',
    'M12 17h.01'
  ],
  // 反馈入口：留言气泡（comment 气泡内加两条文字线，与评论图标区分）
  feedback: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', 'M8 9.5h8', 'M8 13h5'],
  'arrow-up': ['M12 19V5', 'M5 12l7-7 7 7']
} as const

type IconName = keyof typeof ICONS

const props = withDefaults(
  defineProps<{
    name: IconName
    size?: number
    /** 实心态：点赞已点/收藏已收藏 */
    filled?: boolean
  }>(),
  {
    size: 16,
    filled: false
  }
)

const paths = computed(() => ICONS[props.name])
</script>
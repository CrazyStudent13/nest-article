<template>
  <div class="release-table" role="table" aria-label="版本一览">
    <div class="rt-head" role="row">
      <span class="rt-arrow-col"></span>
      <span class="rt-version">版本</span>
      <span class="rt-date">发布日期</span>
      <span class="rt-subject">版本主题</span>
      <span class="rt-tags">Git 标签</span>
    </div>

    <template v-for="r in releases" :key="r.version">
      <!-- 中版本行：有 patch 才可展开（Element 展开行） -->
      <div
        class="rt-row"
        :class="{ 'is-expandable': r.patches.length > 0, 'is-open': isOpen(r.version) }"
        :role="r.patches.length > 0 ? 'button' : undefined"
        :aria-expanded="r.patches.length > 0 ? isOpen(r.version) : undefined"
        :tabindex="r.patches.length > 0 ? 0 : undefined"
        @click="toggle(r)"
        @keydown.enter="toggle(r)"
      >
        <span class="rt-arrow-col">
          <i v-if="r.patches.length > 0" class="rt-chevron" :class="{ open: isOpen(r.version) }"></i>
        </span>
        <span class="rt-version"><a :href="'#' + r.anchor" @click.stop>{{ r.version }}</a></span>
        <span class="rt-date">{{ r.date }}</span>
        <span class="rt-subject">{{ r.subject }}</span>
        <span class="rt-tags"><template v-for="(t, i) in seriesTags(r)" :key="t"><i v-if="i > 0" class="rt-tilde">~</i><code>{{ t }}</code></template></span>
      </div>

      <!-- 展开面板：小版本行 -->
      <div v-if="r.patches.length > 0 && isOpen(r.version)" class="rt-panel">
        <div v-for="p in r.patches" :key="p.version" class="rt-row rt-patch">
          <span class="rt-arrow-col"></span>
          <span class="rt-version"><a :href="'#' + p.anchor" @click.stop>{{ p.version }}</a></span>
          <span class="rt-date">{{ p.date }}</span>
          <span class="rt-subject">{{ p.subject }}</span>
          <span class="rt-tags"><code>{{ p.version }}</code></span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

// 版本一览数据源（发版时在数组顶部维护：minor 加条目、patch 塞进所属 minor 的 patches，
// 操作清单见 /development-tips/release-notes）。anchor 为「版本详情」折叠组的锚点（. → -），
// 点版本号直达详情并自动展开分组（Layout.vue hashchange 监听）
interface Patch {
  version: string
  date: string
  subject: string
  anchor: string
}
interface Release {
  version: string
  date: string
  subject: string
  anchor: string
  patches: Patch[]
}

const releases: Release[] = [
  {
    version: 'v1.6.0',
    date: '2026-11-28',
    subject: '管理端首页改工作区：统一待办收件箱 + 逐条已读/未读',
    anchor: 'v1-6-0',
    patches: [{ version: 'v1.6.1', date: '2026-11-29', subject: '管理列表未读接入', anchor: 'v1-6-1' }]
  },
  { version: 'v1.5.0', date: '2026-11-28', subject: '用户反馈模块 v1：提交/截图附件/详情抽屉/定向通知', anchor: 'v1-5-0', patches: [] },
  {
    version: 'v1.4.0',
    date: '2026-11-27',
    subject: '用户举报模块全链路、停用原因与登录拦截',
    anchor: 'v1-4-0',
    patches: [
      { version: 'v1.4.1', date: '2026-11-28', subject: '关注 feed 与字典模块化', anchor: 'v1-4-1' },
      { version: 'v1.4.2', date: '2026-11-28', subject: '安全修复包', anchor: 'v1-4-2' },
      { version: 'v1.4.3', date: '2026-11-28', subject: '发版 skill', anchor: 'v1-4-3' }
    ]
  },
  { version: 'v1.3.0', date: '2026-11-25', subject: '关注模块全链路、文档站进容器栈、水位毫秒化', anchor: 'v1-3-0', patches: [] },
  {
    version: 'v1.2.0',
    date: '2026-11-17',
    subject: '文件管理功能、上传与安全加固、CI 质检门禁',
    anchor: 'v1-2-0',
    patches: [{ version: 'v1.2.1', date: '2026-11-23', subject: '收藏集标签字典化', anchor: 'v1-2-1' }]
  },
  { version: 'v1.1.0', date: '2026-11-15', subject: '注册体系、安全加固与前端工程化', anchor: 'v1-1-0', patches: [] },
  {
    version: 'v1.0.0',
    date: '2026-10-25',
    subject: '首个部署版本：字典本地缓存与版本校验',
    anchor: 'v1-0-0',
    patches: [{ version: 'v1.0.1', date: '2026-10-25', subject: '文档站接入前端', anchor: 'v1-0-1' }]
  }
]

const expanded = reactive(new Set<string>())

const isOpen = (version: string) => expanded.has(version)

const toggle = (r: Release) => {
  if (r.patches.length === 0) return
  if (expanded.has(r.version)) {
    expanded.delete(r.version)
  } else {
    expanded.add(r.version)
  }
}

// Git 标签格：系列内首个 tag 起、patch 末个 tag 止（vX.Y.0 ~ vX.Y.n）；无 patch 单个
const seriesTags = (r: Release) => [r.version, ...r.patches.map((p) => p.version)]
</script>

<style lang="scss" scoped>
/* Element 表格风格：表头浅底、行 hover、展开面板缩进浅底；颜色全走 VP 变量随明暗主题 */
.release-table {
  margin: 16px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow-x: auto;
}

.rt-head,
.rt-row {
  display: grid;
  grid-template-columns: 32px 76px 88px minmax(0, 1fr) 148px;
  align-items: center;
  gap: 8px;
  padding: 10px 16px 10px 6px;
  /* 极窄屏兜底：再窄就横向滚动 */
  min-width: 520px;
}

.rt-head {
  background-color: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.rt-row {
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 14px;
  color: var(--vp-c-text-1);
  transition: background-color 0.2s;
}

/* 中版本行整体是展开触发器 */
.rt-row.is-expandable {
  cursor: pointer;
  user-select: none;

  &:hover {
    background-color: var(--vp-c-bg-soft);
  }
}

.rt-row.is-open {
  border-bottom-color: transparent;
}

.rt-arrow-col {
  display: flex;
  justify-content: center;
}

/* 行首角标：与「版本详情」折叠组同款（右→下） */
.rt-chevron {
  width: 6px;
  height: 6px;
  border-right: 1.5px solid var(--vp-c-text-3);
  border-bottom: 1.5px solid var(--vp-c-text-3);
  transform: rotate(-45deg);
  transition: transform 0.2s;
}

.rt-chevron.open {
  transform: rotate(45deg);
}

.rt-version {
  font-weight: 600;
  white-space: nowrap;

  a {
    color: var(--vp-c-brand-1);
    text-decoration: none;
  }
}

.rt-date {
  white-space: nowrap;
  color: var(--vp-c-text-2);
}

.rt-subject {
  line-height: 1.6;
}

.rt-tags {
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;

  code {
    font-size: 12px;
    padding: 1px 6px;
    border-radius: 4px;
    background-color: var(--vp-c-bg-soft);
    border: 1px solid var(--vp-c-divider);
    color: var(--vp-c-text-2);
  }
}

.rt-tilde {
  font-style: normal;
  color: var(--vp-c-text-3);
}

/* 展开面板：浅底缩进，小版本行复用同款网格对齐列 */
.rt-panel {
  background-color: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  padding: 4px 0;
}

.rt-row.rt-patch {
  border-bottom: none;
  font-size: 13px;
  color: var(--vp-c-text-2);
  padding-top: 6px;
  padding-bottom: 6px;
}
</style>

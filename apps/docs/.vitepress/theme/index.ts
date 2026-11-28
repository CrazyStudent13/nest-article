import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import ReleaseOverview from './components/ReleaseOverview.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    // markdown 里直接用的全局组件
    app.component('ReleaseOverview', ReleaseOverview)
  },
} satisfies Theme

# Client 端概览

Nuxt 4 + Vue 3 内容展示前台（文章/专栏/收藏集，SSR 渲染），monorepo 三应用之一。命名空间历史原因目录名为 `client`，技术栈为 Nuxt 4。

## 技术栈

- Nuxt 4 + Vue 3 + Less（设计变量 `assets/style/tokens.less`）
- Markdown 渲染与编辑器为共享包：`@nest-acticle/markdown`（渲染，MdViewer 只是薄壳）与 `@nest-acticle/editor`（写作页编辑器），三个应用同源同效果
- pnpm + Volta（Node 22.22.2 / pnpm 10.33.0，`engine-strict` 安装期拦截）

## 本地开发

```bash
# 仓库根目录
pnpm install
pnpm --filter client dev        # Nuxt dev server
pnpm --filter client typecheck  # vue-tsc / nuxt typecheck
pnpm --filter client build      # 生产构建
```

容器栈内即博客本体 `http://localhost:8888/`，SSR 由 blog-nginx 反代至 client 容器（3000）。

## 目录速览

- `pages/`：文章/专栏/收藏集/空间/通知/写作页；依赖登录的页面 `routeRules` 设 `ssr:false` + auth middleware
- `components/`：CommentSection（线程分页/请求序号）、AppHeader（通知面板/红标）、Collect（收藏集 UI）等
- `composables/`：见 [开发约定](./conventions)
- `server/routes/`：Nitro 服务端路由（robots.txt、代理转发）

## 本目录文档

- [开发约定](./conventions)
- [关注模块约定](./follow)
- [反馈模块约定](./feedback)

入口文档：`apps/client/README.md`。

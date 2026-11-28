---
name: release
description: nest-acticle 项目发版流程——版本号决策与全仓对齐、CHANGELOG 未发布段转正、docs 发布记录与侧栏同步、dev 合 master（--no-ff）+ annotated tag + 三线推送。Use whenever the user says 发版 / 发布 / 出个版本 / 推版本号 / 打 tag / 合并到 master 发布 / release，哪怕只是随口一句「发个版本吧」——本仓发版是多步约定流程，必须走本 skill 而不是临时现想。
---

# nest-acticle 发版流程

本仓 v1.2.x→v1.4.x 已形成稳定发版惯例。按以下顺序执行；每一步都有既定形态，不要即兴发挥。

## 0. 前置核查（任一不满足先停下问用户）

1. 工作树干净（`git status --short` 为空）。
2. 当前在 dev 分支且与 origin/dev 同步（发版内容都在 dev 上）。
3. CHANGELOG.md 存在非空「未发布（dev 分支，随下版本发布）」段——它就是本次发布的内容清单。为空分两种情况：用户并无明确发版意图 → 告知无事可发；用户明确要求发版且改动已知（如「把 skill 提交也发版」）→ 先把改动补进未发布段（对应小节）再继续流程（v1.4.3 实例）。
4. 门禁绿：`pnpm --filter server test`（在 apps/server 目录下跑 jest）+ 根 `pnpm lint` + `pnpm typecheck` + `pnpm --filter admin build:prod`。任一红先修再发。

## 1. 版本号决策

按语义与用户拍板，基准（2026-11-28 用户确认）：

| 变更性质 | 版本 | 例 |
|---|---|---|
| 纯修复/安全/打磨，无新功能 | **patch** | v1.4.2（安全修复包） |
| 新功能/新模块 | **minor** | v1.4.0（举报模块）、v1.3.0（关注模块） |
| 破坏性（目前未发生） | major，先问用户 | — |

拿不准时列出一句话理由问用户，不要自行定级。

## 2. 版本号全仓对齐（恰好 8 处）

`package.json`（根）、`apps/admin`、`apps/client`、`apps/server`、`packages/shared`、`packages/utils`、`packages/markdown`、`packages/editor`——全部改为新版本号。

豁免（不动）：`packages/eslint-config`（独立 0.1.0）、`apps/docs`（无 version 字段）。`pnpm-lock.yaml` 不需要动（workspace 依赖走 `workspace:*`，历史发版提交均未含 lockfile）。

## 3. CHANGELOG 未发布段转正

- 段标题改 `## vX.Y.Z（YYYY-MM-DD）`，补一句版本主题概述。
- 「升级提示」引块：含数据库/种子变更时必须写存量库增量 SQL 并注明「勿重跑全量 init.sql」（init.sql 会 drop 重建，参考 v1.4.2 的 role 2 授权 SQL 写法）；全新导入无需处理也要写明。
- 提交说明风格（对齐 v1.4.x 系列全文惯例）：`release: vX.Y.Z（日期）——版本号全仓对齐（8 包 A→B）+ CHANGELOG 收录 <主题列举> + docs 发布记录页与侧栏时间线同步`。

## 4. docs 发布记录同步

- 版本号性质决定动作：中版本（minor）「三处各加一条」，小版本（patch）「并入所属中版本」——一览表不单独成行、详情不单独成节、侧栏不单独成条。详细动作清单见 `apps/docs/development-tips/release-notes.md`「新增一条发布记录」第 2/3 条，要点：
  - minor：`apps/docs/releases.md` 版本一览表顶部加一行（版本/日期/主题一句话/`tag`），「版本详情」顶部插入完整段——`<details class="release-group" open><summary>` 夹空行包住 `### vX.Y.Z`（发布日期、tag、按 安全/新增/修复/种子/工程化 分节），并摘掉上一组 `<details>` 的 `open`（默认展开最新版）；`config.mts` 侧栏顶部加 `{ text: 'vX.Y.Z · 日期', link: '/releases#vX-Y-Z' }`。
  - patch：版本一览表改所属 minor 行（主题格末尾追加「；vX.Y.Z 一句话」，Git 标签格扩成 `` `vX.Y.0`~`vX.Y.n` ``，日期保持 minor 的）；「版本详情」minor 节包进 `### vX.Y.x（日期起 → 止）` 分组并降为 `####`（小节顺延 `#####`），patch 以 `#### vX.Y.Z` 子节追加到同一 `<details>` 分组末尾（系列内按发布先后）；侧栏 patch 子条目挂进 minor 条目的 `items`（minor 条目设 `collapsed: true`）。
- `pnpm --filter docs build` 必须 exit 0（防死链接；localhost 裸链接会被 VitePress 死链检查拦截，写进反引号）。注意死链检查不覆盖 `#hash` 锚点——侧栏锚点需对着标题人工核一遍（`.` → `-`）。

## 5. 合并、打 tag、推送

```bash
git checkout master
git merge dev --no-ff -m "merge: dev → master 发布 vX.Y.Z（<定位一句话>）——<内容列举>，详见 CHANGELOG.md"
git tag -a vX.Y.Z -m "vX.Y.Z：<一至两句版本概述>"
git push origin master dev vX.Y.Z   # GitHub 偶发超时，失败重试（最多 5 次，间隔 8s）
git checkout dev
```

为什么 --no-ff + tag 打合并提交：master 上的合并提交是版本锚点（历史 v1.2.x→v1.4.x 均如此），回溯版本时 merge commit 与 tag 一一对应。

## 6. 收尾

- 本地栈库如有种子增量（如 sys_role_menu 授权），幂等补齐本地 MySQL（127.0.0.1 root/root123/nest-db，容器 blog-mysql；会话变量比较先 `SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci` 防 ERROR 1267）。
- 报告：release/merge/tag 三 hash、推送结果、升级提示要点、遗留（如 CI 镜像构建走 release 分支由用户驱动）。
- 全程只在本地与用户已授权的远端仓库操作；不碰 docker.yml 的 release 分支构建流程（那是用户部署侧）。

# 发布记录维护

发版时同步更新 [发布记录](/releases) 页的操作清单，也是 `.agents/skills/release` 发版 skill 第 4 步引用的详细动作源。

## 新增一条发布记录

1. 确认 `master` 已合并完成，打标签并推送：

   ```bash
   git tag -a v1.1.0 -m "v1.1.0: <一句话概括>"
   git push origin v1.1.0
   ```

2. **中版本（minor）**——三处各追加一条：
   - 在 `.vitepress/theme/components/ReleaseOverview.vue` 的 `releases` 数组顶部加一条 `{ version, date, subject, anchor, patches: [] }`（anchor 为详情锚点，`.` → `-`）。
   - 在 `.vitepress/config.mts` 的 `/releases` 侧边栏 `items` 顶部新增一条时间线记录：

     ```ts
     { text: 'v1.1.0 · YYYY-MM-DD', link: '/releases#v1-1-0' },
     ```

     锚点由版本号生成，`.` 会变成 `-`，例如 `v1.1.0` 对应 `#v1-1-0`。
   - 复制下面的模板，放到「版本详情」的最上方并填写内容，没有的小节可以删除；新组 `<details>` 自带 `open`（默认展开最新版），记得同时摘掉上一组 `<details>` 上的 `open`。
3. **小版本（patch）**——并入所属中版本，不单独成行/成节/成条：
   - 「版本一览」：在所属中版本条目的 `patches` 数组追加 `{ version: 'vX.Y.Z', date: 'YYYY-MM-DD', subject: '一句话', anchor: 'vX-Y-Z' }`——表格自动出展开行、Git 标签格自动扩成 `vX.Y.0~vX.Y.n` 区间（小版本行不再并入中版本主题格）。
   - 「版本详情」：所属中版本节包进 `### vX.Y.x（日期起 → 止）` 分组、自身降为 `####`（其小节顺延降一级为 `#####`）；patch 内容以 `#### vX.Y.Z` 子节追加到**同一 `<details>` 分组**末尾（系列内按发布先后），小节用 `#####`。锚点规则不变（`.` → `-`），标题降级不影响锚点。
   - 侧边栏：所属中版本条目设 `collapsed: true` 并挂 `items`，patch 以 `{ text: 'vX.Y.Z · 日期', link: '/releases#vX-Y-Z' }` 追加为子条目。
4. 中版本模板（patch 子节复用同一模板、标题整体降一级；`<details>` 包裹与 `<summary>` 两侧的空行是 Markdown 内嵌 HTML 的解析前提，不能省）：

```md
<details class="release-group" open>
<summary>

### v1.1.0

</summary>

**发布日期**：YYYY-MM-DD　**Git 标签**：`v1.1.0`

#### 新增

-

#### 变更

-

#### 修复

-

#### 升级注意

-

</details>
```

# 反馈模块约定

用户反馈模块的前端契约与现行交互（2026-11 新增）。单表单据 `post_feedback`：登录用户提交类型化反馈（功能建议/问题反馈/其他），管理端回复/关闭两结论流转；提交人身份即登录身份（无 contact 字段），多条不同反馈合法（不做 pending 去重）。反馈类型走**数据字典** `post_feedback_type`（运营可扩值，服务端按字典缓存校验）。

## 接口契约（/api/post/feedback）

| 路由 | 鉴权 | 说明 |
|---|---|---|
| `POST /` | JWT | 提交反馈；`{ type, content, attachments? }`，返回 `{ submitted: true }`；24h 窗口 10 条频控 |
| `GET /list` | `post:feedback:list` | 管理端列表（联提交人/处理人昵称 + attachUserInfo 回填提交人头像；attachments 出库反序列化） |
| `PUT /handle/:id` | `post:feedback:handle` | 处理：`{ status: '1'\|'2', replyContent? }`；回复必填 replyContent |
| `DELETE /batch/:ids` | `post:feedback:remove` | 管理端批量物理删除 |

截图附件（截图上传通道 `POST /common/upload`，登录即可、单文件 ≤10MB、`path=feedback` 归档子目录）：

- **至多 3 张**，服务端 DTO 校验：数组 ≤3 项、每项 `/profile/` 前缀的相对 URL（只收本站上传通道产物，防外链注入）与长度 ≤255
- **库内形态**：`post_feedback.attachments` varchar(1000) JSON 数组字符串（无附件 null），出库反序列化为数组，脏数据兜底空数组——不建关联表，附件只随单据读写
- **client 交互**：弹窗附件区缩略图（76px）+ 删除 + 虚线「+」选图（`accept="image/*" multiple`），textarea 支持直接**粘贴截图**（paste 事件截获剪贴板图片文件走同一上传通道）；上传中禁止提交
- **admin 展示**：列表内容列 40px 缩略图、处理弹窗 80px 缩略图，均 el-image `preview-teleported` 点击大图预览

- **提交只要求登录，不挂权限串**：反馈是所有登录用户的基本能力（同点赞/关注/举报登录路径口径），挂权限串等于向普通用户关闭入口；防刷靠用户维度 24h 窗口频控（`idx_user_id` + `create_time` 统计，超限报错「反馈提交过于频繁，请 24 小时后再试」）
- **不做 pending 去重**：多条不同反馈合法，无唯一索引去重、无 INSERT IGNORE；与举报（同目标同时至多一条待处理）是刻意不同的口径——反馈是意见箱不是工单去重场景
- **无 contact 字段**：登录身份已知（`user_id` 落库），v2 前不考虑匿名反馈
- **类型合法性按字典缓存校验**：dictValue 必须存在于 `post_feedback_type` 的启用项；字典标记**不公开**（`is_public` 默认 N）——游客不可提交反馈，管理端与用户弹窗均走登录态读取，无需进游客白名单
- **处理状态机**：`0 待处理 → 1 已回复 / 2 已关闭`（单列三态）；回复（status=1）时 replyContent 必填（1-500 字），关闭（status=2）时可选简短说明
- **终态不可重复处理**：先查行再按 `status='0'` 条件更新做乐观锁（并发处理只有一方生效，同举报处理口径）；已处理记录在管理端列表不显示「处理」按钮
- **删除口径**：管理端批量删除为**物理删除**（同 post_report 口径），仅清理记录本身，已发出的处理通知不受影响；`del_flag` 列仅为建表口径完整性保留，业务不软删
- **v1 不做用户端历史列表**：「我的反馈」入口与历史记录页缓做（v2 路线），用户侧闭环由通知中心承接

## 处理通知：sys_notice 定向通知（不单开 tab）

处理结果是一条**私密通知**，复用系统通知通道（同举报反馈 type=3 先例），**不新增通知中心 tab、不新增 NotifyCategory 水位分类**：

- `sys_notice.user_id` 定向接收人；`sys_notice_type` 字典新增 `'4' 反馈回复`
- **处理反馈时同事务写入通知**：回复通知正文带管理员回复全文（Markdown），关闭通知为简短文案（带关闭说明时附上）；反馈内容超 40 字在通知里截断留摘要（全文在反馈管理后台）
- **逐条已读模型照旧**：post_notify_read 以 `category='n:<noticeId>'` 记已读，进列表不标、点进详情页才标那一条；未读数走 NOT EXISTS 统计——互动四分类的水位模型不涉及本模块
- 前台「系统通知」栏承接：`scope=mine` 只回全员公告 + 发给本人的定向通知，行首绿色「反馈回复」徽标区分（红色=举报反馈/橙色=公告/蓝色=通知）；点击进通知详情页（Markdown 正文）
- `datetime(3)` 毫秒粒度（`reply_time`/`create_time`）：对齐 post_report 的通知水位比较列与频控统计列口径

## 反馈入口（Feedback/FeedbackWidget.vue）

- **全站右下角悬浮入口**：`app.vue` ClientOnly 挂载（编辑器等独立布局外也可见），44px 圆钮常驻基准位 `right: 28px / bottom: 28px`（z-index 95）
- **与既有悬浮元素堆叠**：评论区「查看更多评论」FAB 胶囊（`CommentSection .comment-more-fab`，页面级偶发）让位到 `bottom: 84px`（基准位 + 圆钮 44px + 间距 12px），两者同现时垂直堆叠不硬叠
- **未登录点击弹登录框**：登录意图 pattern（同关注 feed）——记住本次意图，登录成功自动打开反馈弹窗；关掉登录框未登录则放弃意图，避免之后在别处登录被连带弹窗
- **反馈弹窗（Feedback/FeedbackDialog.vue）**：类型下拉走字典 `useDict('post_feedback_type')`（弹窗 `v-if` 挂载即登录态，满足字典登录守卫）；内容 textarea maxlength 500 与服务端 DTO 同限；截图附件区（选图/粘贴/删除/上传中态）走 `useUpload` 的 `/common/upload` 通道；提交成功 toast「反馈已提交」并关弹窗；频控等业务报错在弹窗内提示（保留填写现场）

## 管理端（交互管理/反馈管理）

- 页面 `views/post/feedback/index.vue`（菜单 215，`post/feedback/index`）：筛选类型/状态/提交人昵称/时间范围；提交人列渲染头像+昵称（服务端 `attachUserInfo` 回填 `row.userInfo`，头像缺省降级纯昵称）
- 处理弹窗：提交人信息展示 + 反馈内容只读回显 + 结论 radio（回复/关闭）+ 回复内容 textarea（回复必填，关闭选填 placeholder 提示）
- 权限串三方一致（全小写）：init.sql 菜单/perms = controller `@RequirePermission` = 页面 `v-hasPermi`（`post:feedback:list/handle/remove`）
- 菜单/字典种子：菜单 215/216/217（parent 6 交互管理，普通角色 role 2 授权）；字典类型 22 `post_feedback_type` / 23 `post_feedback_status`（dict_data 69-74）；`sys_notice_type` 字典 '4' 反馈回复（dict_code 75）

## v2 路线（缓做）

- **邮件增强**：处理结果邮件触达（SMTP 配置已有邮箱验证码通道可复用）
- **我的反馈**：用户端历史反馈列表与处理进度展示（通知中心承接是 v1 的最小闭环；附件图当前仅管理端可见）

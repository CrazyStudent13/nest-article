# Changelog

更细粒度的过程记录（审查 → 修复 → 验收全程）见 [CODE-REVIEW-2026-11-20.md](./CODE-REVIEW-2026-11-20.md)。

## v1.6.0（2026-11-28）

管理端首页改「工作区」（统一待办收件箱，新功能 minor 版）：政府 OA 式全宽双 tab 待办队列 + 逐条已读/未读，待办聚合接口按权限逐源过滤，取代原「首页」欢迎页。

> 升级提示：**含数据库变更（30 号表）**——全新导入跑 init.sql 无需处理；存量库勿重跑全量 init.sql（drop 重建），按下述增量 SQL 建表即可：

```sql
-- 30 号表：工作台待办逐条已读库
create table if not exists post_workbench_read (
  id int not null auto_increment comment '自增 id',
  user_id int not null comment '标记人用户ID',
  source varchar(20) not null comment '待办源（report 举报 / feedback 反馈）',
  source_id int not null comment '源记录 id（post_report.id / post_feedback.id）',
  read_time datetime(3) default current_timestamp(3) comment '标记时间（毫秒粒度，同 post_feedback 口径）',
  primary key (id),
  unique key uk_user_source_record (user_id, source, source_id)
) engine = innodb comment = '工作台待办逐条已读库';
```

### 新增

- **管理端首页改工作台（统一待办收件箱，政府 OA 式全宽列表）**：新模块 `post/workbench` 两聚合接口均仅登录、服务层 `hasPermission`（通配感知）逐源过滤——`GET /api/post/workbench/todos`（首页唯一消费方）：待办/已办双 tab（徽标计数随响应捎回，已办=全部已处理记录的团队视角，成立/驳回、已回复/已关闭均计）+ 来源筛选（与权限取交集）+ 时间范围（复用 PagingDto.params，同管理列表 addDateRange 口径，工具条整行底线与表格区隔开、分页 0 条常显保卡高稳定）；有权源 UNION ALL 归一化（source/摘要/提交人/提交时间/办结时间；举报摘要快照优先、无快照用举报理由内容兜底）按提交时间倒序 DB 侧分页（5 条/页，排序方向切换已删——分页兜底查找，查详情去对应管理页）已办 tab 时间列切显示办结时间（举报 handle_time/反馈 reply_time）；**已读/未读效果**：未读行红点+摘要加粗、已读无（红点/加粗），已读口径=工作区行点击（跳管理页查看）而非「处理过」，两 tab 统一，`POST /api/post/workbench/read` 行点击时标记（唯一索引 INSERT IGNORE 幂等，重复静默），列表行 isRead 按当前用户批查回填；行只读不承载处理——待办行带 `status=0` 深链跳对应管理页预置筛选，已办行不带筛选（已办混两种终态），处理交互长在各自管理页（举报弹窗/反馈抽屉）；**不建通用 todo 内容表**（避免与各源状态机双向同步漂移），待处理/已处理口径归各业务服务自管（countPending/countDone）；右侧独立问候小卡（问候语+当日日期，与待办卡同高），列表表格区定高≈5 行（每页 5 条恰好填满，不足留白、卡高稳定）；接口文档入口侧栏已有，不重复放置；`GET /api/post/workbench/summary` 前端改版后不再消费，保留给二期侧栏菜单待办角标复用；文章审核待办源上线时源定义加一条 + 业务服务补计数即可；openapi 契约重生成收录
- **未读/已读视觉原语抽全局样式**：`.unread-dot`（6px 角标红点，绝对定位宿主左上角，使用契约=宿主容器自带 position:relative）与 `.is-unread`（摘要加粗）入全局 index.scss，颜色走 Element Plus 变量随主题，供工作台与后续管理列表复用

## v1.5.0（2026-11-28）

用户反馈模块 v1 全链路（新功能 minor 版）：登录用户右下角悬浮入口提交类型化反馈（支持截图附件），管理端查看/处理合一详情抽屉，处理结果走 sys_notice 定向通知闭环。

> 升级提示：**含数据库与种子变更**——全新导入跑 init.sql 无需处理；存量库勿重跑全量 init.sql（drop 重建），按下方增量 SQL 执行（执行后删除 Redis `sys_dict:all`——DictService 全量字典缓存不感知 SQL 直改）。**发版前部署需重build server/client/admin 镜像**（本次含新模块与新页面；server 镜像构建已修复缺 @nest-acticle/utils 的问题）。

**存量库增量 SQL**（按 init.sql 空闲段取 id；若占用请顺延）：

```sql
-- 1) 建表（29 号表）
create table if not exists post_feedback (
  id int not null auto_increment comment '反馈 id',
  user_id int not null comment '提交人用户ID（登录身份，无 contact 字段）',
  type char(1) not null comment '反馈类型（1 功能建议 2 问题反馈 3 其他，字典 post_feedback_type）',
  content varchar(500) not null comment '反馈内容（1-500 字）',
  attachments varchar(1000) default null comment '截图附件（JSON 数组字符串，/profile/ 相对 URL，至多 3 张，无附件 null）',
  status char(1) default '0' comment '处理状态（0 待处理 1 已回复 2 已关闭）',
  reply_content varchar(500) default null comment '管理员回复内容（回复必填，关闭可空说明）',
  admin_id int default null comment '处理人用户ID（未处理 null）',
  del_flag char(1) default '0' comment '删除标志（0代表存在 1代表删除，业务不软删）',
  reply_time datetime(3) default null comment '处理时间（毫秒粒度）',
  create_time datetime(3) default current_timestamp(3) comment '提交时间（毫秒粒度，24h 频控统计列）',
  primary key (id),
  key idx_user_id (user_id),
  key idx_status (status)
) engine = innodb comment = '用户反馈库';

-- 2) 字典类型（22/23）与字典数据（69-75）
insert into sys_dict_type (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag) values
  (22, '反馈类型', 'post_feedback_type', '0', 'admin', now(), '', null, '用户反馈类型列表（登录态专用不公开——游客不可提交反馈，管理端/用户弹窗均走登录态读取）', '0'),
  (23, '反馈处理状态', 'post_feedback_status', '0', 'admin', now(), '', null, '用户反馈处理状态列表', '0');

insert into sys_dict_data (dict_code, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, create_by, create_time, update_by, update_time, remark, del_flag) values
  (69, 1, '功能建议', '1', 'post_feedback_type', '', 'primary', 'N', '0', 'admin', now(), '', null, '反馈类型-功能建议', '0'),
  (70, 2, '问题反馈', '2', 'post_feedback_type', '', 'danger', 'N', '0', 'admin', now(), '', null, '反馈类型-问题反馈', '0'),
  (71, 3, '其他', '3', 'post_feedback_type', '', 'info', 'N', '0', 'admin', now(), '', null, '反馈类型-其他', '0'),
  (72, 1, '待处理', '0', 'post_feedback_status', '', 'warning', 'Y', '0', 'admin', now(), '', null, '反馈状态-待处理', '0'),
  (73, 2, '已回复', '1', 'post_feedback_status', '', 'success', 'N', '0', 'admin', now(), '', null, '反馈状态-已回复（sys_notice 定向通知 noticeType=4）', '0'),
  (74, 3, '已关闭', '2', 'post_feedback_status', '', 'info', 'N', '0', 'admin', now(), '', null, '反馈状态-已关闭（终态不可重复处理）', '0'),
  (75, 4, '反馈回复', '4', 'sys_notice_type', '', 'warning', 'N', '0', 'admin', now(), '', null, '反馈回复（sys_notice.user_id 定向私密通知，业务侧程序写入——用户反馈回复/关闭通知）', '0');

-- 3) 菜单（parent 6 交互管理）与 role 2 授权
insert into sys_menu (menu_id, menu_name, parent_id, order_num, path, component, query, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark, del_flag) values
  (215, '反馈管理', '6', '6', 'feedback', 'post/feedback/index', '', '1', '0', 'C', '0', '0', 'post:feedback:list', 'message', 'admin', now(), '', null, '反馈管理菜单', '0'),
  (216, '反馈处理', '215', '1', '', '', '', '1', '0', 'F', '0', '0', 'post:feedback:handle', 'form', 'admin', now(), '', null, '反馈处理权限', '0'),
  (217, '反馈删除', '215', '2', '', '', '', '1', '0', 'F', '0', '0', 'post:feedback:remove', 'form', 'admin', now(), '', null, '反馈删除权限', '0');

insert into sys_role_menu (role_id, menu_id) values ('2', '215'), ('2', '216'), ('2', '217');

-- 4) 字典管理树分组（可选，管理端字典树展示用）
update sys_dict_type set dict_module = '社区互动' where dict_type in ('post_feedback_type', 'post_feedback_status');
```

### 新增

- **用户反馈模块 v1 全链路**：登录用户右下角悬浮入口提交类型化反馈（功能建议/问题反馈/其他，走字典 `post_feedback_type`，textarea 500 字上限），24h 窗口 10 条用户维度频控防刷，不做 pending 去重、无 contact 字段（登录身份即提交人）；**截图附件至多 3 张**（复用 /common/upload 上传通道 `path=feedback` 归档，支持内容框直接粘贴截图，服务端校验张数与 /profile/ 前缀防外链，库内 JSON 单列）；管理端「交互管理/反馈管理」（useCrud + **查看/处理合一详情抽屉**——内容列可点开看全文与附件大图，待处理记录抽屉内直接回复/关闭，行内只留「图 xN」角标）两结论流转——回复必填回复内容、关闭可选简短说明，终态按 `status='0'` 条件更新乐观锁不可重复处理；处理结果经 sys_notice 定向通知（`sys_notice_type` 新增 `'4' 反馈回复`，绿色徽标）发给提交人，前台「系统通知」栏承接，逐条已读模型照旧，不新增通知 tab/水位分类；用户弹窗未登录点击弹登录框且登录成功自动打开（登录意图 pattern），评论区「查看更多评论」FAB 让位堆叠（bottom 28→84px）；shared 新增 Feedback 枚举与线格式类型 + openapi 契约重生成
- **种子**：init.sql 新增 29 号表 `post_feedback`（datetime(3) 毫秒粒度、idx_user_id/idx_status、attachments JSON 单列）、字典类型 22 `post_feedback_type` / 23 `post_feedback_status`（dict_data 69-74，登录态专用不公开——游客不可提交无需进游客白名单）、`sys_notice_type` 字典 '4'（dict_code 75）、菜单 215/216/217（parent 6 交互管理，显式列名 INSERT）与 role 2 授权；**存量库勿重跑全量 init.sql**，增量 SQL 见下方升级提示
- **docs**：新增反馈模块约定页（接口契约/通知送达口径/widget 落位与堆叠/v2 路线：邮件增强、我的反馈历史缓做），侧栏与 client 概览/开发约定挂入口

### 修复

- **粘贴文字被误拦成截图**：聊天窗口/截图工具复制文字时剪贴板常附位图（文字渲染图），旧 paste 处理检测到图片即强制上传并吃掉文字——改为剪贴板有文字时优先放行原生粘贴、忽略图，纯图才上传（用户实测踩坑）
- **中文附件地址被误拒**：上传落盘白名单允许中文（中文名截图/中文昵称作者），反馈附件 URL 白名单只收 ASCII 字符集——补中文段与落盘字符集逐字对齐，外链/注入拦截闸不松

### 工程化

- **server Dockerfile 补 `@nest-acticle/utils`**：server 依赖 utils 后镜像构建仍只拷 shared——`pnpm -r build` 报 TS2307（部署阻塞），builder/runner 两阶段补齐；本地重建三镜像实测通过

## v1.4.3（2026-11-28）

发版流程沉淀为项目 skill 的工程化小版本，无业务代码变更。

### 工程化

- **发版流程沉淀为 release skill**：`.agents/skills/release/` 随仓库提交（跨机器 clone 即得）——版本号决策基准（修复=patch/新功能=minor）、8 包对齐与 eslint-config/docs 豁免、CHANGELOG 转正与存量 SQL 提示写法、docs 发布记录双处同步、--no-ff 合并 + tag 打合并提交 + 推送重试、本地种子幂等补齐。此后说「发版」即按此约定执行

## v1.4.2（2026-11-28）

2026-11-28 总览复审（覆盖 11-25~28 的关注/举报/字典公开/文章类型批次）修复包，以安全与正确性修复为主，无新功能。

> 升级提示：**含安全修复（通知定向可见性越权读），建议存量环境尽快升级**。含种子变更——role 2（普通角色）补举报管理菜单授权，存量库增量 SQL 见下方「种子」节（勿重跑全量 init.sql）；全新导入无需处理。

### 安全

- **通知定向可见性服务端闸门**：`/system/notice/list` 此前仅 scope=mine 或 noticeId 直取时过滤定向通知，member 等仅持 `system:notice:list` 的角色不带 scope 可读到全部用户的定向通知（举报反馈/文章标题/停用告知）；现 controller 按 `hasPermission(system:notice:query)`（`*:*:*` 通配感知）判定管理侧，非管理侧一律强制「全员公告 + 发给我」，前台通知中心与详情页行为不变

### 修复

- **管理端编辑器发布按钮状态值错位**：误传待发布（'1'）当已发布（'2'）——编辑已发布文章点「发布」会打成待发布、游客列表消失却提示成功；存草稿会把已发布/已下架文章打回草稿。现按 PublishStatusEnum 对齐，存草稿仅新建或草稿/待发布态落草稿、其余保状态只更内容；审核状态 radio 与枚举错位且会误提交，改 dict-tag 只读展示
- **关注目标不过滤软删用户**：已注销用户凭旧 id 仍可被关注；关注/粉丝/新增粉丝/管理端四列表排序补 id 兜底（datetime(3) 同毫秒翻页漏/重）
- **举报自动下架补软删过滤**：已软删文章达阈值不再触发下架与误通知，与人工下架口径对齐
- **文章作者自恢复竞态**：无发布权限的自管理分支改条件更新（publish_status=读取值），并发自动下架/管理员流转时不再无条件覆写绕过举报拦截
- **游客字典查询剥离 fresh 参数**：未登录传 fresh=true 不再绕过 Redis 缓存直打数据库
- **停用用户会话兜底**：停用动作先改写会话快照 status 为停用态再删键（两步互为兜底），AuthStrategy 按快照拒绝——Redis 瞬时故障踢键失败时会话不再存活到 24h TTL
- **useDict 失败后可重试**：拉取失败清缓存键（原先占位空数组占住 cache，登录后 watch(enabled) 也无法恢复文章类型下拉）

### 种子

- role 2（普通角色）补举报管理菜单 212/213/214 授权。**存量库增量**（勿重跑全量 init.sql）：
  ```sql
  INSERT INTO sys_role_menu (role_id, menu_id) VALUES (2, 212), (2, 213), (2, 214);
  ```

### 工程化

- **openapi 契约收口**：补齐 fdf6f6f 以来的系统性滞后（MarkReadDto follow 枚举、/post/article/follow/list 与 /post/article/my/list、字典 isPublic/dictModule 等）；`gen:api` 前置新鲜度检查（openApi.json dump 早于 dist 构建即拒绝，根治"重生成跑在陈旧 dump 上"）
- **E2E 冒烟固化入仓**：`scripts/e2e-smoke.mjs` 零依赖贯通注册→登录→getInfo→游客列表→清理（注册验证码从栈内 Redis 取明文；含 collation 对齐与 cmd.exe 引号坑注释）
- **校验口径收口**：EMAIL_RE 与密码复杂度/强度纯函数迁入 `@nest-acticle/utils`，server 装饰器壳与 client 表单同源消费，消灭三端靠注释同步的双份实现

## v1.4.1（2026-11-28）

一次以打磨为主的小版本：关注 feed、文章预览共享化、Markdown 拖入导入、文章类型自选与展示、字典公开与模块化、管理端字典页重构、分页统一沉底，另修复编辑器发布丢标题与发布后 404。

> 升级提示：本版本含数据库增量——`sys_dict_type` 增 `is_public`（Y 公开游客可读 / N 不公开）与 `dict_module`（仅管理端树分组，不参与接口读取）两列；新增字典类型 `sys_dict_public`（21 字典公开状态）与字典数据 67/68（公开/不公开）；并将 `post_article_source` / `sys_user_sex` / `sys_normal_disable` 标记为公开字典。种子 SQL 见 `apps/server/db/init.sql`，全新导入无需处理。存量环境执行后需清理 Redis `sys_dict:all` 缓存并 touch 字典行推进版本号；`dict_module` 回填语句在 `init.sql` 字典区末尾（按 系统管理/内容管理/社区互动 分组，不执行则管理端归入「未分类」）。
>
> ```sql
> alter table sys_dict_type
>   add column is_public char(1) default 'N' comment '是否公开（Y 公开游客可读 N 不公开）' after status,
>   add column dict_module varchar(50) default '' comment '所属模块（仅管理端分类展示）' after is_public;
>
> insert into sys_dict_type
>   (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
> values
>   (21, '字典公开状态', 'sys_dict_public', '0', 'admin', sysdate(), '', null, '字典公开状态列表（文案/颜色可在管理端字典维护）', '0');
>
> insert into sys_dict_data
>   (dict_code, dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, create_by, create_time, update_by, update_time, remark, del_flag)
> values
>   (67, 1, '公开', 'Y', 'sys_dict_public', '', 'success', 'Y', '0', 'admin', sysdate(), '', null, '字典公开状态-公开', '0'),
>   (68, 2, '不公开', 'N', 'sys_dict_public', '', 'info', 'N', '0', 'admin', sysdate(), '', null, '字典公开状态-不公开', '0');
>
> update sys_dict_type
> set
>   is_public = 'Y'
> where
>   dict_type in ('post_article_source', 'sys_user_sex', 'sys_normal_disable');
> ```

### 新增

- **关注 feed**：首页「关注」tab 接入我关注作者的已发布文章（publishTime DESC + id 倒序兜底，规避前端 orderByColumn 不生效）；未登录点击弹登录框、登录成功自动切入并加载；关注流缓存随登录态切换失效（退出/401 清空并回最新，换账号不残留）；服务端 `buildListQuery` 新增 followedBy 视角（innerJoin post_follow，唯一键不重复）与作者信息批查，补 3 条单测
- **文章预览共享化**：`@nest-acticle/editor` 新增 `ArticlePreview`（内置作者卡/目录），client 写作预览与文章详情页改用共享组件，admin 列表行/修改抽屉/编辑器顶栏三处接入预览
- **Markdown 拖入导入**：共享 `MarkdownEditor` 识别 .md/.markdown 拖入，剥离 YAML front matter 后按光标插入正文（前后补空行，单文件 1MB 上限），抛出 `markdown-import` 供宿主回填空标题（已有标题不覆盖）；`@nest-acticle/markdown` 新增 `parseMarkdownFrontMatter` / `stripMarkdownFrontMatter`（兼容 BOM/CRLF，纯 --- 分割线不误吞），预览渲染与目录提取统一忽略 front matter
- **文章类型自选与展示**：`ArticleSourceEnum` 对齐字典 `post_article_source`（0 原创 / 1 转载 / 2 翻译 / 3 整理，服务端实体注释同步）；client 写作页与 admin 编辑器顶栏新增文章类型下拉（编辑按原值回填，随保存/发布提交），客户端信息流卡片标题前与详情页元信息行首展示类型标
- **字典公开属性**：`sys_dict_type` 增 `is_public`，按类型查询接口改可选登录（`@NotRequireAuth`）——登录用户不限字典，游客仅可读公开字典、非公开返回 403（内部调用如举报理由不受影响）；公开类型白名单单独走 Redis 缓存并随字典缓存失效
- **字典所属模块**：`sys_dict_type` 增 `dict_module`（仅管理端树分组展示，不参与任何接口读取；DTO 可选限长 50，导出列同步），现有字典按 系统管理/内容管理/社区互动 回填；新增 `sys_dict_public` 字典（公开/不公开，色调走 listClass），「是否公开」由 `sys_yes_no` 改用字典渲染
- **创作者中心顶栏**：抽取 `CommonHeaderUser`（通知铃铛+未读红标与悬停四分类、头像昵称+悬停邮箱浮层、退出）供主站 `AppHeader` 与 creator 布局共用，主站删除重复模板/脚本/样式约 300 行，未登录两处均不渲染

### 重构

- **admin 字典管理页**：左侧树改为「全部字典项 → 所属模块 → 字典类型」三层（模块显示字典数量、当前节点高亮、名称筛选只作用于树），顶部新增公开范围筛选（全部/仅公开/仅不公开）与右侧表格联动；「全部字典项」与字典内容双表分页（类型表本地切片、内容表服务端分页，切类型/切筛选自动回第 1 页）；类型表新增模块列、公开列改 `dict-tag`、列宽紧凑化；详情标题改为「X字典详情」并与公开标签同行，所属模块与备注收进两行 tooltip
- **分页统一沉底**：`Pagination` 改为父容器纵向 flex + `margin-top:auto` 贴卡片右下角，移除绝对定位/固定高度/白底；`.main-card`、`.fill-card` 内容区与 el-row 包裹层补 flex 布局，各列表页分页位置统一

### 修复

- admin 文章编辑器发布丢标题与发布后 404：保存改为以编辑器当前 `title`/`content` 为准（拖入 .md 程序赋值不触发 el-input 的 `@input`，`articleData.title` 停留旧值）；发布仅在保存成功后关闭编辑器并跳转 `/content/article`（列表是后端菜单动态路由，原硬编码 `/post/article` 未注册）
- admin 编辑器文章类型下拉显示「无数据」：改由页面 `useDict('post_article_source')` 获取（此前从编辑器 composable 解构得到 undefined）
- client 顶栏 SSR 报错（首页 500）：`CommonHeaderUser` 内 `watch(isLoggedIn)` 先于 `useUser` 解构声明执行导致 TDZ
- `DictTag` 异步字典加载后标签类型切换残留旧标签：加 `disable-transitions`
- admin 字典页：修复重置表单 ref 传值、新增/删除按钮禁用态、添加分类图标移到刷新左侧、编辑后刷新同步选中节点、已删除节点回退到「全部字典项」
- 版本号全仓对齐（8 包 1.4.0→1.4.1）

## v1.4.0（2026-11-27）

用户举报模块全链路（文章/用户举报提交、去重与频控、管理端处理、自动下架、反馈通知）及 P1 加固（目标有效性校验、被举报内容快照、下架幂等、停用原因与登录拦截）。

> 升级提示：本版本含数据库增量——新增 `post_report` 表（28 号表，含 `target_snapshot`）、`sys_user` 增 `stop_reason` / `stop_time` 两列、字典类型 18~20 与字典数据 54~63、`sys_menu` 212~214 举报管理菜单种子（种子 SQL 详见 `apps/server/db/init.sql`，全新导入无需手工处理）。存量环境执行后需清理 Redis `sys_dict:all` 缓存并 touch 字典行推进版本号，前端才会拉取新字典。
>
> ```sql
> -- 停用原因/时间：停用用户无法登录、收不到站内信，登录拦截提示据此展示（重新启用时清空）
> alter table sys_user
>   add column stop_reason varchar(255) default null comment '停用原因（登录拦截展示）' after remark,
>   add column stop_time datetime(3) default null comment '停用时间（登录拦截展示）' after stop_reason;
>
> -- 新增举报表（待处理唯一索引去重，含举报时快照）
> create table
>   post_report (
>     id int not null auto_increment comment '举报 id',
>     target_type varchar(8) not null comment '举报目标类型（post 文章 / user 用户）',
>     target_id int not null comment '举报目标ID（post=文章 id，user=用户 id）',
>     target_snapshot varchar(500) default null comment '举报时的目标快照（文章标题+简介 / 用户昵称）',
>     reporter_id int not null comment '举报人用户ID',
>     reason_type varchar(32) not null comment '举报理由（字典 post_report_reason 的 dictValue）',
>     reason_content varchar(500) default null comment '补充说明（可空，抄袭出处等）',
>     status char(1) default '0' comment '处理状态（0 待处理 1 成立 2 驳回）',
>     handle_action varchar(16) default null comment '处置动作（unpublish 下架文章 / disableUser 停用用户，无动作 null）',
>     handle_remark varchar(255) default null comment '处理备注',
>     handler_id int default null comment '处理人用户ID',
>     pending_flag int default null comment '待处理标记（待处理=1，处理完成置 NULL）',
>     handle_time datetime(3) default null comment '处理时间（毫秒粒度）',
>     create_time datetime(3) default current_timestamp(3) comment '举报时间（毫秒粒度，24h 频控统计列）',
>     primary key (id),
>     unique key uk_reporter_pending (reporter_id, target_type, target_id, pending_flag),
>     key idx_target_status (target_type, target_id, status),
>     key idx_reporter_create (reporter_id, create_time)
>   ) engine = innodb comment = '举报库';
> ```

### 新增

- **举报模块（文章/用户举报全链路）**：`post_report` 联合表（target_type 区分文章/用户），`uk_reporter_pending` 唯一索引 + `INSERT IGNORE` 兜底并发（同一目标同时至多一条待处理举报，处理完成后可再次举报）；24h 内 10 次频控、自查拦截、举报理由/目标类型走数据字典校验；同一文章待处理举报达阈值（`AUTO_OFFLINE_REPORTERS`）事务内自动下架并通知作者；处理结论（成立/驳回）与处置动作（下架文章/停用用户）按目标类型校验，处理完成定向反馈通知（`sys_notice` type=3，通知中心「系统通知」承接）
- **admin**：举报管理页（菜单 212~214，目标类型/理由/状态/举报人/时间筛选 + 批量删除）；处理弹窗展示举报目标、理由与补充说明，停用用户时可填写停用原因（默认「举报核实成立，内容违规」）
- **client**：文章页与空间页举报入口（登录守卫、自查/重复举报置灰），举报弹窗字典驱动；举报反馈接入通知中心
- **docs**：新增举报模块约定页（接口契约、三态重复举报、通知分类与挂点）

### 加固

- **举报目标有效性**：仅已发布文章与未删除用户可被举报（文章下架/删除、用户注销后提交返回目标不存在）；举报时落 `target_snapshot`（文章标题+简介 / 用户昵称），目标后续编辑或删除后管理端仍可还原被举报内容
- **下架幂等**：处置下架改为条件更新（仅 PUBLISHED 且未删除），未实际下架时不通知作者、不重复计数；成立结论与已下架状态并发安全
- **停用原因与登录拦截**：`sys_user` 新增 `stop_reason` / `stop_time`（重新启用清空），停用即踢下线；密码校验通过后按专属业务码 `ACCOUNT_DISABLED_CODE=603` 返回（HTTP 403，信封 data 携带停用时间/原因），客户端登录弹窗内常驻展示处置说明与申诉指引（不做 toast）；管理端停用用户改为填写原因弹窗

### 修复

- `init.sql` 的 `sys_user` 种子改为显式列名（新增尾部列后位置插入列数不匹配，全新导入会失败）
- 版本号全仓对齐（8 包 1.3.0→1.4.0）

## v1.3.0（2026-11-25）

关注模块全链路（用户互关：前台交互 + 通知红标 + 管理端管理页 + 用户列表粉丝量列），文档站进容器栈，通知已读水位毫秒化修复。

> 升级提示：本版本含数据库变更，存量环境需执行增量 SQL（详见 `apps/server/db/init.sql` 21~23、25、27 号表与 sys_menu 210/211 种子）：
>
> ```sql
> -- 互动列升毫秒级 datetime(3)（水位修复，存量数据自动补 .000，无需回填）
> alter table post_notify_read modify read_time datetime(3) default current_timestamp(3) comment '最后已读时间（毫秒粒度，作互动未读水位）';
> alter table post_comment modify create_time datetime(3) default current_timestamp(3) comment '评论时间（毫秒粒度，互动通知水位比较列）';
> alter table post_like modify create_time datetime(3) default current_timestamp(3) comment '点赞时间（毫秒粒度，互动通知水位比较列）';
> alter table post_collection_article modify create_time datetime(3) default current_timestamp(3) comment '收藏时间（毫秒粒度，互动通知水位比较列）';
>
> -- 新增关注表
> create table
>   post_follow (
>     id int not null auto_increment comment '关注 id',
>     follower_id int not null comment '关注人（粉丝）用户ID',
>     following_id int not null comment '被关注用户ID',
>     create_time datetime(3) default current_timestamp(3) comment '关注时间（毫秒粒度，互动通知水位比较列）',
>     primary key (id),
>     unique key uk_follower_following (follower_id, following_id),
>     key idx_following_id (following_id)
>   ) engine = innodb comment = '关注库';
>
> -- 关注管理菜单与权限种子（容器内灌中文 SQL 需先 SET NAMES utf8mb4，否则客户端按 latin1 重读产生双重编码乱码）
> insert into sys_menu values ('210', '关注管理', '6', '4', 'follow', 'post/follow/index', '', '1', '0', 'C', '0', '0', 'post:follow:list', 'peoples', 'admin', sysdate(), '', null, '关注管理菜单', '0');
> insert into sys_menu values ('211', '关注删除', '210', '1', '', '', '', '1', '0', 'F', '0', '0', 'post:follow:remove', 'form', 'admin', sysdate(), '', null, '关注删除权限', '0');
> ```

### 新增

- **关注模块（用户互关全链路）**：`post_follow` 明细表（uk_follower_following 唯一索引，取关物理删除），粉丝数读时 COUNT 不落冗余计数列（两方向索引 + 整页 GROUP BY 批查，管理删除免回减）。前台：空间页关注/粉丝栏（访客公开，同掘金）、文章页作者卡与空间资料卡三态关注按钮（关注/已关注/互相关注，动作后回读权威状态）、通知中心「新增粉丝」栏（谁关注了我 + 行尾回关，进栏清水位）、铃铛未读计入 follow 分类
- **admin**：关注管理页（关注人/被关注人昵称模糊搜索 + 时间范围过滤 + 批量删除，`post:follow:list/remove` 权限串，菜单种子 210/211）；用户管理列表新增「粉丝量」列（复用关注服务整页批查）
- **文档站进容器栈**：VitePress 多阶段镜像（build → nginx:alpine），blog-nginx 增 `/manual/` 反代，robots.txt 屏蔽搜索引擎（文档含基础设施信息）；全站侧栏六分组重构，新增 Client 端开发约定页与关注模块约定页

### 修复

- **通知已读水位漏标**：`post_notify_read.read_time` 与互动列 `post_comment.create_time` / `post_like.create_time` / `post_collection_article.create_time` 升为毫秒级 `datetime(3) default current_timestamp(3)`。未读数按互动 `create_time > 水位` 严格比较，秒级粒度下 markRead 同秒到达的互动等于水位、被永久排除（铃铛漏红标）；毫秒级后残余窗口缩至同毫秒并发（存储粒度极限）

## v1.2.1（2026-11-23）

> 升级提示：本批次含数据库变更，存量环境需执行增量 DDL（列升 `datetime(3)` 时 MySQL 要求默认值同步带精度，存量数据自动补 `.000`，无需回填；详见 `apps/server/db/init.sql` 21~23、25 号表）：
>
> ```sql
> alter table post_notify_read modify read_time datetime(3) default current_timestamp(3) comment '最后已读时间（毫秒粒度，作互动未读水位）';
> alter table post_comment modify create_time datetime(3) default current_timestamp(3) comment '评论时间（毫秒粒度，互动通知水位比较列）';
> alter table post_like modify create_time datetime(3) default current_timestamp(3) comment '点赞时间（毫秒粒度，互动通知水位比较列）';
> alter table post_collection_article modify create_time datetime(3) default current_timestamp(3) comment '收藏时间（毫秒粒度，互动通知水位比较列）';
> ```

## v1.2.1（2026-11-23）

收藏集标签枚举接入数据字典，管理端新增「自建」类型标签。

> 升级提示：本版本含字典种子数据——`sys_dict_type` 增 16 收藏集可见性（`sys_collection_visibility`）/ 17 收藏集类型（`sys_collection_type`），`sys_dict_data` 增 50~53 四项（详见 `apps/server/db/init.sql` 字典区末尾）。存量环境手工执行 INSERT 后需清理 Redis `sys_dict:all` 缓存，并 touch 字典行（`update sys_dict_data set update_time = now()`）推进版本号，前端才会重新拉取。

### 新增

- **数据字典**：收藏集可见性（0 公开 success / 1 私密 info）与收藏集类型（1 默认 warning / 0 自建 primary）建立字典，文案与标签颜色可在管理端「字典管理」维护，不再硬编码
- **admin**：收藏管理页可见性列与名称列标签改 `DictTag` 按字典渲染；非默认收藏集新增「自建」类型标签（与「默认」同字典同口径）

### 修复

- admin 收藏管理操作列过窄导致「文章/删除」竖排换行：加宽至 160px 并右固定；收藏文章抽屉分页组件沉底右下角

## v1.2.0（2026-11-23）

收藏集与收藏功能全链路（前台交互 + 通知中心 + 管理端），对齐掘金收藏集形态。

> 升级提示：本版本含数据库变更，存量环境需执行增量 DDL——新增 `post_collection` / `post_collection_article` / `post_collection_sub` 三表（含 `uk_user_default` 唯一索引），`post_article` 增 `collect_num` 列与 `post_collection.is_default` 列（详见 `apps/server/db/init.sql` 24~26 号表）。

### 新增

- **收藏集**：前台创建/编辑/删除（公开/私密可见性，私密仅创建者可见，管理员例外）；个人空间「收藏集」tab（我创建的/我订阅的子栏 + 行内悬浮编辑/删除）；收藏集详情页（品牌渐变横幅 + 「N篇文章 · N订阅」统计行 + 加载更多）
- **收藏动作**：文章详情收藏弹窗（勾选收藏集 / 行内新建 / 星标高亮与计数角标）；收藏与移出幂等（唯一索引 + INSERT IGNORE，同点赞模式），事务维护集内文章数与文章 `collect_num` 双计数
- **默认收藏夹**：注册事务内与用户同建（原子防半成功），存量用户惰性补建；`uk_user_default` 唯一索引利用 NULL 不参与唯一约束保证一人至多一个；置顶展示，前台与管理端删除均拦截/跳过
- **订阅**：公开收藏集可订阅/退订（幂等 + 订阅数维护），空间页「我订阅的」列表
- **通知中心**：「赞和收藏」栏拆收到的赞/收到的收藏双子栏；未读计数扩 `collect` 分类（铃铛合计），进入栏目一次推平 like+collect 已读水位；收到的收藏仅统计公开收藏集
- **管理端**：交互管理下新增收藏管理页（名称/创建者模糊搜索 + 时间范围过滤 + 公开私密/默认标签），「文章」抽屉分页查看集内文章（管理员可看私密集），勾选批量删除联动清理收藏/订阅关系并回减文章收藏数
- **契约与数据**：`packages/shared` 增 `types/collection.ts`；`apps/server` 新增 `post/collection` 模块（guest/写路径/管理端三层鉴权口径）；init.sql 增 24~26 号表

### 修复

- 私密集本人访问时文章列表为空：SSR 无 token 被可见性拒绝，登录态恢复后检测详情计数与列表不一致即补拉首屏
- 管理列表漏 `addSelect` 导致创建者昵称恒空
- notify 已读 DTO 未放行新分类 `collect`

## v1.1.0（2026-11-22）

首个正式功能版本：monorepo 整合收官 + 全量代码审查修复 + 编辑器/渲染层统一。

### 新增

- **共享包四件套**：`@nest-acticle/shared`（契约）/ `utils`（纯函数）/ `markdown`（渲染器 + KaTeX + mermaid）/ `editor`（Markdown 编辑器组件，vite lib mode + vue-tsc dts）
- **编辑器统一**：client/admin 共用同一 MarkdownEditor——工具栏/快捷键（Ctrl+B·I / Tab 缩进 / Ctrl+S）/撤销栈保栈/链接插入弹窗/粘贴+拖拽上传/滚动同步/字数·阅读时长；md-editor-v3 全仓移除
- **展示增强**：KaTeX 数学公式、mermaid 图表懒加载（无图表零加载成本）、lightbox 图片放大（三消费方同源）、外链新窗口、图片懒加载
- **client**：发布前全屏预览遮罩（目录/作者卡/与详情页同构）、编辑模式本地草稿快照与恢复横幅、Ctrl+S 存草稿、通知中心"收到的赞"
- **admin**：ArticleForm 收敛为元数据快速编辑（editor.vue 唯一内容编辑链路）

### 安全

- 修复存储型 XSS：markdown-it 关闭 raw HTML 透传（`html:false`）+ 围栏外 HTML 注释剥离
- mermaid `securityLevel: 'strict'` 显式声明
- 封堵文章 DTO mass assignment（计数可伪造/审核可绕过）

### 修复

- 审核人 auditUserId 硬编码、分片上传 COS 状态回写失效、评论管理列表被回复人昵称恒空、admin 权限串大小写不一致、loginlog 导出仅 10 行、层叠弹窗 ESC 连退

### 架构与工程

- 拆除 16 处 `@Global` 恢复模块边界（断除 Role⇄User / Menu⇄User 循环）
- 错误协议统一：`ResultData.fail` 全迁 `BusinessException`（HTTP 状态真实化，信封形状不变）
- 公共查询层 `paginate / applyLike / attachUserInfo / assertOwnership`，消列表 N+1
- CI 质量门禁（lint / typecheck / test / build 五项）+ apiBase 同源化（Nitro 代理，换网络零配置）

## v1.0.0（2026-11-19）

monorepo 整合基线：`nest-admin`（v1.2.0）+ `nuxt3-article`（2026-11-17 快照）并入单仓，shared/utils 契约层建立，阶段一~三完成（注册审计、点赞模块全链路、评论模块全链路）。

SET NAMES utf8mb4;

-- ----------------------------
-- 2、用户信息表
-- ----------------------------
drop table if exists sys_user;

create table
  sys_user (
    user_id int not null auto_increment comment '用户ID',
    user_name varchar(30) not null comment '用户账号',
    nick_name varchar(30) not null comment '用户昵称',
    user_type varchar(2) default '00' comment '用户类型（00系统用户）',
    email varchar(50) default '' comment '用户邮箱',
    phonenumber varchar(11) default '' comment '手机号码',
    sex char(1) default '0' comment '用户性别（0男 1女 2未知）',
    avatar varchar(100) default '' comment '头像地址',
    signature varchar(50) default '' comment '个性签名',
    password varchar(200) default '' comment '密码',
    status char(1) default '0' comment '账号状态（0正常 1停用）',
    del_flag char(1) default '0' comment '删除标志（0代表存在 1代表删除）',
    login_ip varchar(128) default '' comment '最后登录IP',
    login_date datetime comment '最后登录时间',
    create_by varchar(64) default '' comment '创建者',
    create_time datetime default current_timestamp comment '创建时间',
    update_by varchar(64) default '' comment '更新者',
    update_time datetime comment '更新时间',
    remark varchar(500) default null comment '备注',
    -- 停用原因/时间：停用用户无法登录、收不到站内信，登录拦截提示据此展示处置说明（启用时清空）
    stop_reason varchar(255) default null comment '停用原因（登录拦截展示）',
    stop_time datetime(3) default null comment '停用时间（登录拦截展示）',
    primary key (user_id),
    unique key uniq_user_name (user_name)
  ) engine = innodb auto_increment = 100 comment = '用户信息表';

-- ----------------------------
-- 初始化-用户信息表数据
-- ----------------------------
-- 显式列名：补充 stop_reason/stop_time 等尾部列后，位置插入不再随建表列序漂移
insert into
  sys_user (
    user_id,
    user_name,
    nick_name,
    user_type,
    email,
    phonenumber,
    sex,
    avatar,
    signature,
    password,
    status,
    del_flag,
    login_ip,
    login_date,
    create_by,
    create_time,
    update_by,
    update_time,
    remark
  )
values
  (
    1,
    'admin',
    'nest-admin',
    '00',
    'ry@163.com',
    '15888888888',
    '1',
    '',
    '',
    '$2b$10$d4Z9Iq.v9J4pjX55I9mzRuPHsOMKLupOqxlb/UfbD9oYsYxd5ezeS',
    '0',
    '0',
    '127.0.0.1',
    sysdate(),
    'admin',
    sysdate(),
    '',
    null,
    '管理员'
  );

insert into
  sys_user (
    user_id,
    user_name,
    nick_name,
    user_type,
    email,
    phonenumber,
    sex,
    avatar,
    signature,
    password,
    status,
    del_flag,
    login_ip,
    login_date,
    create_by,
    create_time,
    update_by,
    update_time,
    remark
  )
values
  (
    2,
    'ry',
    'nest-admin',
    '00',
    'ry@qq.com',
    '15666666666',
    '1',
    '',
    '',
    '$2b$10$d4Z9Iq.v9J4pjX55I9mzRuPHsOMKLupOqxlb/UfbD9oYsYxd5ezeS',
    '0',
    '0',
    '127.0.0.1',
    sysdate(),
    'admin',
    sysdate(),
    '',
    null,
    '测试员'
  );

-- ----------------------------
-- 4、角色信息表
-- ----------------------------
drop table if exists sys_role;

create table
  sys_role (
    role_id int not null auto_increment comment '角色ID',
    role_name varchar(30) not null comment '角色名称',
    role_key varchar(100) not null comment '角色权限字符串',
    role_sort int (4) not null comment '显示顺序',
    data_scope char(1) default '1' comment '数据范围（1：全部数据权限 2：自定数据权限 3：本部门数据权限 4：本部门及以下数据权限）',
    menu_check_strictly tinyint (1) default 1 comment '菜单树选择项是否关联显示',
    dept_check_strictly tinyint (1) default 1 comment '部门树选择项是否关联显示',
    status char(1) not null comment '角色状态（0正常 1停用）',
    del_flag char(1) default '0' comment '删除标志（0代表存在 1代表删除）',
    create_by varchar(64) default '' comment '创建者',
    create_time datetime default current_timestamp comment '创建时间',
    update_by varchar(64) default '' comment '更新者',
    update_time datetime comment '更新时间',
    remark varchar(500) default null comment '备注',
    primary key (role_id)
  ) engine = innodb auto_increment = 100 comment = '角色信息表';

-- ----------------------------
-- 初始化-角色信息表数据
-- ----------------------------
insert into
  sys_role
values
  (
    '1',
    '超级管理员',
    'admin',
    1,
    1,
    1,
    1,
    '0',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '超级管理员'
  );

insert into
  sys_role
values
  (
    '2',
    '普通角色',
    'common',
    2,
    2,
    1,
    1,
    '0',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '普通角色'
  );

insert into
  sys_role
values
  (
    '3',
    '编辑角色',
    'editor',
    3,
    2,
    1,
    1,
    '0',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '负责文章审核和公告发布'
  );

insert into
  sys_role
values
  (
    '4',
    '注册用户',
    'member',
    4,
    '5',
    1,
    1,
    '0',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '客户端注册用户默认角色，仅个人中心自助权限'
  );

-- ----------------------------
-- 5、菜单权限表
-- ----------------------------
drop table if exists sys_menu;

create table
  sys_menu (
    menu_id int not null auto_increment comment '菜单ID',
    menu_name varchar(50) not null comment '菜单名称',
    parent_id int default 0 comment '父菜单ID',
    order_num int (4) default 0 comment '显示顺序',
    path varchar(200) default '' comment '路由地址',
    component varchar(255) default null comment '组件路径',
    query varchar(255) default null comment '路由参数',
    is_frame char(1) default 1 comment '是否为外链（0是 1否）',
    is_cache char(1) default 0 comment '是否缓存（0缓存 1不缓存）',
    menu_type char(1) default '' comment '菜单类型（M目录 C菜单 F按钮）',
    visible char(1) default '0' comment '菜单状态（0显示 1隐藏）',
    status char(1) default '0' comment '菜单状态（0正常 1停用）',
    perms varchar(100) default null comment '权限标识',
    icon varchar(100) default '#' comment '菜单图标',
    create_by varchar(64) default '' comment '创建者',
    create_time datetime default current_timestamp comment '创建时间',
    update_by varchar(64) default '' comment '更新者',
    update_time datetime comment '更新时间',
    remark varchar(500) default '' comment '备注',
    del_flag char(1) default '0' comment '删除标志（0代表存在 1代表删除）',
    primary key (menu_id)
  ) engine = innodb auto_increment = 2000 comment = '菜单权限表';

-- ----------------------------
-- 初始化-菜单信息表数据
-- ----------------------------
-- 一级菜单
insert into
  sys_menu
values
  (
    '1',
    '系统管理',
    '0',
    '1',
    'system',
    null,
    '',
    1,
    0,
    'M',
    '0',
    '0',
    '',
    'system',
    'admin',
    sysdate(),
    '',
    null,
    '系统管理目录',
    '0'
  );

insert into
  sys_menu
values
  (
    '2',
    '系统监控',
    '0',
    '2',
    'monitor',
    null,
    '',
    1,
    0,
    'M',
    '0',
    '0',
    '',
    'monitor',
    'admin',
    sysdate(),
    '',
    null,
    '系统监控目录',
    '0'
  );

insert into
  sys_menu
values
  (
    '3',
    '系统工具',
    '0',
    '3',
    'tool',
    null,
    '',
    1,
    0,
    'M',
    '0',
    '0',
    '',
    'tool',
    'admin',
    sysdate(),
    '',
    null,
    '系统工具目录',
    '0'
  );

insert into
  sys_menu
values
  (
    '5',
    '内容管理',
    '0',
    '5',
    'content',
    null,
    '',
    1,
    0,
    'M',
    '0',
    '0',
    '',
    'documentation',
    'admin',
    sysdate(),
    '',
    null,
    '内容管理目录',
    '0'
  );

-- 二级菜单
insert into
  sys_menu
values
  (
    '100',
    '用户管理',
    '1',
    '1',
    'user',
    'system/user/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'system:user:list',
    'user',
    'admin',
    sysdate(),
    '',
    null,
    '用户管理菜单',
    '0'
  );

insert into
  sys_menu
values
  (
    '101',
    '角色管理',
    '1',
    '2',
    'role',
    'system/role/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'system:role:list',
    'peoples',
    'admin',
    sysdate(),
    '',
    null,
    '角色管理菜单',
    '0'
  );

insert into
  sys_menu
values
  (
    '102',
    '菜单管理',
    '1',
    '3',
    'menu',
    'system/menu/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'system:menu:list',
    'tree-table',
    'admin',
    sysdate(),
    '',
    null,
    '菜单管理菜单',
    '0'
  );

insert into
  sys_menu
values
  (
    '105',
    '字典管理',
    '1',
    '6',
    'dict',
    'system/dict/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'system:dict:list',
    'dict',
    'admin',
    sysdate(),
    '',
    null,
    '字典管理菜单',
    '0'
  );

insert into
  sys_menu
values
  (
    '106',
    '参数设置',
    '1',
    '7',
    'config',
    'system/config/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'system:config:list',
    'edit',
    'admin',
    sysdate(),
    '',
    null,
    '参数设置菜单',
    '0'
  );

insert into
  sys_menu
values
  (
    '107',
    '通知公告',
    '1',
    '8',
    'notice',
    'system/notice/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'system:notice:list',
    'message',
    'admin',
    sysdate(),
    '',
    null,
    '通知公告菜单',
    '0'
  );

insert into
  sys_menu
values
  (
    '108',
    '日志管理',
    '1',
    '9',
    'log',
    '',
    '',
    '1',
    '0',
    'M',
    '0',
    '0',
    '',
    'log',
    'admin',
    sysdate(),
    '',
    null,
    '日志管理菜单',
    '0'
  );

insert into
  sys_menu
values
  (
    '109',
    '在线用户',
    '2',
    '1',
    'online',
    'monitor/online/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'monitor:online:list',
    'online',
    'admin',
    sysdate(),
    '',
    null,
    '在线用户菜单',
    '0'
  );

insert into
  sys_menu
values
  (
    '110',
    '定时任务',
    '2',
    '2',
    'job',
    'monitor/job/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'monitor:job:list',
    'job',
    'admin',
    sysdate(),
    '',
    null,
    '定时任务菜单',
    '0'
  );

insert into
  sys_menu
values
  (
    '112',
    '服务监控',
    '2',
    '4',
    'server',
    'monitor/server/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'monitor:server:list',
    'server',
    'admin',
    sysdate(),
    '',
    null,
    '服务监控菜单',
    '0'
  );

insert into
  sys_menu
values
  (
    '113',
    '缓存监控',
    '2',
    '5',
    'cache',
    'monitor/cache/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'monitor:cache:list',
    'redis',
    'admin',
    sysdate(),
    '',
    null,
    '缓存监控菜单',
    '0'
  );

insert into
  sys_menu
values
  (
    '114',
    '缓存列表',
    '2',
    '6',
    'cacheList',
    'monitor/cache/list',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'monitor:cache:list',
    'redis-list',
    'admin',
    sysdate(),
    '',
    null,
    '缓存列表菜单',
    '0'
  );

insert into
  sys_menu
values
  (
    '117',
    '系统接口',
    '3',
    '3',
    'swagger',
    'tool/swagger/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'tool:swagger:list',
    'swagger',
    'admin',
    sysdate(),
    '',
    null,
    '系统接口菜单',
    '0'
  );

-- 内容管理二级菜单
insert into
  sys_menu
values
  (
    '200',
    '文章管理',
    '5',
    '1',
    'article',
    'post/article/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'post:article:list',
    'form',
    'admin',
    sysdate(),
    '',
    null,
    '文章管理菜单',
    '0'
  );

insert into
  sys_menu
values
  (
    '201',
    '专栏管理',
    '5',
    '2',
    'subject',
    'post/subject/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'post:subject:list',
    'tree-table',
    'admin',
    sysdate(),
    '',
    null,
    '专栏管理菜单',
    '0'
  );

-- 三级菜单
insert into sys_menu values ('202', '文件管理', '5', '3', 'file', 'post/file/index', '', '1', '0', 'C', '0', '0', 'post:file:list', 'upload', 'admin', sysdate(), '', null, '文件管理菜单', '0');
insert into sys_menu values ('203', '文件删除', '202', '1', '', '', '', '1', '0', 'F', '0', '0', 'post:file:remove', 'form', 'admin', sysdate(), '', null, '文件删除权限', '0');

-- 交互管理目录（与内容管理同级；点赞管理为子菜单，授权默认仅管理员，其余角色经管理端角色管理按需分配）
insert into
  sys_menu
values
  (
    '6',
    '交互管理',
    '0',
    '6',
    'interaction',
    null,
    '',
    1,
    0,
    'M',
    '0',
    '0',
    '',
    'message',
    'admin',
    sysdate(),
    '',
    null,
    '交互管理目录',
    '0'
  );

insert into
  sys_menu
values
  (
    '204',
    '点赞管理',
    '6',
    '1',
    'like',
    'post/like/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'post:like:list',
    'star',
    'admin',
    sysdate(),
    '',
    null,
    '点赞管理菜单',
    '0'
  );

insert into
  sys_menu
values
  (
    '205',
    '点赞删除',
    '204',
    '1',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'post:like:remove',
    'form',
    'admin',
    sysdate(),
    '',
    null,
    '点赞删除权限',
    '0'
  );

insert into
  sys_menu
values
  (
    '206',
    '评论管理',
    '6',
    '2',
    'comment',
    'post/comment/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'post:comment:list',
    'form',
    'admin',
    sysdate(),
    '',
    null,
    '评论管理菜单',
    '0'
  );

insert into
  sys_menu
values
  (
    '207',
    '评论删除',
    '206',
    '1',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'post:comment:remove',
    'form',
    'admin',
    sysdate(),
    '',
    null,
    '评论删除权限',
    '0'
  );

insert into
  sys_menu
values
  (
    '208',
    '收藏管理',
    '6',
    '3',
    'collection',
    'post/collection/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'post:collection:list',
    'clipboard',
    'admin',
    sysdate(),
    '',
    null,
    '收藏管理菜单',
    '0'
  );

insert into
  sys_menu
values
  (
    '209',
    '收藏删除',
    '208',
    '1',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'post:collection:remove',
    'form',
    'admin',
    sysdate(),
    '',
    null,
    '收藏删除权限',
    '0'
  );

insert into
  sys_menu
values
  (
    '210',
    '关注管理',
    '6',
    '4',
    'follow',
    'post/follow/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'post:follow:list',
    'peoples',
    'admin',
    sysdate(),
    '',
    null,
    '关注管理菜单',
    '0'
  );

insert into
  sys_menu
values
  (
    '211',
    '关注删除',
    '210',
    '1',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'post:follow:remove',
    'form',
    'admin',
    sysdate(),
    '',
    null,
    '关注删除权限',
    '0'
  );

insert into
  sys_menu
values
  (
    '212',
    '举报管理',
    '6',
    '5',
    'report',
    'post/report/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'post:report:list',
    'message',
    'admin',
    sysdate(),
    '',
    null,
    '举报管理菜单',
    '0'
  );

insert into
  sys_menu
values
  (
    '213',
    '举报处理',
    '212',
    '1',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'post:report:handle',
    'form',
    'admin',
    sysdate(),
    '',
    null,
    '举报处理权限',
    '0'
  );

insert into
  sys_menu
values
  (
    '214',
    '举报删除',
    '212',
    '2',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'post:report:remove',
    'form',
    'admin',
    sysdate(),
    '',
    null,
    '举报删除权限',
    '0'
  );

-- 反馈管理菜单：显式列名（对齐 sys_user 种子修正口径，位置插入不再随建表列序漂移）
insert into
  sys_menu
  (menu_id, menu_name, parent_id, order_num, path, component, query, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    '215',
    '反馈管理',
    '6',
    '6',
    'feedback',
    'post/feedback/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'post:feedback:list',
    'message',
    'admin',
    sysdate(),
    '',
    null,
    '反馈管理菜单',
    '0'
  );

insert into
  sys_menu
  (menu_id, menu_name, parent_id, order_num, path, component, query, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    '216',
    '反馈处理',
    '215',
    '1',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'post:feedback:handle',
    'form',
    'admin',
    sysdate(),
    '',
    null,
    '反馈处理权限',
    '0'
  );

insert into
  sys_menu
  (menu_id, menu_name, parent_id, order_num, path, component, query, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    '217',
    '反馈删除',
    '215',
    '2',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'post:feedback:remove',
    'form',
    'admin',
    sysdate(),
    '',
    null,
    '反馈删除权限',
    '0'
  );

insert into
  sys_menu
values
  (
    '500',
    '操作日志',
    '108',
    '1',
    'operlog',
    'monitor/operlog/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'monitor:operlog:list',
    'form',
    'admin',
    sysdate(),
    '',
    null,
    '操作日志菜单',
    '0'
  );

insert into
  sys_menu
values
  (
    '501',
    '登录日志',
    '108',
    '2',
    'logininfor',
    'monitor/logininfor/index',
    '',
    '1',
    '0',
    'C',
    '0',
    '0',
    'monitor:logininfor:list',
    'logininfor',
    'admin',
    sysdate(),
    '',
    null,
    '登录日志菜单',
    '0'
  );

-- 用户管理按钮
insert into
  sys_menu
values
  (
    '1000',
    '用户查询',
    '100',
    '1',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:user:query',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1001',
    '用户新增',
    '100',
    '2',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:user:add',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1002',
    '用户修改',
    '100',
    '3',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:user:edit',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1003',
    '用户删除',
    '100',
    '4',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:user:remove',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1004',
    '用户导出',
    '100',
    '5',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:user:export',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1005',
    '用户导入',
    '100',
    '6',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:user:import',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1006',
    '重置密码',
    '100',
    '7',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:user:resetPwd',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

-- 个人中心按钮（注册用户角色自助使用，不出现在管理端侧边栏）
insert into
  sys_menu
values
  (
    '1060',
    '个人中心查询',
    '100',
    '8',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:user:profile:view',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '个人中心自助查询权限',
    '0'
  );

insert into
  sys_menu
values
  (
    '1061',
    '个人中心修改',
    '100',
    '9',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:user:profile:edit',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '个人中心自助修改权限（资料/头像/密码）',
    '0'
  );

-- 角色管理按钮
insert into
  sys_menu
values
  (
    '1007',
    '角色查询',
    '101',
    '1',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:role:query',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1008',
    '角色新增',
    '101',
    '2',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:role:add',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1009',
    '角色修改',
    '101',
    '3',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:role:edit',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1010',
    '角色删除',
    '101',
    '4',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:role:remove',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1011',
    '角色导出',
    '101',
    '5',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:role:export',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

-- 菜单管理按钮
insert into
  sys_menu
values
  (
    '1012',
    '菜单查询',
    '102',
    '1',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:menu:query',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1013',
    '菜单新增',
    '102',
    '2',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:menu:add',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1014',
    '菜单修改',
    '102',
    '3',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:menu:edit',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1015',
    '菜单删除',
    '102',
    '4',
    '',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:menu:remove',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

-- 字典管理按钮
insert into
  sys_menu
values
  (
    '1025',
    '字典查询',
    '105',
    '1',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:dict:query',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1026',
    '字典新增',
    '105',
    '2',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:dict:add',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1027',
    '字典修改',
    '105',
    '3',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:dict:edit',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1028',
    '字典删除',
    '105',
    '4',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:dict:remove',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1029',
    '字典导出',
    '105',
    '5',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:dict:export',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

-- 参数设置按钮
insert into
  sys_menu
values
  (
    '1030',
    '参数查询',
    '106',
    '1',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:config:query',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1031',
    '参数新增',
    '106',
    '2',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:config:add',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1032',
    '参数修改',
    '106',
    '3',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:config:edit',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1033',
    '参数删除',
    '106',
    '4',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:config:remove',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1034',
    '参数导出',
    '106',
    '5',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:config:export',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

-- 通知公告按钮
insert into
  sys_menu
values
  (
    '1035',
    '公告查询',
    '107',
    '1',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:notice:query',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1036',
    '公告新增',
    '107',
    '2',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:notice:add',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1037',
    '公告修改',
    '107',
    '3',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:notice:edit',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1038',
    '公告删除',
    '107',
    '4',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'system:notice:remove',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

-- 操作日志按钮
insert into
  sys_menu
values
  (
    '1039',
    '操作查询',
    '500',
    '1',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'monitor:operlog:query',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1040',
    '操作删除',
    '500',
    '2',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'monitor:operlog:remove',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1041',
    '日志导出',
    '500',
    '3',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'monitor:operlog:export',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

-- 登录日志按钮
insert into
  sys_menu
values
  (
    '1042',
    '登录查询',
    '501',
    '1',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'monitor:logininfor:query',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1043',
    '登录删除',
    '501',
    '2',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'monitor:logininfor:remove',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1044',
    '日志导出',
    '501',
    '3',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'monitor:logininfor:export',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1045',
    '账户解锁',
    '501',
    '4',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'monitor:logininfor:unlock',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

-- 在线用户按钮
insert into
  sys_menu
values
  (
    '1046',
    '在线查询',
    '109',
    '1',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'monitor:online:query',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1047',
    '批量强退',
    '109',
    '2',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'monitor:online:batchLogout',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1048',
    '单条强退',
    '109',
    '3',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'monitor:online:forceLogout',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

-- 定时任务按钮
insert into
  sys_menu
values
  (
    '1049',
    '任务查询',
    '110',
    '1',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'monitor:job:query',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1050',
    '任务新增',
    '110',
    '2',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'monitor:job:add',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1051',
    '任务修改',
    '110',
    '3',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'monitor:job:edit',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1052',
    '任务删除',
    '110',
    '4',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'monitor:job:remove',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1053',
    '状态修改',
    '110',
    '5',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'monitor:job:changeStatus',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '1054',
    '任务导出',
    '110',
    '6',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'monitor:job:export',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

-- 文章管理按钮
insert into
  sys_menu
values
  (
    '2000',
    '文章查询',
    '200',
    '1',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'post:article:query',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '2001',
    '文章新增',
    '200',
    '2',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'post:article:add',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '2002',
    '文章修改',
    '200',
    '3',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'post:article:edit',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '2003',
    '文章删除',
    '200',
    '4',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'post:article:remove',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '2004',
    '提交审核',
    '200',
    '5',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'post:article:submitAudit',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '2005',
    '文章审核',
    '200',
    '6',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'post:article:audit',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '2006',
    '发布文章',
    '200',
    '7',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'post:article:publish',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

-- 专栏管理按钮
insert into
  sys_menu
values
  (
    '2010',
    '专栏查询',
    '201',
    '1',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'post:subject:query',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '2011',
    '专栏新增',
    '201',
    '2',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'post:subject:add',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '2012',
    '专栏修改',
    '201',
    '3',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'post:subject:edit',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

insert into
  sys_menu
values
  (
    '2013',
    '专栏删除',
    '201',
    '4',
    '#',
    '',
    '',
    '1',
    '0',
    'F',
    '0',
    '0',
    'post:subject:remove',
    '#',
    'admin',
    sysdate(),
    '',
    null,
    '',
    '0'
  );

-- ----------------------------
-- 6、用户和角色关联表  用户N-1角色
-- ----------------------------
drop table if exists sys_user_role;

create table
  sys_user_role (
    user_id int not null comment '用户ID',
    role_id int not null comment '角色ID',
    primary key (user_id, role_id)
  ) engine = innodb comment = '用户和角色关联表';

-- ----------------------------
-- 初始化-用户和角色关联表数据
-- ----------------------------
insert into
  sys_user_role
values
  ('1', '1');

insert into
  sys_user_role
values
  ('2', '2');

-- ----------------------------
-- 7、角色和菜单关联表  角色1-N菜单
-- ----------------------------
drop table if exists sys_role_menu;

create table
  sys_role_menu (
    role_id int not null comment '角色ID',
    menu_id int not null comment '菜单ID',
    primary key (role_id, menu_id)
  ) engine = innodb comment = '角色和菜单关联表';

-- ----------------------------
-- 初始化-角色和菜单关联表数据
-- ----------------------------
insert into
  sys_role_menu
values
  ('2', '1');

insert into
  sys_role_menu
values
  ('2', '2');

insert into
  sys_role_menu
values
  ('2', '3');

insert into
  sys_role_menu
values
  ('2', '100');

insert into
  sys_role_menu
values
  ('2', '101');

insert into
  sys_role_menu
values
  ('2', '102');

insert into
  sys_role_menu
values
  ('2', '105');

insert into
  sys_role_menu
values
  ('2', '106');

insert into
  sys_role_menu
values
  ('2', '107');

insert into
  sys_role_menu
values
  ('2', '108');

insert into
  sys_role_menu
values
  ('2', '109');

insert into
  sys_role_menu
values
  ('2', '110');

insert into
  sys_role_menu
values
  ('2', '112');

insert into
  sys_role_menu
values
  ('2', '113');

insert into
  sys_role_menu
values
  ('2', '114');

insert into
  sys_role_menu
values
  ('2', '117');

insert into
  sys_role_menu
values
  ('2', '500');

insert into
  sys_role_menu
values
  ('2', '501');

insert into
  sys_role_menu
values
  ('2', '1000');

insert into
  sys_role_menu
values
  ('2', '1001');

insert into
  sys_role_menu
values
  ('2', '1002');

insert into
  sys_role_menu
values
  ('2', '1003');

insert into
  sys_role_menu
values
  ('2', '1004');

insert into
  sys_role_menu
values
  ('2', '1005');

insert into
  sys_role_menu
values
  ('2', '1006');

insert into
  sys_role_menu
values
  ('2', '1007');

insert into
  sys_role_menu
values
  ('2', '1008');

insert into
  sys_role_menu
values
  ('2', '1009');

insert into
  sys_role_menu
values
  ('2', '1010');

insert into
  sys_role_menu
values
  ('2', '1011');

insert into
  sys_role_menu
values
  ('2', '1012');

insert into
  sys_role_menu
values
  ('2', '1013');

insert into
  sys_role_menu
values
  ('2', '1014');

insert into
  sys_role_menu
values
  ('2', '1015');

insert into
  sys_role_menu
values
  ('2', '1025');

insert into
  sys_role_menu
values
  ('2', '1026');

insert into
  sys_role_menu
values
  ('2', '1027');

insert into
  sys_role_menu
values
  ('2', '1028');

insert into
  sys_role_menu
values
  ('2', '1029');

insert into
  sys_role_menu
values
  ('2', '1030');

insert into
  sys_role_menu
values
  ('2', '1031');

insert into
  sys_role_menu
values
  ('2', '1032');

insert into
  sys_role_menu
values
  ('2', '1033');

insert into
  sys_role_menu
values
  ('2', '1034');

insert into
  sys_role_menu
values
  ('2', '1035');

insert into
  sys_role_menu
values
  ('2', '1036');

insert into
  sys_role_menu
values
  ('2', '1037');

insert into
  sys_role_menu
values
  ('2', '1038');

insert into
  sys_role_menu
values
  ('2', '1039');

insert into
  sys_role_menu
values
  ('2', '1040');

insert into
  sys_role_menu
values
  ('2', '1041');

insert into
  sys_role_menu
values
  ('2', '1042');

insert into
  sys_role_menu
values
  ('2', '1043');

insert into
  sys_role_menu
values
  ('2', '1044');

insert into
  sys_role_menu
values
  ('2', '1045');

insert into
  sys_role_menu
values
  ('2', '1046');

insert into
  sys_role_menu
values
  ('2', '1047');

insert into
  sys_role_menu
values
  ('2', '1048');

insert into
  sys_role_menu
values
  ('2', '1049');

insert into
  sys_role_menu
values
  ('2', '1050');

insert into
  sys_role_menu
values
  ('2', '1051');

insert into
  sys_role_menu
values
  ('2', '1052');

insert into
  sys_role_menu
values
  ('2', '1053');

insert into
  sys_role_menu
values
  ('2', '1054');

-- 内容管理菜单权限（普通角色）
insert into
  sys_role_menu
values
  ('2', '5');

insert into
  sys_role_menu
values
  ('2', '200');

insert into
  sys_role_menu
values
  ('2', '201');

insert into
  sys_role_menu
values
  ('2', '2000');

insert into
  sys_role_menu
values
  ('2', '2001');

insert into
  sys_role_menu
values
  ('2', '2002');

insert into
  sys_role_menu
values
  ('2', '2003');

insert into
  sys_role_menu
values
  ('2', '2004');

insert into
  sys_role_menu
values
  ('2', '2005');

insert into
  sys_role_menu
values
  ('2', '2006');

insert into
  sys_role_menu
values
  ('2', '2010');

insert into
  sys_role_menu
values
  ('2', '2011');

insert into
  sys_role_menu
values
  ('2', '2012');

insert into
  sys_role_menu
values
  ('2', '2013');

-- 举报管理菜单权限（普通角色）：212 举报管理页（post:report:list）、213 处理（post:report:handle）、214 删除（post:report:remove）
insert into
  sys_role_menu
values
  ('2', '212');

insert into
  sys_role_menu
values
  ('2', '213');

insert into
  sys_role_menu
values
  ('2', '214');

-- 反馈管理菜单权限（普通角色）：215 反馈管理页（post:feedback:list）、216 处理（post:feedback:handle）、217 删除（post:feedback:remove）
insert into
  sys_role_menu
values
  ('2', '215');

insert into
  sys_role_menu
values
  ('2', '216');

insert into
  sys_role_menu
values
  ('2', '217');

-- 普通角色补充个人中心自助权限（个人中心接口改用独立权限串，不再被 system:user:query/edit 覆盖）
insert into
  sys_role_menu
values
  ('2', '1060');

insert into
  sys_role_menu
values
  ('2', '1061');

-- 编辑角色菜单权限(只包含文章审核和通知公告相关权限)
insert into
  sys_role_menu
values
  ('3', '1');

insert into
  sys_role_menu
values
  ('3', '107');

insert into
  sys_role_menu
values
  ('3', '5');

insert into
  sys_role_menu
values
  ('3', '200');

insert into
  sys_role_menu
values
  ('3', '201');

insert into
  sys_role_menu
values
  ('3', '1035');

insert into
  sys_role_menu
values
  ('3', '1036');

insert into
  sys_role_menu
values
  ('3', '1037');

insert into
  sys_role_menu
values
  ('3', '1038');

insert into
  sys_role_menu
values
  ('3', '2000');

insert into
  sys_role_menu
values
  ('3', '2005');

insert into
  sys_role_menu
values
  ('3', '2010');

-- 注册用户菜单权限（个人中心自助 + 通知中心列表读取）
insert into
  sys_role_menu
values
  ('4', '1060');

insert into
  sys_role_menu
values
  ('4', '1061');

-- 通知公告菜单：仅取 system:notice:list 供前台通知中心读取
insert into
  sys_role_menu
values
  ('4', '107');

-- 发文权限：发布/编辑/删除自己的文章（服务层校验仅限本人，不含管理端列表/审核权限）
insert into
  sys_role_menu
values
  ('4', '2001');

insert into
  sys_role_menu
values
  ('4', '2002');

insert into
  sys_role_menu
values
  ('4', '2003');

-- ----------------------------
-- 10、操作日志记录
-- ----------------------------
drop table if exists sys_oper_log;

create table
  sys_oper_log (
    oper_id bigint (20) not null auto_increment comment '日志主键',
    title varchar(50) default '' comment '模块标题',
    business_type int (2) default 0 comment '业务类型（0其它 1新增 2修改 3删除）',
    method varchar(200) default '' comment '方法名称',
    request_method varchar(10) default '' comment '请求方式',
    operator_type int (1) default 0 comment '操作类别（0其它 1后台用户 2手机端用户）',
    oper_name varchar(50) default '' comment '操作人员',
    dept_name varchar(50) default '' comment '部门名称',
    oper_url varchar(255) default '' comment '请求URL',
    oper_ip varchar(128) default '' comment '主机地址',
    oper_location varchar(255) default '' comment '操作地点',
    oper_param varchar(2000) default '' comment '请求参数',
    json_result varchar(2000) default '' comment '返回参数',
    status int (1) default 0 comment '操作状态（0正常 1异常）',
    error_msg varchar(2000) default '' comment '错误消息',
    oper_time datetime comment '操作时间',
    cost_time bigint (20) default 0 comment '消耗时间',
    primary key (oper_id),
    key idx_sys_oper_log_bt (business_type),
    key idx_sys_oper_log_s (status),
    key idx_sys_oper_log_ot (oper_time)
  ) engine = innodb auto_increment = 100 comment = '操作日志记录';

-- ----------------------------
-- 11、字典类型表
-- ----------------------------
drop table if exists sys_dict_type;

create table
  sys_dict_type (
    dict_id int not null auto_increment comment '字典主键',
    dict_name varchar(100) default '' comment '字典名称',
    dict_type varchar(100) default '' comment '字典类型',
    status char(1) default '0' comment '状态（0正常 1停用）',
    is_public char(1) default 'N' comment '是否公开（Y 公开游客可读 N 不公开）',
    dict_module varchar(50) default '' comment '所属模块（仅管理端分类展示）',
    create_by varchar(64) default '' comment '创建者',
    create_time datetime default current_timestamp comment '创建时间',
    update_by varchar(64) default '' comment '更新者',
    update_time datetime comment '更新时间',
    remark varchar(500) default null comment '备注',
    del_flag char(1) default '0' comment '删除标志（0代表存在 1代表删除）',
    primary key (dict_id),
    unique (dict_type)
  ) engine = innodb auto_increment = 100 comment = '字典类型表';

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    1,
    '用户性别',
    'sys_user_sex',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '用户性别列表',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    2,
    '菜单状态',
    'sys_show_hide',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '菜单状态列表',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    3,
    '系统开关',
    'sys_normal_disable',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '系统开关列表',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    4,
    '任务状态',
    'sys_job_status',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '任务状态列表',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    5,
    '任务分组',
    'sys_job_group',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '任务分组列表',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    6,
    '系统是否',
    'sys_yes_no',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '系统是否列表',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    7,
    '通知类型',
    'sys_notice_type',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '通知类型列表',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    8,
    '通知状态',
    'sys_notice_status',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '通知状态列表',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    9,
    '操作类型',
    'sys_oper_type',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '操作类型列表',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    10,
    '系统状态',
    'sys_common_status',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '登录状态列表',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    11,
    '文章发布状态',
    'post_article_publish_status',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '文章发布状态列表',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    12,
    '文章审核状态',
    'post_article_audit_status',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '文章审核状态列表',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    13,
    '专栏发布状态',
    'post_subject_publish_status',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '专栏发布状态列表',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    14,
    '专栏审核状态',
    'post_subject_audit_status',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '专栏审核状态列表',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    15,
    '文章来源',
    'post_article_source',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '文章来源列表',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    18,
    '举报目标类型',
    'post_report_target',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '举报目标类型列表（服务端流程能力按 dictValue 写死，扩值须同步后端枚举）',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    19,
    '举报理由',
    'post_report_reason',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '举报理由列表（运营可维护，扩值即生效无需发版）',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    20,
    '举报处理状态',
    'post_report_status',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '举报处理状态列表',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    21,
    '字典公开状态',
    'sys_dict_public',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '字典公开状态列表（文案/颜色可在管理端字典维护）',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    22,
    '反馈类型',
    'post_feedback_type',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '用户反馈类型列表（登录态专用不公开——游客不可提交反馈，管理端/用户弹窗均走登录态读取）',
    '0'
  );

insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    23,
    '反馈处理状态',
    'post_feedback_status',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '用户反馈处理状态列表',
    '0'
  );

-- 公开字典：游客（未登录）可读，其余字典仍要求登录
update sys_dict_type
set
  is_public = 'Y'
where
  dict_type in ('post_article_source', 'sys_user_sex', 'sys_normal_disable');

-- ----------------------------
-- 12、字典数据表
-- ----------------------------
drop table if exists sys_dict_data;

create table
  sys_dict_data (
    dict_code int not null auto_increment comment '字典编码',
    dict_sort int (4) default 0 comment '字典排序',
    dict_label varchar(100) default '' comment '字典标签',
    dict_value varchar(100) default '' comment '字典键值',
    dict_type varchar(100) default '' comment '字典类型',
    css_class varchar(100) default null comment '样式属性（其他样式扩展）',
    list_class varchar(100) default null comment '表格回显样式',
    is_default char(1) default 'N' comment '是否默认（Y是 N否）',
    status char(1) default '0' comment '状态（0正常 1停用）',
    create_by varchar(64) default '' comment '创建者',
    create_time datetime default current_timestamp comment '创建时间',
    update_by varchar(64) default '' comment '更新者',
    update_time datetime comment '更新时间',
    remark varchar(500) default null comment '备注',
    del_flag char(1) default '0' comment '删除标志（0代表存在 1代表删除）',
    primary key (dict_code)
  ) engine = innodb auto_increment = 100 comment = '字典数据表';

insert into
  sys_dict_data
values
  (
    1,
    1,
    '男',
    '0',
    'sys_user_sex',
    '',
    '',
    'Y',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '性别男',
    '0'
  );

insert into
  sys_dict_data
values
  (
    2,
    2,
    '女',
    '1',
    'sys_user_sex',
    '',
    '',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '性别女',
    '0'
  );

insert into
  sys_dict_data
values
  (
    3,
    3,
    '未知',
    '2',
    'sys_user_sex',
    '',
    '',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '性别未知',
    '0'
  );

insert into
  sys_dict_data
values
  (
    4,
    1,
    '显示',
    '0',
    'sys_show_hide',
    '',
    'primary',
    'Y',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '显示菜单',
    '0'
  );

insert into
  sys_dict_data
values
  (
    5,
    2,
    '隐藏',
    '1',
    'sys_show_hide',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '隐藏菜单',
    '0'
  );

insert into
  sys_dict_data
values
  (
    6,
    1,
    '正常',
    '0',
    'sys_normal_disable',
    '',
    'primary',
    'Y',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '正常状态',
    '0'
  );

insert into
  sys_dict_data
values
  (
    7,
    2,
    '停用',
    '1',
    'sys_normal_disable',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '停用状态',
    '0'
  );

insert into
  sys_dict_data
values
  (
    8,
    1,
    '正常',
    '0',
    'sys_job_status',
    '',
    'primary',
    'Y',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '正常状态',
    '0'
  );

insert into
  sys_dict_data
values
  (
    9,
    2,
    '暂停',
    '1',
    'sys_job_status',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '停用状态',
    '0'
  );

insert into
  sys_dict_data
values
  (
    10,
    1,
    '默认',
    'DEFAULT',
    'sys_job_group',
    '',
    '',
    'Y',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '默认分组',
    '0'
  );

insert into
  sys_dict_data
values
  (
    11,
    2,
    '系统',
    'SYSTEM',
    'sys_job_group',
    '',
    '',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '系统分组',
    '0'
  );

insert into
  sys_dict_data
values
  (
    12,
    1,
    '是',
    'Y',
    'sys_yes_no',
    '',
    'primary',
    'Y',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '系统默认是',
    '0'
  );

insert into
  sys_dict_data
values
  (
    13,
    2,
    '否',
    'N',
    'sys_yes_no',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '系统默认否',
    '0'
  );

insert into
  sys_dict_data
values
  (
    14,
    1,
    '通知',
    '1',
    'sys_notice_type',
    '',
    'warning',
    'Y',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '通知',
    '0'
  );

insert into
  sys_dict_data
values
  (
    15,
    2,
    '公告',
    '2',
    'sys_notice_type',
    '',
    'success',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '公告',
    '0'
  );

insert into
  sys_dict_data
values
  (
    66,
    3,
    '举报反馈',
    '3',
    'sys_notice_type',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '举报反馈（sys_notice.user_id 定向私密通知，业务侧程序写入）',
    '0'
  );

insert into
  sys_dict_data
values
  (
    75,
    4,
    '反馈回复',
    '4',
    'sys_notice_type',
    '',
    'warning',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '反馈回复（sys_notice.user_id 定向私密通知，业务侧程序写入——用户反馈回复/关闭通知）',
    '0'
  );

insert into
  sys_dict_data
values
  (
    16,
    1,
    '正常',
    '0',
    'sys_notice_status',
    '',
    'primary',
    'Y',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '正常状态',
    '0'
  );

insert into
  sys_dict_data
values
  (
    17,
    2,
    '关闭',
    '1',
    'sys_notice_status',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '关闭状态',
    '0'
  );

insert into
  sys_dict_data
values
  (
    18,
    99,
    '其他',
    '0',
    'sys_oper_type',
    '',
    'info',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '其他操作',
    '0'
  );

insert into
  sys_dict_data
values
  (
    19,
    1,
    '新增',
    '1',
    'sys_oper_type',
    '',
    'info',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '新增操作',
    '0'
  );

insert into
  sys_dict_data
values
  (
    20,
    2,
    '修改',
    '2',
    'sys_oper_type',
    '',
    'info',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '修改操作',
    '0'
  );

insert into
  sys_dict_data
values
  (
    21,
    3,
    '删除',
    '3',
    'sys_oper_type',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '删除操作',
    '0'
  );

insert into
  sys_dict_data
values
  (
    22,
    4,
    '授权',
    '4',
    'sys_oper_type',
    '',
    'primary',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '授权操作',
    '0'
  );

insert into
  sys_dict_data
values
  (
    23,
    5,
    '导出',
    '5',
    'sys_oper_type',
    '',
    'warning',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '导出操作',
    '0'
  );

insert into
  sys_dict_data
values
  (
    24,
    6,
    '导入',
    '6',
    'sys_oper_type',
    '',
    'warning',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '导入操作',
    '0'
  );

insert into
  sys_dict_data
values
  (
    25,
    7,
    '强退',
    '7',
    'sys_oper_type',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '强退操作',
    '0'
  );

insert into
  sys_dict_data
values
  (
    26,
    8,
    '生成代码',
    '8',
    'sys_oper_type',
    '',
    'warning',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '生成操作',
    '0'
  );

insert into
  sys_dict_data
values
  (
    27,
    9,
    '清空数据',
    '9',
    'sys_oper_type',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '清空操作',
    '0'
  );

insert into
  sys_dict_data
values
  (
    28,
    1,
    '成功',
    '0',
    'sys_common_status',
    '',
    'primary',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '正常状态',
    '0'
  );

insert into
  sys_dict_data
values
  (
    29,
    2,
    '失败',
    '1',
    'sys_common_status',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '停用状态',
    '0'
  );

-- 文章发布状态（包含草稿）
insert into
  sys_dict_data
values
  (
    30,
    1,
    '草稿',
    '0',
    'post_article_publish_status',
    '',
    'info',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '文章-发布状态-草稿',
    '0'
  );

insert into
  sys_dict_data
values
  (
    31,
    2,
    '待发布',
    '1',
    'post_article_publish_status',
    '',
    'warning',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '文章-发布状态-待发布',
    '0'
  );

insert into
  sys_dict_data
values
  (
    32,
    3,
    '已发布',
    '2',
    'post_article_publish_status',
    '',
    'success',
    'Y',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '文章-发布状态-已发布',
    '0'
  );

insert into
  sys_dict_data
values
  (
    33,
    4,
    '已下架',
    '3',
    'post_article_publish_status',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '文章-发布状态-已下架',
    '0'
  );

-- 文章审核状态
insert into
  sys_dict_data
values
  (
    34,
    1,
    '未提交',
    '0',
    'post_article_audit_status',
    '',
    'info',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '文章-审核状态-未提交',
    '0'
  );

insert into
  sys_dict_data
values
  (
    35,
    2,
    '审核中',
    '1',
    'post_article_audit_status',
    '',
    'warning',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '文章-审核状态-审核中',
    '0'
  );

insert into
  sys_dict_data
values
  (
    36,
    3,
    '审核通过',
    '2',
    'post_article_audit_status',
    '',
    'success',
    'Y',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '文章-审核状态-审核通过',
    '0'
  );

insert into
  sys_dict_data
values
  (
    37,
    4,
    '审核拒绝',
    '3',
    'post_article_audit_status',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '文章-审核状态-审核拒绝',
    '0'
  );

-- 专栏发布状态（无草稿）
insert into
  sys_dict_data
values
  (
    38,
    1,
    '待发布',
    '1',
    'post_subject_publish_status',
    '',
    'warning',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '专栏-发布状态-待发布',
    '0'
  );

insert into
  sys_dict_data
values
  (
    39,
    2,
    '已发布',
    '2',
    'post_subject_publish_status',
    '',
    'success',
    'Y',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '专栏-发布状态-已发布',
    '0'
  );

insert into
  sys_dict_data
values
  (
    40,
    3,
    '已下架',
    '3',
    'post_subject_publish_status',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '专栏-发布状态-已下架',
    '0'
  );

-- 专栏审核状态
insert into
  sys_dict_data
values
  (
    41,
    1,
    '未提交',
    '0',
    'post_subject_audit_status',
    '',
    'info',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '专栏-审核状态-未提交',
    '0'
  );

insert into
  sys_dict_data
values
  (
    42,
    2,
    '审核中',
    '1',
    'post_subject_audit_status',
    '',
    'warning',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '专栏-审核状态-审核中',
    '0'
  );

insert into
  sys_dict_data
values
  (
    43,
    3,
    '审核通过',
    '2',
    'post_subject_audit_status',
    '',
    'success',
    'Y',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '专栏-审核状态-审核通过',
    '0'
  );

insert into
  sys_dict_data
values
  (
    44,
    4,
    '审核拒绝',
    '3',
    'post_subject_audit_status',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '专栏-审核状态-审核拒绝',
    '0'
  );

-- 文章来源
insert into
  sys_dict_data
values
  (
    45,
    1,
    '原创',
    '0',
    'post_article_source',
    '',
    'primary',
    'Y',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '文章-来源-原创',
    '0'
  );

insert into
  sys_dict_data
values
  (
    46,
    2,
    '转载',
    '1',
    'post_article_source',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '文章-来源-转载',
    '0'
  );

insert into
  sys_dict_data
values
  (
    48,
    4,
    '翻译',
    '2',
    'post_article_source',
    '',
    'warning',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '文章-来源-翻译',
    '0'
  );

insert into
  sys_dict_data
values
  (
    49,
    5,
    '整理',
    '3',
    'post_article_source',
    '',
    'info',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '文章-来源-整理',
    '0'
  );

-- 收藏集可见性字典（post_collection.visibility：0 公开 1 私密，文案/颜色可在管理端字典维护）
insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    16,
    '收藏集可见性',
    'sys_collection_visibility',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '收藏集可见性列表',
    '0'
  );

insert into
  sys_dict_data
values
  (
    50,
    1,
    '公开',
    '0',
    'sys_collection_visibility',
    '',
    'success',
    'Y',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '收藏集-可见性-公开',
    '0'
  );

insert into
  sys_dict_data
values
  (
    51,
    2,
    '私密',
    '1',
    'sys_collection_visibility',
    '',
    'info',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '收藏集-可见性-私密',
    '0'
  );

-- 收藏集类型字典（is_default 推导：'1' 默认 / '0' 自建，文案/颜色可在管理端字典维护）
insert into
  sys_dict_type
  (dict_id, dict_name, dict_type, status, create_by, create_time, update_by, update_time, remark, del_flag)
values
  (
    17,
    '收藏集类型',
    'sys_collection_type',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '收藏集类型列表（默认/自建）',
    '0'
  );

insert into
  sys_dict_data
values
  (
    52,
    1,
    '默认',
    '1',
    'sys_collection_type',
    '',
    'warning',
    'Y',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '收藏集-类型-默认',
    '0'
  );

insert into
  sys_dict_data
values
  (
    53,
    2,
    '自建',
    '0',
    'sys_collection_type',
    '',
    'primary',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '收藏集-类型-自建',
    '0'
  );

insert into
  sys_dict_data
values
  (
    54,
    1,
    '举报文章',
    'post',
    'post_report_target',
    '',
    'primary',
    'Y',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '举报目标-文章',
    '0'
  );

insert into
  sys_dict_data
values
  (
    55,
    2,
    '举报用户',
    'user',
    'post_report_target',
    '',
    'warning',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '举报目标-用户',
    '0'
  );

insert into
  sys_dict_data
values
  (
    56,
    1,
    '抄袭搬运',
    'plagiarism',
    'post_report_reason',
    '',
    '',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '举报理由-抄袭搬运',
    '0'
  );

insert into
  sys_dict_data
values
  (
    57,
    2,
    '涉政违规',
    'political',
    'post_report_reason',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '举报理由-涉政违规',
    '0'
  );

insert into
  sys_dict_data
values
  (
    58,
    3,
    '血腥暴力',
    'violence',
    'post_report_reason',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '举报理由-血腥暴力',
    '0'
  );

insert into
  sys_dict_data
values
  (
    59,
    4,
    '色情低俗',
    'porn',
    'post_report_reason',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '举报理由-色情低俗',
    '0'
  );

insert into
  sys_dict_data
values
  (
    60,
    5,
    '广告引流',
    'spam',
    'post_report_reason',
    '',
    'warning',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '举报理由-广告引流',
    '0'
  );

insert into
  sys_dict_data
values
  (
    61,
    6,
    '人身攻击',
    'harassment',
    'post_report_reason',
    '',
    'warning',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '举报理由-人身攻击',
    '0'
  );

insert into
  sys_dict_data
values
  (
    62,
    7,
    '其他',
    'other',
    'post_report_reason',
    '',
    'info',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '举报理由-其他',
    '0'
  );

insert into
  sys_dict_data
values
  (
    63,
    1,
    '待处理',
    '0',
    'post_report_status',
    '',
    'warning',
    'Y',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '举报状态-待处理',
    '0'
  );

insert into
  sys_dict_data
values
  (
    64,
    2,
    '成立',
    '1',
    'post_report_status',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '举报状态-成立',
    '0'
  );

insert into
  sys_dict_data
values
  (
    65,
    3,
    '驳回',
    '2',
    'post_report_status',
    '',
    'info',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '举报状态-驳回',
    '0'
  );

insert into
  sys_dict_data
values
  (
    67,
    1,
    '公开',
    'Y',
    'sys_dict_public',
    '',
    'success',
    'Y',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '字典公开状态-公开',
    '0'
  );

insert into
  sys_dict_data
values
  (
    68,
    2,
    '不公开',
    'N',
    'sys_dict_public',
    '',
    'info',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '字典公开状态-不公开',
    '0'
  );

insert into
  sys_dict_data
values
  (
    69,
    1,
    '功能建议',
    '1',
    'post_feedback_type',
    '',
    'primary',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '反馈类型-功能建议',
    '0'
  );

insert into
  sys_dict_data
values
  (
    70,
    2,
    '问题反馈',
    '2',
    'post_feedback_type',
    '',
    'danger',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '反馈类型-问题反馈',
    '0'
  );

insert into
  sys_dict_data
values
  (
    71,
    3,
    '其他',
    '3',
    'post_feedback_type',
    '',
    'info',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '反馈类型-其他',
    '0'
  );

insert into
  sys_dict_data
values
  (
    72,
    1,
    '待处理',
    '0',
    'post_feedback_status',
    '',
    'warning',
    'Y',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '反馈状态-待处理',
    '0'
  );

insert into
  sys_dict_data
values
  (
    73,
    2,
    '已回复',
    '1',
    'post_feedback_status',
    '',
    'success',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '反馈状态-已回复（sys_notice 定向通知 noticeType=4）',
    '0'
  );

insert into
  sys_dict_data
values
  (
    74,
    3,
    '已关闭',
    '2',
    'post_feedback_status',
    '',
    'info',
    'N',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '反馈状态-已关闭（终态不可重复处理）',
    '0'
  );

-- 字典模块：仅用于管理端左侧树分组展示，不参与任何接口读取；未命中的字典归入「未分类」
update sys_dict_type
set
  dict_module = '系统管理'
where
  dict_type in (
    'sys_user_sex',
    'sys_show_hide',
    'sys_normal_disable',
    'sys_job_status',
    'sys_job_group',
    'sys_yes_no',
    'sys_notice_type',
    'sys_notice_status',
    'sys_oper_type',
    'sys_common_status',
    'sys_dict_public'
  );

update sys_dict_type
set
  dict_module = '内容管理'
where
  dict_type in (
    'post_article_publish_status',
    'post_article_audit_status',
    'post_article_source',
    'post_subject_publish_status',
    'post_subject_audit_status',
    'sys_collection_visibility',
    'sys_collection_type'
  );

update sys_dict_type
set
  dict_module = '社区互动'
where
  dict_type in ('post_report_target', 'post_report_reason', 'post_report_status', 'post_feedback_type', 'post_feedback_status');

-- ----------------------------
-- 13、参数配置表
-- ----------------------------
drop table if exists sys_config;

create table
  sys_config (
    config_id int (5) not null auto_increment comment '参数主键',
    config_name varchar(100) default '' comment '参数名称',
    config_key varchar(100) default '' comment '参数键名',
    config_value varchar(500) default '' comment '参数键值',
    config_type char(1) default 'N' comment '系统内置（Y是 N否）',
    create_by varchar(64) default '' comment '创建者',
    create_time datetime default current_timestamp comment '创建时间',
    update_by varchar(64) default '' comment '更新者',
    update_time datetime comment '更新时间',
    remark varchar(500) default null comment '备注',
    status char(1) default '0' comment '状态（0正常 1停用）',
    del_flag char(1) default '0' comment '删除标志（0代表存在 1代表删除）',
    primary key (config_id)
  ) engine = innodb auto_increment = 100 comment = '参数配置表';

insert into
  sys_config
values
  (
    1,
    '主框架页-默认皮肤样式名称',
    'sys.index.skinName',
    'skin-blue',
    'Y',
    'admin',
    sysdate(),
    '',
    null,
    '蓝色 skin-blue、绿色 skin-green、紫色 skin-purple、红色 skin-red、黄色 skin-yellow',
    '0',
    '0'
  );

insert into
  sys_config
values
  (
    2,
    '用户管理-账号初始密码',
    'sys.user.initPassword',
    '123456',
    'Y',
    'admin',
    sysdate(),
    '',
    null,
    '初始化密码 123456',
    '0',
    '0'
  );

insert into
  sys_config
values
  (
    3,
    '主框架页-侧边栏主题',
    'sys.index.sideTheme',
    'theme-dark',
    'Y',
    'admin',
    sysdate(),
    '',
    null,
    '深色主题theme-dark，浅色主题theme-light',
    '0',
    '0'
  );

insert into
  sys_config
values
  (
    4,
    '账号自助-验证码开关',
    'sys.account.captchaEnabled',
    'true',
    'Y',
    'admin',
    sysdate(),
    '',
    null,
    '是否开启验证码功能（true开启，false关闭）',
    '0',
    '0'
  );

insert into
  sys_config
values
  (
    5,
    '账号自助-是否开启用户注册功能',
    'sys.account.registerUser',
    'false',
    'Y',
    'admin',
    sysdate(),
    '',
    null,
    '是否开启注册用户功能（true开启，false关闭）',
    '0',
    '0'
  );

insert into
  sys_config
values
  (
    6,
    '用户登录-黑名单列表',
    'sys.login.blackIPList',
    '',
    'Y',
    'admin',
    sysdate(),
    '',
    null,
    '设置登录IP黑名单限制，多个匹配项以;分隔，支持匹配（*通配、网段）',
    '0',
    '0'
  );

-- ----------------------------
-- 14、系统访问记录
-- ----------------------------
drop table if exists sys_logininfor;

create table
  sys_logininfor (
    info_id int not null auto_increment comment '访问ID',
    user_name varchar(50) default '' comment '用户账号',
    ipaddr varchar(128) default '' comment '登录IP地址',
    login_location varchar(255) default '' comment '登录地点',
    browser varchar(50) default '' comment '浏览器类型',
    os varchar(50) default '' comment '操作系统',
    status char(1) default '0' comment '登录状态（0成功 1失败）',
    msg varchar(255) default '' comment '提示消息',
    login_time datetime comment '访问时间',
    create_by varchar(64) default '' comment '创建者',
    create_time datetime default current_timestamp comment '创建时间',
    update_by varchar(64) default '' comment '更新者',
    update_time datetime comment '更新时间',
    remark varchar(500) default null comment '备注',
    del_flag char(1) default '0' comment '删除标志（0代表存在 1代表删除）',
    primary key (info_id),
    key idx_sys_logininfor_s (status),
    key idx_sys_logininfor_lt (login_time)
  ) engine = innodb auto_increment = 100 comment = '系统访问记录';

-- ----------------------------
-- 15、定时任务调度表
-- ----------------------------
drop table if exists sys_job;

create table
  sys_job (
    job_id int not null auto_increment comment '任务ID',
    job_name varchar(64) default '' comment '任务名称',
    job_group varchar(64) default 'DEFAULT' comment '任务组名',
    invoke_target varchar(500) not null comment '调用目标字符串',
    cron_expression varchar(255) default '' comment 'cron执行表达式',
    misfire_policy varchar(20) default '3' comment '计划执行错误策略（1立即执行 2执行一次 3放弃执行）',
    concurrent char(1) default '1' comment '是否并发执行（0允许 1禁止）',
    status char(1) default '0' comment '状态（0正常 1暂停）',
    create_by varchar(64) default '' comment '创建者',
    create_time datetime default current_timestamp comment '创建时间',
    update_by varchar(64) default '' comment '更新者',
    update_time datetime comment '更新时间',
    remark varchar(500) default '' comment '备注信息',
    primary key (job_id, job_name, job_group)
  ) engine = innodb auto_increment = 100 comment = '定时任务调度表';

insert into
  sys_job
values
  (
    1,
    '系统默认（无参）',
    'DEFAULT',
    'task.noParams',
    '0/10 * * * * ?',
    '3',
    '1',
    '1',
    'admin',
    sysdate(),
    '',
    null,
    ''
  );

insert into
  sys_job
values
  (
    2,
    '系统默认（有参）',
    'DEFAULT',
    'task.params(\'ry\')',
    '0/15 * * * * ?',
    '3',
    '1',
    '1',
    'admin',
    sysdate(),
    '',
    null,
    ''
  );

insert into
  sys_job
values
  (
    3,
    '系统默认（多参）',
    'DEFAULT',
    'task.multipleParams(\'ry\', true, 2000L, 316.50D, 100)',
    '0/20 * * * * ?',
    '3',
    '1',
    '1',
    'admin',
    sysdate(),
    '',
    null,
    ''
  );

-- ----------------------------
-- 16、定时任务调度日志表
-- ----------------------------
drop table if exists sys_job_log;

create table
  sys_job_log (
    job_log_id int not null auto_increment comment '任务日志ID',
    job_name varchar(64) not null comment '任务名称',
    job_group varchar(64) not null comment '任务组名',
    invoke_target varchar(500) not null comment '调用目标字符串',
    job_message varchar(500) comment '日志信息',
    status char(1) default '0' comment '执行状态（0正常 1失败）',
    exception_info varchar(2000) default '' comment '异常信息',
    create_time datetime default current_timestamp comment '创建时间',
    primary key (job_log_id)
  ) engine = innodb comment = '定时任务调度日志表';

-- ----------------------------
-- 17、通知公告表
-- ----------------------------
drop table if exists sys_notice;

create table
  sys_notice (
    notice_id int (4) not null auto_increment comment '公告ID',
    notice_title varchar(80) not null comment '公告标题',
    notice_type char(1) not null comment '公告类型（1通知 2公告 3举报反馈）',
    notice_content longtext default null comment '公告内容',
    status char(1) default '0' comment '公告状态（0正常 1关闭）',
    create_by varchar(64) default '' comment '创建者',
    create_time datetime default current_timestamp comment '创建时间',
    update_by varchar(64) default '' comment '更新者',
    update_time datetime comment '更新时间',
    remark varchar(255) default null comment '备注',
    del_flag char(1) default '0' comment '删除标志（0代表存在 1代表删除）',
    -- 定向接收人：null 全员公告；非 null 仅该用户可见的私密通知（举报反馈等，业务侧程序写入）；
    -- 列置末尾以保持既有位置式种子兼容
    user_id int default null comment '定向接收人用户ID（null 全员公告，非 null 仅该用户可见）',
    primary key (notice_id)
  ) engine = innodb auto_increment = 10 comment = '通知公告表';

-- ----------------------------
-- 初始化-公告信息表数据
-- ----------------------------
insert into
  sys_notice
values
  (
    '1',
    '温馨提醒：2018-07-01 nest-admin新版本发布啦',
    '2',
    '新版本内容',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '管理员',
    '0',
    null
  );

insert into
  sys_notice
values
  (
    '2',
    '维护通知：2018-07-01 nest-admin系统凌晨维护',
    '1',
    '维护内容',
    '0',
    'admin',
    sysdate(),
    '',
    null,
    '管理员',
    '0',
    null
  );

-- ----------------------------
-- 18、文件上传记录
-- ----------------------------
drop table if exists sys_upload;

create table
  sys_upload (
    upload_id varchar(255) not null comment '任务 Id',
    size int not null comment '文件大小',
    file_name varchar(255) not null comment '文件路径',
    new_file_name varchar(255) not null comment '文件名',
    url varchar(255) not null comment '文件地址',
    ext varchar(255) default null comment '拓展名',
    status char(1) default '0' comment '状态',
    del_flag char(1) default '0' comment '删除标志',
    create_by varchar(64) default '' comment '创建者',
    create_time datetime default current_timestamp comment '创建时间',
    update_by varchar(64) default '' comment '更新者',
    update_time datetime default current_timestamp on update current_timestamp comment '更新时间',
    remark varchar(500) default null comment '备注',
    primary key (upload_id)
  ) engine = innodb comment = '文件上传记录';

-- ----------------------------
-- 19、文章库
-- ----------------------------
drop table if exists post_article;

create table
  post_article (
    id int not null auto_increment comment '文章 id',
    title varchar(64) not null comment '文章标题',
    `desc` varchar(255) default null comment '文章简介',
    subject_id int not null comment '专栏 id',
    user_id int not null comment '作者用户ID',
    content longtext default null comment '文章内容',
    cover varchar(255) default null comment '封面',
    author varchar(64) default null comment '作者昵称',
    source char(1) default '0' comment '文章来源（0 原创 1 转载 2 翻译 3 整理）',
    publish_time datetime default null comment '发布时间',
    like_num int default '0' comment '点赞数',
    read_num int default '0' comment '阅读数',
    comment_num int default '0' comment '评论数',
    collect_num int default '0' comment '收藏数',
    publish_status char(1) default '0' comment '发布状态（0 草稿 1 待发布 2 已发布 3 已下架）',
    audit_status char(1) default '0' comment '审核状态（0 未提交 1 审核中 2 审核通过 3 审核拒绝）',
    scheduled_publish_time datetime default null comment '定时发布时间',
    audit_user_id int default null comment '审核人ID',
    audit_time datetime default null comment '审核时间',
    audit_remark varchar(500) default null comment '审核备注',
    sort int (11) default null comment '排序',
    create_by varchar(64) default '' comment '创建者',
    create_time datetime default current_timestamp comment '创建时间',
    update_by varchar(64) default '' comment '更新者',
    update_time datetime default current_timestamp on update current_timestamp comment '更新时间',
    remark varchar(500) default null comment '备注',
    del_flag char(1) default '0' comment '删除标志（0 代表存在 1 代表删除）',
    primary key (id),
    key idx_user_id (user_id),
    key idx_subject_id (subject_id),
    key idx_publish_status (publish_status),
    key idx_audit_status (audit_status),
    key idx_scheduled_publish_time (scheduled_publish_time)
  ) engine = innodb comment = '文章库';

-- ----------------------------
-- 20、专栏库
-- ----------------------------
drop table if exists post_subject;

create table
  post_subject (
    id int not null auto_increment comment '专栏 id',
    title varchar(64) not null comment '专栏标题',
    `desc` varchar(255) default null comment '专栏简介',
    user_id int not null comment '创建者用户ID',
    cover varchar(255) default null comment '专栏封面',
    author varchar(64) default null comment '作者昵称',
    article_count int default '0' comment '文章数量',
    publish_status char(1) default '0' comment '发布状态（0 草稿 1 待发布 2 已发布 3 已下架）',
    audit_status char(1) default '0' comment '审核状态（0 未提交 1 审核中 2 审核通过 3 审核拒绝）',
    scheduled_publish_time datetime default null comment '定时发布时间',
    audit_user_id int default null comment '审核人ID',
    audit_time datetime default null comment '审核时间',
    audit_remark varchar(500) default null comment '审核备注',
    sort int (11) default null comment '排序',
    status char(1) default '0' comment '状态（0 正常 1 停用）',
    create_by varchar(64) default '' comment '创建者',
    create_time datetime default current_timestamp comment '创建时间',
    update_by varchar(64) default '' comment '更新者',
    update_time datetime default current_timestamp on update current_timestamp comment '更新时间',
    remark varchar(500) default null comment '备注',
    del_flag char(1) default '0' comment '删除标志（0 代表存在 1 代表删除）',
    primary key (id),
    key idx_user_id (user_id),
    key idx_publish_status (publish_status),
    key idx_audit_status (audit_status),
    key idx_scheduled_publish_time (scheduled_publish_time)
  ) engine = innodb comment = '专栏库';

-- ----------------------------
-- 21、点赞库
-- ----------------------------
drop table if exists post_like;

create table
  post_like (
    id int not null auto_increment comment '点赞 id',
    article_id int not null comment '文章 id',
    user_id int not null comment '点赞用户ID',
    -- datetime(3)：互动通知未读水位按 create_time > read_time 比较，秒级粒度会使 markRead 同秒互动永久漏红标
    create_time datetime(3) default current_timestamp(3) comment '点赞时间（毫秒粒度，互动通知水位比较列）',
    primary key (id),
    unique key uk_article_user (article_id, user_id),
    key idx_user_id (user_id)
  ) engine = innodb comment = '点赞库';

-- ----------------------------
-- 22、评论库
-- ----------------------------
drop table if exists post_comment;

create table
  post_comment (
    id int not null auto_increment comment '评论 id',
    article_id int not null comment '文章 id',
    user_id int not null comment '评论用户ID',
    content varchar(500) not null comment '评论内容',
    parent_id int default null comment '被回复的评论 id（根评论为 null）',
    reply_user_id int default null comment '被回复评论的作者用户 id',
    -- datetime(3)：互动通知未读水位按 create_time > read_time 比较，秒级粒度会使 markRead 同秒互动永久漏红标
    create_time datetime(3) default current_timestamp(3) comment '评论时间（毫秒粒度，互动通知水位比较列）',
    primary key (id),
    key idx_article_id (article_id),
    key idx_user_id (user_id),
    key idx_parent_id (parent_id),
    key idx_reply_user_id (reply_user_id)
  ) engine = innodb comment = '评论库';

-- ----------------------------
-- 23、通知已读水位库
-- ----------------------------
drop table if exists post_notify_read;

create table
  post_notify_read (
    user_id int not null comment '用户 id',
    category varchar(16) not null comment '通知分类（comment 评论 / like 点赞 / collect 收藏）',
    -- datetime(3)：水位必须与互动 create_time 同粒度，markRead 即时推至当前毫秒；秒级粒度下同秒互动会被严格 > 永久排除
    read_time datetime(3) default current_timestamp(3) comment '最后已读时间（毫秒粒度，作互动未读水位）',
    primary key (user_id, category)
  ) engine = innodb comment = '通知已读水位库';

-- ----------------------------
-- 24、收藏集库
-- ----------------------------
drop table if exists post_collection;

create table
  post_collection (
    id int not null auto_increment comment '收藏集 id',
    user_id int not null comment '创建者用户ID',
    name varchar(32) not null comment '收藏集名称',
    `desc` varchar(255) default null comment '收藏集简介',
    visibility char(1) default '0' comment '可见性（0 公开 1 私密）',
    is_default char(1) default null comment '默认收藏夹标记（1 默认，null 非默认；注册时创建，不可删除）',
    article_count int default '0' comment '收录文章数量',
    subscriber_count int default '0' comment '订阅人数',
    create_time datetime default current_timestamp comment '创建时间',
    update_time datetime default current_timestamp on update current_timestamp comment '更新时间',
    del_flag char(1) default '0' comment '删除标志（0 代表存在 1 代表删除）',
    primary key (id),
    unique key uk_user_default (user_id, is_default),
    key idx_user_id (user_id)
  ) engine = innodb comment = '收藏集库';

-- ----------------------------
-- 25、收藏集文章关联库
-- ----------------------------
drop table if exists post_collection_article;

create table
  post_collection_article (
    id int not null auto_increment comment '收藏记录 id',
    collection_id int not null comment '收藏集 id',
    article_id int not null comment '文章 id',
    user_id int not null comment '收藏人用户ID（即收藏集创建者）',
    -- datetime(3)：互动通知未读水位按 create_time > read_time 比较，秒级粒度会使 markRead 同秒互动永久漏红标
    create_time datetime(3) default current_timestamp(3) comment '收藏时间（毫秒粒度，互动通知水位比较列）',
    primary key (id),
    unique key uk_collection_article (collection_id, article_id),
    key idx_user_id (user_id),
    key idx_article_id (article_id)
  ) engine = innodb comment = '收藏集文章关联库';

-- ----------------------------
-- 26、收藏集订阅库
-- ----------------------------
drop table if exists post_collection_sub;

create table
  post_collection_sub (
    id int not null auto_increment comment '订阅记录 id',
    collection_id int not null comment '收藏集 id',
    user_id int not null comment '订阅用户ID',
    create_time datetime default current_timestamp comment '订阅时间',
    primary key (id),
    unique key uk_collection_user (collection_id, user_id),
    key idx_user_id (user_id)
  ) engine = innodb comment = '收藏集订阅库';

-- ----------------------------
-- 27、关注库
-- ----------------------------
drop table if exists post_follow;

create table
  post_follow (
    id int not null auto_increment comment '关注 id',
    follower_id int not null comment '关注人（粉丝）用户ID',
    following_id int not null comment '被关注用户ID',
    -- datetime(3)：互动通知未读水位按 create_time > read_time 比较，秒级粒度会使 markRead 同秒互动永久漏红标
    create_time datetime(3) default current_timestamp(3) comment '关注时间（毫秒粒度，互动通知水位比较列）',
    primary key (id),
    unique key uk_follower_following (follower_id, following_id),
    key idx_following_id (following_id)
  ) engine = innodb comment = '关注库';

-- ----------------------------
-- 28、举报库
-- ----------------------------
drop table if exists post_report;

create table
  post_report (
    id int not null auto_increment comment '举报 id',
    target_type varchar(8) not null comment '举报目标类型（post 文章 / user 用户）',
    target_id int not null comment '举报目标ID（post=文章 id，user=用户 id）',
    -- 举报时快照（文章标题+简介 / 用户昵称）：目标编辑/删除后管理端仍可还原被举报内容
    target_snapshot varchar(500) default null comment '举报时的目标快照（文章标题+简介 / 用户昵称）',
    reporter_id int not null comment '举报人用户ID',
    reason_type varchar(32) not null comment '举报理由（字典 post_report_reason 的 dictValue）',
    reason_content varchar(500) default null comment '补充说明（可空，抄袭出处等）',
    status char(1) default '0' comment '处理状态（0 待处理 1 成立 2 驳回）',
    handle_action varchar(16) default null comment '处置动作（unpublish 下架文章 / disableUser 停用用户，无动作 null）',
    handle_remark varchar(255) default null comment '处理备注',
    handler_id int default null comment '处理人用户ID',
    -- 待处理标记：待处理=1、处理完成置 NULL。MySQL 唯一索引对含 NULL 的行不查重，
    -- 与 (reporter, target) 组成 uk_reporter_pending 即「同一目标同时至多一条待处理举报」——
    -- 待处理中不可重复举报（服务端 INSERT IGNORE 兜底并发），处理完成后可再次举报、历史多行共存
    pending_flag int default null comment '待处理标记（待处理=1，处理完成置 NULL）',
    handle_time datetime(3) default null comment '处理时间（毫秒粒度）',
    create_time datetime(3) default current_timestamp(3) comment '举报时间（毫秒粒度，24h 频控统计列）',
    primary key (id),
    unique key uk_reporter_pending (reporter_id, target_type, target_id, pending_flag),
    key idx_target_status (target_type, target_id, status),
    key idx_reporter_create (reporter_id, create_time)
  ) engine = innodb comment = '举报库';

-- ----------------------------
-- 29、用户反馈库
-- ----------------------------
drop table if exists post_feedback;

create table
  post_feedback (
    id int not null auto_increment comment '反馈 id',
    user_id int not null comment '提交人用户ID（登录身份，无 contact 字段）',
    type char(1) not null comment '反馈类型（1 功能建议 2 问题反馈 3 其他，字典 post_feedback_type）',
    content varchar(500) not null comment '反馈内容（1-500 字）',
    -- 截图附件：JSON 数组字符串（/profile/ 相对 URL，服务端 DTO 校验前缀与张数）；不建关联表，只随单据读写
    attachments varchar(1000) default null comment '截图附件（JSON 数组字符串，/profile/ 相对 URL，至多 3 张，无附件 null）',
    status char(1) default '0' comment '处理状态（0 待处理 1 已回复 2 已关闭）',
    reply_content varchar(500) default null comment '管理员回复内容（回复必填，关闭可空说明）',
    admin_id int default null comment '处理人用户ID（未处理 null）',
    -- del_flag 仅建表口径完整性保留：反馈不做软删，管理端删除为物理删除（同 post_report 口径）
    del_flag char(1) default '0' comment '删除标志（0代表存在 1代表删除，业务不软删）',
    -- reply_time 毫秒粒度：处理结论落库时间（通知投递依据）；create_time 毫秒粒度：24h 频控统计列（同 post_report 口径）
    reply_time datetime(3) default null comment '处理时间（毫秒粒度）',
    create_time datetime(3) default current_timestamp(3) comment '提交时间（毫秒粒度，24h 频控统计列）',
    primary key (id),
    key idx_user_id (user_id),
    key idx_status (status)
  ) engine = innodb comment = '用户反馈库';

-- ----------------------------
-- 30、工作台待办逐条已读库
-- ----------------------------
drop table if exists post_workbench_read;

create table
  post_workbench_read (
    id int not null auto_increment comment '自增 id',
    user_id int not null comment '标记人用户ID',
    -- source 与工作台源定义（TODO_SOURCE_DEFS）对齐：report/feedback，文章审核上线时扩展
    source varchar(20) not null comment '待办源（report 举报 / feedback 反馈）',
    source_id int not null comment '源记录 id（post_report.id / post_feedback.id）',
    read_time datetime(3) default current_timestamp(3) comment '标记时间（毫秒粒度，同 post_feedback 口径）',
    primary key (id),
    -- 幂等：同一人对同一记录至多一行标记（INSERT IGNORE 防重复插入）
    unique key uk_user_source_record (user_id, source, source_id)
  ) engine = innodb comment = '工作台待办逐条已读库';

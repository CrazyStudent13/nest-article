<template>
  <div class="app-container home">
    <el-card class="welcome-card">
      <div class="welcome-body">
        <h2 class="welcome-title">{{ greeting }}，欢迎回到 nest-acticle 管理后台</h2>
        <p class="welcome-desc">博客平台内容管理系统：文章 / 专栏 / 评论 / 点赞 / 用户与系统设置均可在左侧菜单进入。</p>
        <div class="welcome-actions">
          <el-button :icon="Promotion" type="primary" @click="openSwagger">接口文档</el-button>
        </div>
      </div>
    </el-card>

    <!-- 待办工作台（政府 OA 式收件箱）：左侧统一待办队列（有权管理的源 UNION 按时间倒序分页，行点击
         带 status=0 深链跳对应管理页处理），右侧待办概览计数（服务端按权限逐项过滤，点击同样深链） -->
    <el-row :gutter="16" class="workbench-row">
      <el-col :xs="24" :md="17">
        <el-card class="workbench-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">待办处理</span>
              <span class="card-tip">点击行进入对应管理页处理</span>
              <el-button class="card-more" link type="primary" @click="moreOpen = true">查看更多</el-button>
            </div>
          </template>
          <WorkbenchTodoList :meta="todoMeta" :page-size="5" />
        </el-card>
      </el-col>
      <el-col :xs="24" :md="7">
        <el-card class="workbench-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">待办概览</span>
            </div>
          </template>
          <div v-loading="overviewLoading" class="overview-body">
            <div v-for="item in todoItems" :key="item.key" class="overview-item" @click="goTodo(item)">
              <el-icon :size="18" class="overview-icon">
                <component :is="todoMeta[item.key].icon" />
              </el-icon>
              <span class="overview-name">{{ todoMeta[item.key].title }}</span>
              <span class="overview-count" :class="{ 'is-zero': !item.count }">{{ item.count }}</span>
            </div>
            <el-empty v-if="!overviewLoading && !todoItems.length" description="暂无可管理的待办模块" :image-size="60" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 查看更多：同一待办列表组件的全量版（每页 10 条）；destroy-on-close 每次打开重新挂载拉新鲜数据 -->
    <el-drawer v-model="moreOpen" destroy-on-close size="70%" title="全部待办">
      <WorkbenchTodoList :meta="todoMeta" :page-size="10" />
    </el-drawer>
  </div>
</template>

<script setup name="Index">
import { ChatDotRound, Promotion, WarningFilled } from '@element-plus/icons-vue';

import { getWorkbenchSummary } from '@/api/post/workbench';

const hour = new Date().getHours();
const greeting = hour < 6 ? '凌晨好' : hour < 12 ? '上午好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';

// 接口文档走 nginx 静态托管（同源根路径，无 /api 前缀）——与「服务工具→接口文档」三入口页同款链接；
// 服务端 setupApiDocs 挂载路径因 app.prefix 无前导斜杠对请求不可达，加前缀反而 404
const swaggerUrl = '/swagger-ui/';

const openSwagger = () => {
  window.open(swaggerUrl, '_blank');
};

// ---------- 待办工作台 ----------
// 展示元数据前端维护：服务端只回 key+count / source 行（无权限源不出现），文案与跳转路由不进契约；
// 文章审核上线时服务端增量返回 key='audit'，此处补一条映射即可；未知 key 过滤掉（服务端先行/前端滞后的发布窗口兼容）
const todoMeta = {
  report: { title: '举报处理', tag: '举报', tagType: 'danger', path: '/interaction/report', icon: WarningFilled },
  feedback: { title: '反馈回复', tag: '反馈', tagType: 'primary', path: '/interaction/feedback', icon: ChatDotRound }
};

const overviewLoading = ref(true);
const todoItems = ref([]);

onMounted(async () => {
  try {
    const res = await getWorkbenchSummary();
    todoItems.value = (res.data?.items || []).filter((item) => todoMeta[item.key]);
  } catch {
    // 业务失败由请求层统一弹出，概览退化为空态，不阻塞欢迎卡与待办列表
    todoItems.value = [];
  } finally {
    overviewLoading.value = false;
  }
});

const router = useRouter();

// 深链带 status=0：管理页预置「待处理」筛选（keep-alive 缓存页重进同步由两列表页 onActivated 承接）
const goTodo = (item) => {
  router.push({ path: todoMeta[item.key].path, query: { status: '0' } });
};

// 查看更多抽屉
const moreOpen = ref(false);
</script>

<style scoped lang="scss">
.home {
  .welcome-card {
    border-radius: 8px;
  }

  .welcome-body {
    padding: 40px 20px;
    text-align: center;
  }

  .welcome-title {
    margin: 0 0 12px;
    font-size: 24px;
    font-weight: 600;
    color: #303133;
  }

  .welcome-desc {
    margin: 0 0 24px;
    font-size: 14px;
    color: #909399;
  }

  .welcome-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
  }

  .workbench-row {
    margin-top: 16px;
  }

  .workbench-card {
    border-radius: 8px;
  }

  .card-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .card-tip {
    font-size: 12px;
    color: #909399;
  }

  // 查看更多推到卡片头部最右
  .card-more {
    margin-left: auto;
  }

  // 待办概览：紧凑统计行（计数卡收窄成侧栏，待办队列是主角）
  .overview-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 88px;
  }

  .overview-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: #409eff;
      box-shadow: 0 2px 12px rgba(64, 158, 255, 0.15);
    }
  }

  .overview-icon {
    color: #409eff;
  }

  .overview-name {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    color: #303133;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  // 待处理计数：有待办高亮提示，为 0 置灰不催办
  .overview-count {
    font-size: 22px;
    font-weight: 700;
    color: #f56c6c;

    &.is-zero {
      color: #c0c4cc;
    }
  }
}
</style>

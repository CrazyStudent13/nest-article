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

    <!-- 待办工作台：各待办源一张卡片（服务端按权限逐项过滤，前端只渲染拿到的卡片），
         点击带 status=0 深链进对应管理页直接看待处理列表 -->
    <el-card class="todo-card">
      <template #header>
        <div class="todo-header">
          <span class="todo-title">待办处理</span>
          <span class="todo-tip">待处理数量实时汇总，点击卡片进入对应管理页</span>
        </div>
      </template>
      <div v-loading="todoLoading" class="todo-grid">
        <div v-for="item in todoItems" :key="item.key" class="todo-item" @click="goTodo(item)">
          <el-icon :size="26" class="todo-icon">
            <component :is="todoMeta[item.key].icon" />
          </el-icon>
          <div class="todo-info">
            <div class="todo-name">{{ todoMeta[item.key].title }}</div>
            <div class="todo-desc">{{ todoMeta[item.key].desc }}</div>
          </div>
          <div class="todo-count" :class="{ 'is-zero': !item.count }">{{ item.count }}</div>
        </div>
        <el-empty v-if="!todoLoading && !todoItems.length" description="暂无可管理的待办模块" :image-size="60" />
      </div>
    </el-card>
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
// 展示元数据前端维护：服务端只回 key+count（无权限源不出现），文案与跳转路由不进契约；
// 文章审核上线时服务端增量返回 key='audit'，此处补一条映射即可；未知 key 过滤掉（服务端先行/前端滞后的发布窗口兼容）
const todoMeta = {
  report: { title: '举报处理', desc: '待处理举报，进入举报管理复核', path: '/interaction/report', icon: WarningFilled },
  feedback: { title: '反馈回复', desc: '待处理反馈，进入反馈管理回复', path: '/interaction/feedback', icon: ChatDotRound }
};

const todoLoading = ref(true);
const todoItems = ref([]);

onMounted(async () => {
  try {
    const res = await getWorkbenchSummary();
    todoItems.value = (res.data?.items || []).filter((item) => todoMeta[item.key]);
  } catch {
    // 业务失败由请求层统一弹出，待办区退化为空态，不阻塞欢迎卡与页面其余部分
    todoItems.value = [];
  } finally {
    todoLoading.value = false;
  }
});

const router = useRouter();

// 深链带 status=0：管理页预置「待处理」筛选（keep-alive 缓存页重进同步由两列表页 onActivated 承接）
const goTodo = (item) => {
  router.push({ path: todoMeta[item.key].path, query: { status: '0' } });
};
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

  .todo-card {
    margin-top: 16px;
    border-radius: 8px;
  }

  .todo-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
  }

  .todo-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .todo-tip {
    font-size: 12px;
    color: #909399;
  }

  .todo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
    min-height: 88px;
  }

  .todo-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px 20px;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: #409eff;
      box-shadow: 0 2px 12px rgba(64, 158, 255, 0.15);
    }
  }

  .todo-icon {
    color: #409eff;
  }

  .todo-info {
    flex: 1;
    min-width: 0;
  }

  .todo-name {
    font-size: 15px;
    font-weight: 600;
    color: #303133;
  }

  .todo-desc {
    margin-top: 4px;
    font-size: 12px;
    color: #909399;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  // 待处理计数：有待办高亮提示，为 0 置灰不催办
  .todo-count {
    min-width: 36px;
    text-align: center;
    font-size: 26px;
    font-weight: 700;
    color: #f56c6c;

    &.is-zero {
      color: #c0c4cc;
    }
  }
}
</style>
